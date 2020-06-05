import 'jest';
import path from 'path';
import { openZip } from '../';

describe('ZipFile', () => {
  it('reads a zip file correctly', async () => {
    const zip = openZip(path.join(__dirname, 'assets/archive.zip'));

    const entries: ZipArchive = {};

    for await (const e of zip) {
      if (e.info.fileName.endsWith('/')) {
        continue;
      }

      const reader = await e.open();
      const contents = await readAll(reader);
      entries[e.info.fileName] = contents;
    }

    const expected = {
      'one.txt': 'This is file one.',
      'two.txt': 'This is file two.',
      'folder/three.txt': 'This is file three.',
    };

    expect(entries).toEqual(expected);
  });

  it('iterates properly', async () => {
    const zip = openZip(path.join(__dirname, 'assets/archive.zip'));

    for await (const e of zip) {
      if (e.info.fileName.endsWith('/')) {
        continue;
      }

      await expect(
        (async (): Promise<void> => {
          for await (const chunk of await e.open()) {
            void chunk;
            throw new Error('BANG');
          }
        })(),
      ).rejects.toBeTruthy();
      break;
    }
  });
});

interface ZipArchive {
  [path: string]: string;
}

async function readAll(stream: AsyncIterable<Buffer>): Promise<string> {
  let value = '';
  for await (const chunk of stream) {
    value += chunk;
  }
  return value;
}
