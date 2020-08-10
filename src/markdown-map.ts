// Interface to access markdown files.
// this class will be used at runtime.
import {MarkdownRaw, Markdown, MarkdownHeader, MarkdownDB, ViewType, MarkdownText, MarkdownMeta} from './types';
import {htmlPath} from './preprocess/static-gen';
import {flat} from './utils/flat';
import {notUndefined} from './utils/type';

export class MarkdownDatabase implements MarkdownDB {
  // different views of Markdowns, all constructed at compile time.
  // it encloses the url it will fetch from.
  defaultMap?: Map<number, MarkdownMeta>;
  tagView?: Map<string, MarkdownMeta[]>;
  timeView?: Map<string, MarkdownMeta[]>;

  get(key: number): Markdown | undefined;
  get(key: Date | string): Markdown[] | undefined;
  get(key: Date | number | string): | (Markdown | undefined) | (Markdown[] | undefined) {
    switch (typeof key) {
      case "number":
        return resolveMeta(this.defaultMap?.get(key));
      case "string":
        return this.tagView?.get(key)?.map(resolveMeta_);
    }
    return this.timeView?.get(key.toJSON())?.map(resolveMeta_);
  }

  entries(view: "default"): [number, Markdown][] | undefined;
  entries(view: "time" | "tag"): [string, Markdown[]][] | undefined;
  entries(view: ViewType):
    | [number, Markdown][]
    | [string, Markdown[]][]
    | undefined {
    switch (view) {
      case "default":
        return forwardIter(this.defaultMap?.entries(),
          ([id, meta]) => [id, resolveMeta_(meta)]);
      case "time":
        return forwardIter(this.timeView?.entries(),
          ([id, metas]) => [id, resolveMetaArray_(metas)]);
      case "tag":
        return forwardIter(this.tagView?.entries(),
          ([id, metas]) => [id, resolveMetaArray_(metas)]);
    }
  }

  values(view: "default"): Markdown[] | undefined;
  values(view: "time" | "tag"): Markdown[][] | undefined;
  values(view: ViewType): | Markdown[] | Markdown[][] | undefined {
    switch (view) {
      case "default":
        return forwardIter(this.defaultMap?.values(), resolveMeta_);
      case "time":
        return forwardIter(this.timeView?.values(), resolveMetaArray_);
      case "tag":
        return forwardIter(this.tagView?.values(), resolveMetaArray_);
    }
  }

  keys(view: "default"): number[] | undefined;
  keys(view: "time" | "tag"): string[] | undefined;
  keys(view: ViewType): | number[] | string[] | undefined {
    switch (view) {
      case "default":
        return forwardIter(this.defaultMap?.keys());
      case "time":
        return forwardIter(this.timeView?.keys());
      case "tag":
        return forwardIter(this.tagView?.keys());
    }
  }
}

export class MarkdownRuntimeDatabase extends MarkdownDatabase {
  public constructor(
    other: Map<number, MarkdownRaw>,
    indices: Record<ViewType, Map<string, MarkdownRaw[]>>) {
    super();
    const f: ToMarkdownMeta<MarkdownRaw> = val => (
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
    this.tagView = metaview(indices.tag, f);
    this.timeView = metaview(indices.time, f);
  }
}

export class MarkdownStaticDatabase extends MarkdownDatabase {

  public constructor(
    other: {url: string, publicUrl: string, map: Map<number, MarkdownHeader>},
    indices: Record<ViewType, Map<string, MarkdownHeader[]>>) {
    super();
    const {url, publicUrl, map} = other;
    const f: ToMarkdownMeta<MarkdownHeader> = header => (
      {
        header,
        content: () => fetchStatic(publicUrl, url, header.id),
      }
    );
    this.defaultMap = new Map(
      Array.from(map)
        .map(e => {
          const [id, header] = e;
          const md: MarkdownMeta = f(header);
          return [id, md] as [number, Markdown];
        })
    );
    this.tagView = metaview(indices.tag, f);
    this.timeView = metaview(indices.time, f);
  }
}

export class AllDB implements MarkdownDB {
  list?: MarkdownDB[] = undefined;

