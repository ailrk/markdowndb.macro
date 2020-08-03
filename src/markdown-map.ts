import {MarkdownRaw, Markdown, MarkdownHeader, MarkdownDB, ViewType, MarkdownText} from './types';
import {pubDirURL, htmlPath} from './preprocess/static-gen';

export class MarkdownDatabase implements MarkdownDB {
  // different views of Markdowns, all constructed at compile time.
  // it encloses the url it will fetch from.
  defaultMap?: Map<number, Markdown>;
  tagView?: Map<string, Array<Markdown>>;
  timeView?: Map<string, Array<Markdown>>;

  get(key: number): Markdown | undefined;
  get(key: Date | string): Array<Markdown> | undefined;
  get(key: Date | number | string):
    | (Markdown | undefined)
    | (Array<Markdown> | undefined) {
    switch (typeof key) {
      case "number":
        return this.defaultMap?.get(key);
      case "string":
        return this.tagView?.get(key);
    }
    return this.timeView?.get(key.toJSON());
  }

  entries(view: "default"): IterableIterator<[number, Markdown]> | undefined;
  entries(view: "time" | "tag"):
    IterableIterator<[string, Array<Markdown>]> | undefined;
  entries(view: ViewType):
    | IterableIterator<[number, Markdown]>
    | IterableIterator<[string, Array<Markdown>]>
    | undefined {
    switch (view) {
      case "default":
        return this.defaultMap?.entries();
      case "time":
        return this.timeView?.entries();
      case "tag":
        return this.tagView?.entries();
    }
  }

  values(view: "default"): IterableIterator<Markdown> | undefined;
  values(view: "time" | "tag"):
    IterableIterator<Array<Markdown>> | undefined;
  values(view: ViewType):
    | IterableIterator<Markdown>
    | IterableIterator<Array<Markdown>>
    | undefined {
    switch (view) {
      case "default":
        return this.defaultMap?.values();
      case "time":
        return this.timeView?.values();
      case "tag":
        return this.tagView?.values();
    }
  }

  keys(view: "default"): IterableIterator<number> | undefined;
  keys(view: "time" | "tag"):
    IterableIterator<string> | undefined;
  keys(view: ViewType):
    | IterableIterator<number>
    | IterableIterator<string>
    | undefined {
    if (view === "default") {
      return this.defaultMap?.keys();
    }
    if (view === "time") {
      return this.timeView?.keys();
    }
    if (view === "tag") {
      return this.tagView?.keys();
    }
  }
}

export class MarkdownRuntimeDatabase extends MarkdownDatabase {
  public constructor(
    other: Map<number, MarkdownRaw>,
    indices: Record<ViewType, Map<string, Array<MarkdownRaw>>>) {
    super();
    const f: ToMarkdown<MarkdownRaw> = val => (
      {
        header: val.header,
        content: Promise.resolve(val.content),
      }
    );
    this.defaultMap = new Map(
      Array.from(other)
        .map(e => {
          const [id, raw] = e;
          return [id, f(raw)] as [number, Markdown];
        })
    );
    this.tagView = promisify(indices.tag, f);
    this.timeView = promisify(indices.time, f);
  }
}

export class MarkdownStaticDatabase extends MarkdownDatabase {
  fetchStatic: ((id: number) => Promise<Markdown>) | undefined;

  public constructor(
    other: {url: string, map: Map<number, MarkdownHeader>},
    indices: Record<ViewType, Map<string, Array<MarkdownHeader>>>) {
    super();
    const {url, map} = other;
    const f: ToMarkdown<MarkdownHeader> = val => (
      {
        header: val,
        content: fetchStatic(url)(val.id),
      }
    );
    this.defaultMap = new Map(
      Array.from(map)
        .map(e => {
          const [id, header] = e;
          const md: Markdown = f(header);
          return [id, md] as [number, Markdown];
        })
    );
    this.tagView = promisify(indices.tag, f);
    this.timeView = promisify(indices.time, f);
  }
}

type ToMarkdown<T> = (val: T) => Markdown;
export function promisify<K, T>(map: Map<K, Array<T>>, f: ToMarkdown<T>) {
  const array = Array.from(map)
    .map(e => {
      const [k, v] = e;
      const v1 = v.map(f);
      return [k, v1] as [K, Array<Markdown>];
    });
  return new Map(array);
}

const fetchStatic = (url: string) => async (id: number): Promise<MarkdownText> => {
  // TODO can be mor generic
  const purl = pubDirURL("home", url);
  const addr = htmlPath(purl, id.toString());
  console.log(addr);
  const data = await fetch(addr);
  return await data.text();
}
