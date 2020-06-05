# unzip-iterable

Thin wrapper around [yauzl](https://github.com/thejoshwolfe/yauzl).

## openZip()

```typescript
function openZip(zipPath: string): AsyncIterable<ZipEntry>;
```

Opens a zip file as an async iterable of zip entries.

## ZipEntry

Represents an entry in a zip file.

```typescript
interface ZipEntry {
  info: yauzl.Entry;
  open(): PromiseLike<stream.Readable>;
}
```

### info

Get info about the zip entry. See the
[yazl docs](https://github.com/thejoshwolfe/yauzl#class-entry) for more info.

### open()

Get a readable stream for the contents of the entry.

## ZipEntryStream

Implements an object-mode readable stream which will read all of the entries in
a zip file.

```typescript
class ZipEntryStream extends stream.Readable
```
