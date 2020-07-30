import {MarkdownRaw, Markdown, MarkdownHeader, MarkdownDB, IndexType, MarkdownText} from './types';

export class MarkdownDatabase implements MarkdownDB {
  // different views of Markdowns, all constructed at compile time.
  // it encloses the url it will fetch from.
  defaultMap?: Map<number, Markdown>;
  indexTagMap?: Map<string, Array<Markdown>>;
  indexTimeMap?: Map<string, Array<Markdown>>;

  get(key: number): Markdown | undefined;
  get(key: Date | string): Array<Markdown> | undefined;
  get(key: Date | number | string):
    | (Markdown | undefined)
    | (Array<Markdown> | undefined) {
    if (typeof key === "number") {
      return this.defaultMap?.get(key);
    }
    if (typeof key === "string") {
      return this.indexTagMap?.get(key);
    }
    return this.indexTimeMap?.get(key.toJSON());
  }

  entries(indexType: "default"): IterableIterator<[number, Markdown]> | undefined;
  entries(indexType: "time" | "tag"):
    IterableIterator<[string, Array<Markdown>]> | undefined;
  entries(indexType: IndexType):
    | IterableIterator<[number, Markdown]>
    | IterableIterator<[string, Array<Markdown>]>
    | undefined {
    if (indexType === "default") {
      return this.defaultMap?.entries();
    }
    if (indexType === "time") {
      return this.indexTimeMap?.entries();
    }
    if (indexType === "tag") {
      return this.indexTagMap?.entries();
    }
  }

  values(indexType: "default"): IterableIterator<Markdown> | undefined;
  values(indexType: "time" | "tag"):
    IterableIterator<Array<Markdown>> | undefined;
  values(indexType: IndexType):
    | IterableIterator<Markdown>
    | IterableIterator<Array<Markdown>>
    | undefined {
    if (indexType === "default") {
      return this.defaultMap?.values();
    }
    if (indexType === "time") {
      return this.indexTimeMap?.values();
    }
    if (indexType === "tag") {
      return this.indexTagMap?.values();
    }
  }

  keys(indexType: "default"): IterableIterator<number> | undefined;
  keys(indexType: "time" | "tag"):
    IterableIterator<string> | undefined;
  keys(indexType: IndexType):
    | IterableIterator<number>
    | IterableIterator<string>
    | undefined {
    if (indexType === "default") {
      return this.defaultMap?.keys();
    }
    if (indexType === "time") {
      return this.indexTimeMap?.keys();
    }
    if (indexType === "tag") {
      return this.indexTagMap?.keys();
    }
  }
}

export class MarkdownRuntimeDatabase extends MarkdownDatabase {
  public constructor(
    other: Map<number, MarkdownRaw>,
    indices: Record<IndexType, Map<string, Array<MarkdownRaw>>>) {
    super();
    const f: ToMarkdown<MarkdownRaw> = val => {
      return {
        header: val.header,
        content: Promise.resolve(val.content),
      };
    };
    this.defaultMap = new Map(
      Array.from(other)
        .map(e => {
          const [id, raw] = e;
          return [id, f(raw)] as [number, Markdown];
        })
    );
    this.indexTagMap = promisify(indices.tag, f);
    this.indexTimeMap = promisify(indices.time, f);
  }
}

export class MarkdownStaticDatabase extends MarkdownDatabase {
  fetchStatic: ((id: number) => Promise<Markdown>) | undefined;

  public constructor(
    other: {url: string, headers: Map<number, MarkdownHeader>},
    indices: Record<IndexType, Map<string, Array<MarkdownHeader>>>) {
    super();
    const {url, headers} = other;
    const f: ToMarkdown<MarkdownHeader> = val => {
      return {
        header: val,
        content: fetchStatic(url)(val.id),
      };
    };
    this.defaultMap = new Map(
      Array.from(headers)
        .map(e => {
          const [id, header] = e;
          const md: Markdown = f(header);
          return [id, md] as [number, Markdown];
        })
    );
    this.indexTagMap = promisify(indices.tag, f);
    this.indexTimeMap = promisify(indices.time, f);
  }
}

type ToMarkdown<T> = (val: T) => Markdown;
export function promisify<K, T>(map: Map<K, Array<T>>, f: ToMarkdown<T>) {
  const array =
    Array.from(map)
      .map(e => {
        const [k, v] = e;
        const v1 = v.map(f);
        return [k, v1] as [K, Array<Markdown>];
      });
  return new Map(array);
}

const fetchStatic = (url: string) => (id: number): Promise<MarkdownText> =>
  fetch(`${url}/${id}`)
    .then(data => data.text());
