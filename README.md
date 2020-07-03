# markdowndb.macro

### What it does
A babel macro for building markdown Map at compile time for static website.

### Motivation
I want a static website that holds all my markdown articles, but to do that usually I need some extra config for webpack and make my already chaotic project config even more complicated. With `babel-plugin-macros` I can just load all markdowns into a database like object with one function call.

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
Assume you have this directory hierachy:
```
articles/
  | markdown1.md
  | markdown2.md
src/

```
where `articles` is where you put all your markdowns. To use the database, do:

```typescript
import markdowndb from 'markdowndb.macro';

// indexTag and indexTime holds list of references of markdowns corresponds to
// a specific tag or time. This two maps are constructed at compile time and
// will not add extra overhead at runtime.
const {db, indexTag, indexTime} = markdowndb('articles');
const db_ids: Array<number> = db.keys();

// query with tags.
const tag1Markdowns: Array<Markdown> | undefined = indexTag.get('tag1');

// query with datetime
const date1Markdowns: Array<Markdown> | undefined = indexTime.get((new Date(2020, 1, 1)).toJSON());
export {Markdown, MarkdownDB} from 'markdowndb.macro';

```
Note because the type is exposed at compile time, you need to re-export types you want to use at runtime. This is not ideal and if you have a better solution please open a RP.

You can query `markdowns` based on following type:
```typescript
interface MarkdownHeader {
  title: string,
  time: Date,
  tag?: Array<string>,
  source?: Array<string>,
  id: number,
};

type MarkdownText = string;

type Markdown = {
  header: MarkdownHeader,
  content: MarkdownText,
};

export interface MarkdownDB {
  db: Map<number, Markdown>,
  indexTag: Map<string, Array<Markdown>>,  // hold  references of db values
  indexTime: Map<string, Array<Markdown>>,  // hold  references of db values
};
```
id is a 32 digit fnv1a hash on the title. It has very good randomness but collision is still possible. Notice because datetime is not hashable, to access markdowns via `indexTime` you need to convert the datetime into string by invoking `Date.toJSON()` method.

### What's next
* [ ] Support user defined header format.
* [x] Current format will be the default.
* [x] compile cached query results at compile time.
* [x] extraction source and tag at build time.
* [x] build time fast index table. make tag indexing faster.
* [ ] build tag type generator.