  public constructor(list: MarkdownDB[]) {
    this.list = list;
  }
  get(key: number): Markdown | undefined;
  get(key: Date | string): Markdown[] | undefined;
  get(key: number | Date | string):
    | (Markdown | undefined)
    | (Markdown[] | undefined) {
    if (typeof key === "number") {
      const filtered = this.list?.map(m => m.get(key)).filter(notUndefined);
      if (filtered!.length > 1) {throw new Error("id not unique");}
      return filtered?.pop();
    }
    return flat(this.list?.map(db => db.get(key)).filter(notUndefined)!);
  }

  entries(view: "default"): [number, Markdown][] | undefined;
  entries(view: "time" | "tag"): [string, Markdown[]][] | undefined;
  entries(view: ViewType):
    | ([number, Markdown][] | undefined)
    | ([string, Markdown[]][] | undefined) {
    if (view === "default") return this.megaList(m => m.entries(view));
    else return this.megaList(m => m.entries(view));
  }

  values(view: "default"): Markdown[] | undefined;
  values(view: "time" | "tag"): Markdown[][] | undefined;
  values(view: ViewType):
    | Markdown[] | undefined
    | Markdown[][] | undefined {
    if (view === "default") return this.megaList(m => m.values(view));
    else return this.megaList(m => m.values(view));
  }

  keys(view: "default"): number[] | undefined;
  keys(view: "time" | "tag"): string[] | undefined;
  keys(view: ViewType):
    | number[] | undefined
    | string[] | undefined {
    if (view === "default") return this.megaList(m => m.keys(view));
    else return this.megaList(m => m.keys(view));
  }

  megaList<T>(cb: (m: MarkdownDB) => T[] | undefined) {
    const makeIteratorArray =
      <T>(cb: (m: MarkdownDB) => T[] | undefined) =>
        this.list!.map(cb)!.filter(notUndefined);
    return flat(makeIteratorArray(cb));
  }
}

type ToMarkdownMeta<T> = (val: T) => MarkdownMeta;
export function metaview<K, T>(map: Map<K, T[]>, f: ToMarkdownMeta<T>) {
  const array = Array.from(map)
    .map(e => {
      const [k, v] = e;
      const v1 = v.map(f);
      return [k, v1] as [K, Markdown[]];
    });
  return new Map(array);
}

async function fetchStatic(publicUrl: string, url: string, id: number): Promise<MarkdownText> {
  const purl = `${publicUrl}/${url}`;
  const addr = htmlPath(purl, id.toString());
  console.log(addr);
  const data = (await fetch(addr)).text();
  return data;
}

function resolveMetaArray_(metas: MarkdownMeta[]): Markdown[] {
  return metas.map(e => resolveMeta_(e));
}

function resolveMeta(meta?: MarkdownMeta): Markdown | undefined {
  return meta === undefined ? meta : resolveMeta_(meta);
}

function resolveMeta_(meta: MarkdownMeta): Markdown {
  const {header, content} = meta;
  return {
    header,
    content: (() => {
      if (typeof content === "function") {
        return content();
      } else {
        return content;
      }
    })(),
  }
}

function forwardIter<T>(iter?: IterableIterator<T>): T[] | undefined;
function forwardIter<T, U>(iter: IterableIterator<T> | undefined, cb: ((v: T) => U)): U[] | undefined;
function forwardIter<T, U>(iter?: IterableIterator<T>, cb?: ((v: T) => U)):
  | U[]
  | T[]
  | undefined {
  if (iter === undefined) return undefined;
  if (cb === undefined) {
    return Array.from(iter);
  }
  return Array.from(iter, cb);
}
