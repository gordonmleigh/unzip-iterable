import stream from 'stream';
import * as yauzl from 'yauzl';

export interface ZipEntry {
  info: yauzl.Entry;
  open(): PromiseLike<stream.Readable>;
}

export class ZipEntryStream extends stream.Readable {
  private zipFile: yauzl.ZipFile | undefined;
  private openCount = 0;
  private closing: ((error?: Error | null) => void) | undefined;
  private running = false;
  private started = false;

  constructor(zipPath: string, opts?: stream.ReadableOptions) {
    super({ autoDestroy: false, ...opts, objectMode: true });

    yauzl.open(
      zipPath,
      {
        autoClose: false,
        lazyEntries: true,
      },
      (err, zip) => {
        if (err) {
          this.destroy(err);
        } else if (zip) {
          zip.once('error', (e) => {
            this.destroy(e);
          });

          zip.on('entry', (entry: yauzl.Entry) => {
            this.running = this.push({
              info: entry,
              open: this.makeOpenEntry(entry),
            });
            if (this.running) {
              zip.readEntry();
            }
          });

          zip.once('end', () => {
            this.push(null);
          });

          this.zipFile = zip;

          if (this.started) {
            this.running = true;
            zip.readEntry();
          }
        }
      },
    );
  }

  _read(): void {
    this.started = true;
    if (!this.running && this.zipFile) {
      this.running = true;
      this.zipFile.readEntry();
    }
  }

  _destroy(
    error: Error | null,
    callback: (error?: Error | null) => void,
  ): void {
    if (!this.openCount) {
      this.zipFile?.close();
      this.zipFile = undefined;
      callback();
      return;
    }
    if (this.closing) {
      throw new Error(`_destroy already called`);
    }
    this.closing = callback;
  }

  onEntryClose(): void {
    if (--this.openCount === 0 && this.closing && this.zipFile) {
      this.zipFile.close();
      this.zipFile = undefined;
      this.closing();
    }
  }

  makeOpenEntry(entry: yauzl.Entry) {
    return async (): Promise<stream.Readable> => {
      const entryStream = await new Promise<stream.Readable>(
        (resolve, reject) => {
          this.zipFile?.openReadStream(entry, (err, stream) => {
            if (err) {
              return reject(err);
            }
            if (!stream) {
              return reject(new Error('unexpected null stream in callback'));
            }
            ++this.openCount;
            stream.once('end', () => this.onEntryClose());
            stream.once('error', (err) => this.destroy(err));
            resolve(stream);
          });
        },
      );

      // pipe it through another steam due to yauzl's non-compliant stream impl
      const echo = new stream.Transform({
        transform(data, encoding, callback) {
          callback(null, data);
        },
      });
      entryStream.pipe(echo);
      return echo;
    };
  }
}

export function openZip(zipPath: string): AsyncIterable<ZipEntry> {
  return new ZipEntryStream(zipPath);
}
