import {MarkdownMap} from './MarkdownMap';
// Structure of the markdown header.
export interface MarkdownHeader {
  title: string,
  time: Date,
  tag?: Array<string>,
  source?: Array<string>,
  id: number,
};

export type MarkdownText = string;

export interface Markdown {
  header: MarkdownHeader,
  content: MarkdownText,
};

// life type of MarkdownDB is the entire program.
// this won't bloat your website :)
export interface MarkdownDB {
  db: MarkdownMap,
  indexTag: Map<string, Array<Promise<Markdown>>>,  // hold  references of db values
  indexTime: Map<string, Array<Promise<Markdown>>>,  // hold  references of db values
};

// specific how to build markdowns
// By default it uses "static method"
// You can totally use both mode in the same project.
// just do like:
//  const markdownDBRuntime = markdowndb("runtime_article", "runtime");
//  const markdownDBStatic = markdowndb("static_article", "static");
export type MarkdownDBMode =
  // "static" mode means markdown will be parsed into html and be served
  // as public files.
  // MarkdownDB will provide a Map which use the markdown id as a key, and the
  // request to static file as the value.
  | "static"

  // "runtime" mode means markdown will be parsed, and the html will be used to
  // generate a Map with each markdown's id as the key and markdown content as the
  // value.
  // The Map will literately be inserted into the AST.
  // Note: This method can potentially bloat the source code.
  // Don.'t use this mode if you have a lot of files to serve.
  | "runtime"
  ;


