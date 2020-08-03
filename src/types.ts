// Structure of the markdown header.
export interface MarkdownHeader {
  // title of the markdown
  readonly title: string,

  // date of the markdown.
  readonly time: Date,

  // list of tags applies to the markdown.
  readonly tag?: Array<string>,

  // list of citation of the markdown.
  readonly source?: Array<string>,

  // uniquely identify the markdown based on the title and the date.
  readonly id: number,
};

export type MarkdownText = string;

// primitive Markdown type, only exist at compile time.
export interface MarkdownRaw {
  // mark down header
  readonly header: MarkdownHeader,

  // rendered markdown html.
  readonly content: MarkdownText,
}

// Markdown is the what exposed to the user.
// Different from `MarkdownRaw`, it holds a promise of MarkdownText.
export type Markdown = {
  readonly [P in keyof MarkdownRaw]: MarkdownRaw[P] extends MarkdownText ? Promise<MarkdownText> : MarkdownRaw[P]
}

// Indicate different view of markdown. When using MarkdownDB, pass this token
// to select overloaded method.
export type ViewType =
  | "tag"
  | "time"
  | "default"
  ;

export interface MarkdownDB {
  // get by id
  get(key: number): Markdown | undefined,

  // get by time or tag.
  get(key: Date | string): Array<Markdown> | undefined,

  entries(view: "default"): IterableIterator<[number, Markdown]> | undefined,
  entries(view: "time" | "tag"):
    IterableIterator<[string, Array<Markdown>]> | undefined,

  values(view: "default"): IterableIterator<Markdown> | undefined,
  values(view: "time" | "tag"):
    IterableIterator<Array<Markdown>> | undefined,

  keys(view: "default"): IterableIterator<number> | undefined,
  keys(view: "time" | "tag"):
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
