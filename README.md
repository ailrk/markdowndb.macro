# markdowndb.macro

### What it does
A babel macro for building markdown Map at compile time for static website.

### Motivation
I want a static website that holds all my markdown articles, but to do that usually I need some extra config for webpack and make my alreay chaotic project config even more complicated. With `babel-plugin-macros` I can just load all markdowns into a database like object with one function call.

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
where `articles` is where you put all your markdowns. To make a database, do:

```typescript
import markdowndb from 'markdowndb.macro';

const markdowns: Map<number, Markdown> = markdowndb('articles');
```

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
```
id is a 32 digit fnv1a hash on the title. It has very good randomness but collision is still possible.

### What's next
* Support user defined header format.
* Current format will be the default.
* compile cached query results at compile time.
* build time fast index table. make tag indexing faster.
* build time tag type generator.
