# markdowndb.macro

### What it does
A babel macro for building markdown Map at compile time for static website.

### Motivation
I want a static website that holds all my markdown articles, but to do that usually I need some extra config for webpack and make my already chaotic project config even more complicated. With `babel-plugin-macros` I can have an Map-like interface to access all markdowns with one function call.

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
There are two modes to build a markdown db: `runtime mode` and `static mode`.

In `runtime mode`, all markdowns are packed into the final app and are transferred upon the first request. Runtime mode has very fast response time once all data is loaded, but it will make inital load time much longer. In addition, `runtime mode` will load all markdowns in client side even if they are not used, which can cause inefficient memory usage.

In `static mode` markdown files are host on the static server, and header of markdown will be accessable after the first load. The markdown files are lazily evaluated: requests are only sent when it is accessed via the interface.

##### Views of markdown db
There are three views of markdowns: `default`, `tag`, and `time`. In `default` view each markdown is indexed by id; in tag and time mode an array of markdowns are indexed by their corresponding tags or date.

##### AllDB interface
If you have multiple folders to host, you might want a single unified interface to access everyting. To achieve that you can use `AllDB`. The constructor takes a list of `MarkdownDB`, and provide a single `MarkdownDB` interface on top of all of them (regardless of what mode are them created with).

##### Demo
Assume you have this directory hierachy:
```
foler1/
  | markdown1.md
  | markdown2.md
foler2/
  | markdown3.md
src/
```
where `articles` is where you put all your markdowns.


```typescript
// you need to make sure constructors of MarkdownRuntimeDatabase
// and MarkdownStaticDatabase are avaibale in the scope because they will
// be used during compile time.
import {
  MarkdownRuntimeDatabase,
  MarkdownStaticDatabase,
  AllDB,
} from 'markdowndb.macro/dist/markdown-map';

import markdowndb, { Markdown, MarkdownDBConfig } from 'markdowndb.macro';

// create dbs in different modes.
// note because it is a macro, you must pass the Config type as object literal.
const mdruntime: MarkdownDB = markdowndb({
  markdownDir: 'folder1',
  mdoe: 'runtime',
  logLevel: 'silence'  // compile time log for diagnoses. Set silence to turn off.
  });

const mdstatic: MarkdownDB = markdowndb({
  markdownDir: 'foler2',
  mdoe: 'static',
  publicURL: '/home',
});

const all: MarkdownDB = new AllDB([
    mdruntime,
    mdstatic,
]);

// "default" mode, query by id
const md1: Markdown = mdruntime.get(12341);
// same interface for static mode. `mdstatic1.content` is loaded lazily,
const mdstatic1: Markdown = mdstatic.get(22332);
// get the same markdown from AllDB.
const all1: Markdown = all.get(12341);

// "tag" mode, query markdowns with the same tag.
const md2s: Array<Markdown> = mdruntime.get("tag1");

// "time" mode, query markdowns with the same date.
const md3s: Array<Markdown> = db.runtime(new Date(2020, 7, 1));

// markdown content is wrapped in dummy promise in runtime mode
md.content.then(m => {
  console.log(m);
});

// Get iterator of keys from different views.
const db_ids = db.keys("default");
const db_tags = db.keys("tag");
const db_times = Array.from(db.keys("time")).map(e => new Date(e));

export {Markdown, MarkdownDB} from 'markdowndb.macro';
```

##### Notes
- Note because the type is exposed at compile time, you need to re-export types you want to use at runtime. This is not ideal and if you have a better solution please open a RP.
- If you want to use the type without importing macro you need to import `markdowndb.macro/dist/types`;
- When you are defining your `MarkdownDB` You need to have `MarkdownRuntimeDatabase` and `MarkdownStaticDatabase` avaliable in the same module. Import from `markdowndb.macro/dist/markdown-map`.
- If you are using `static mode`, notice that the argument for `publicURL` should be a string literal started with a slash `/`;

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

// aviable log level.
// it's for compile time diagnoses only.
// if the log level is set to 'silence' no log file will be generate.
export type LogLevel =
  | 'info'
  | 'warning'
  | 'error'
  | 'silence'
  ;

export interface MarkdownDBConfig {
  // The directory where markdown stores.
  markdownDir: string,

  // The build mode.
  mode: MarkdownDBMode,

  // Where static files will be host.
  publicURL?: string,

  // Logging level
  logLevel?: LogLevel,

  // Log Dir
  logDir?: string,
};

// Both MarkdownRuntimeDatabase and MarkdownStaticDatabase implement this interface.
export interface MarkdownDB {
  // get by id
  get(key: number): Markdown | undefined,
  // get by time or tag.
  get(key: Date | string): Array<Markdown> | undefined,

  entries(view: "default"): Array<[number, Markdown]> | undefined,
  entries(view: "time" | "tag"): Array<[string, Array<Markdown>]> | undefined,

  values(view: "default"): Array<Markdown> | undefined,
  values(view: "time" | "tag"): Array<Array<Markdown>> | undefined,

  keys(view: "default"): Array<number> | undefined,
  keys(view: "time" | "tag"): Array<string> | undefined,
}
```
id is a 32 digit fnv1a hash on the title. It has very good randomness but collision is still possible. Notice because datetime is not hashable, to access markdowns via `indexTime` you need to convert the datetime into string by invoking `Date.toJSON()` method.

### What's next
* [x] Current format will be the default.
* [x] compile cached query results at compile time.
* [x] extraction source and tag at build time.
* [x] build time fast index table. make tag indexing faster.
* [x] serve static file from public
* [ ] support incremental build (without rebuild everything all together)
