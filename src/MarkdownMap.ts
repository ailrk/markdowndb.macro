import {MarkdownRaw, Markdown, MarkdownHeader, MarkdownDB, MarkdownText} from './types';

type IndexType =
  | "tag"
  | "time"
  ;

class MarkdownDatabase implements MarkdownDB {
  // different views of Markdowns, all constructed at compile time.
  // it encloses the url it will fetch from.
  defaultMap?: Map<number, Markdown>;
  indexTagMap?: Map<string, Array<Markdown>>;
  indexTimeMap?: Map<string, Array<Markdown>>;

  public get(key: number) {
    return this.defaultMap?.get(key);
  }

  public getByTime(key: Date) {
    return this.indexTimeMap?.get(key.toJSON());
  }

  public getByTag(tag: string) {
    return this.indexTagMap?.get(tag);
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
