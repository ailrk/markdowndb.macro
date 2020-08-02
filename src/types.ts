export {MarkdownDatabase, MarkdownStaticDatabase, MarkdownRuntimeDatabase} from './markdown-map';
// Structure of the markdown header.
export interface MarkdownHeader {
  readonly title: string,
  readonly time: Date,
  readonly tag?: Array<string>,
  readonly source?: Array<string>,
  readonly id: number,
};

export type MarkdownText = string;

// primitive Markdown type, only exist at compile time.
export interface MarkdownRaw {
  readonly header: MarkdownHeader,
  readonly content: MarkdownText,
}

export type Markdown = {
  readonly [P in keyof MarkdownRaw]: MarkdownRaw[P] extends MarkdownText ? Promise<MarkdownText> : MarkdownRaw[P]
}

export type IndexType =
  | "tag"
  | "time"
  | "default"
  ;

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
