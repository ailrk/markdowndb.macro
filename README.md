# markdowndb.macro

### What it does
A babel macro for building markdown Map at compile time for static website.

### Motivation
I want a static website that holds all my markdown articles, but to do that usually I need some extra config for webpack and make my already chaotic project config even more complicated. With `babel-plugin-macros` I can just load all markdowns into a database like object with one function call.

### Install
`npm install markdowndb.macro`

### Note
All articles will be packed into the final app, so it's only suitable for small personal blog. If you have thounsands of articles a legit backend is a better choice.

### Markdown format
Each markdown has its own metadata upfront. Write your article in this format:
```markdown
-- time 2020-01-01
-- tag tag1 tag2 ...
-- source github.com/some/repo a-book-I-read
-- title A very long title
;;
<... your normal markdown>
```
 `;;` is the separator between header and markdown content. `tag`, `source`, and `title` are optional. `tag` is for classifying the article, and `source` is for citation.

### How to use
##### runtime mode and static mode
There are two modes to build markdown db -- `runtime mode` and `static mode`.
In `runtime mode` all markdowns are sent to the client in the first connection; But `static mode` only header information is sent, markdown content will be wrapped in a promise and resolve when needed.

Assume you have this directory hierachy:
```
articles/
  | markdown1.md
  | markdown2.md
src/

```
where `articles` is where you put all your markdowns.

##### views of markdown db
There are three views of markdowns: `default`, `tag`, and `time`. In `default` view each markdown is indexed by id; in tag and time mode an array of markdowns are indexed by their corresponding tags or date.

##### runtime mode
In `runtime mode`, use it like this:
```typescript
import markdowndb, {
  MarkdownRuntimeDatabase,
  Markdown
} from 'markdowndb.macro';

// runtime mode will be used by default.
const md: MarkdownRuntimeDatabase = markdowndb('articles');

// "default" mode, query by id
const md1: Markdown = db.get(12341);

// "tag" mode, query markdowns with the same tag.
const md2s: Array<Markdown> db .get("tag1");

// "time" mode, query markdowns with the same date.
const md3s: Array<Markdown> db .get(new Date("2020, 7, 1"));

// markdown content is wrapped in dummy promise in runtime mode
md.content.then(m => {
  console.log(m);
});

// Get iterator of keys from different views.
const db_ids: Array<number> = Array.from(db.keys("default"));
const db_tags: Array<string> = Array.from(db.keys("tag"));
const db_times: Array<Date> = Array.from(db.keys("time")).map(e => new Date(e));

export {Markdown, MarkdownDB} from 'markdowndb.macro';
```
Note because the type is exposed at compile time, you need to re-export types you want to use at runtime. This is not ideal and if you have a better solution please open a RP.

##### static mode
When compiling, a folder with all static files generated from markdowns will be created in `public` folder in your project directory. You need to make sure the `public`folder can be accessed from url (e.g in `create-react-app` application `public` is default for hosting static files).`static mode` has exactly the same interface as `runtime mode`, the only difference is when the promise is resolved, it will sent a request to the server and query the given markdown content.

##### interfaces
You can query `markdowns` based on following type:
```typescript
export interface MarkdownHeader {
  readonly title: string,
  readonly time: Date,
  readonly tag?: Array<string>,
  readonly source?: Array<string>,
  readonly id: number,
};

export type MarkdownText = string;

export interface Markdown {
  readonly header: MarkdownHeader,
  readonly content: Promise<MarkdownText>,
}

// Both MarkdownRuntimeDatabase and MarkdownStaticDatabase implement this interface.
export interface MarkdownDB {
  get(key: number): Markdown | undefined,
  get(key: Date | string): Array<Markdown> | undefined,

  entries(indexType: "default"): IterableIterator<[number, Markdown]> | undefined,
  entries(indexType: "time" | "tag"):
    IterableIterator<[string, Array<Markdown>]> | undefined,

  values(indexType: "default"): IterableIterator<Markdown> | undefined,
  values(indexType: "time" | "tag"):
    IterableIterator<Array<Markdown>> | undefined,

  keys(indexType: "default"): IterableIterator<number> | undefined,
  keys(indexType: "time" | "tag"):
    IterableIterator<string> | undefined,
}
```
id is a 32 digit fnv1a hash on the title. It has very good randomness but collision is still possible. Notice because datetime is not hashable, to access markdowns via `indexTime` you need to convert the datetime into string by invoking `Date.toJSON()` method.

### What's next
* [ ] Support user defined header format.
* [x] Current format will be the default.
* [x] compile cached query results at compile time.
* [x] extraction source and tag at build time.
* [x] build time fast index table. make tag indexing faster.
* [ ] build tag type generator.
* [x] serve static file from public
