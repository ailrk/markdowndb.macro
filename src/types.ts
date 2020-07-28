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

export interface MarkdownDB {
  db: MarkdownMap,
  indexTag: Map<string, Array<Promise<Markdown>>>,
  indexTime: Map<string, Array<Promise<Markdown>>>,
};

// specific how to build markdowns
// By default it uses "static method"
// You can totally use both mode in the same project.
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
