import {Markdown, MarkdownDBMode, MarkdownHeader} from './types';

type StaticObject = {url: string, headers: Array<MarkdownHeader>};

type Other =
  | {kind: "runtime", val: Map<number, Markdown>}
  | {kind: "static", val: StaticObject}
  ;

// Collection type holding markdowns
export class MarkdownDataBase extends Map<number, Promise<Markdown>> {
  mode: MarkdownDBMode | undefined;
  indexTagMap: Map<string, Array<Promise<Markdown>>> = new Map();
  indexTimeMap: Map<string, Array<Promise<Markdown>>> = new Map();
  fetchStatic: ((id: number) => Promise<Markdown>) | undefined;

  public constructor(other: Other) {
    super((() => {
      switch (other.kind) {
        case "runtime":
          this.mode = "runtime";
          return Array.from(other.val)
            .map(e => {
              const [id, markdown] = e;
              return [id, Promise.resolve(markdown)] as [number, Promise<Markdown>];
            });
        case "static":
          this.mode = "static";
          const {url, headers} = other.val;
          this.fetchStatic = fetchStatic(url);
          return headers.map(header => {
            const id = header.id;
            return [id, fetchStatic(url)(id)] as [number, Promise<Markdown>];
          });
        default:
          throw new Error("Unreachable");
      }
    })());
  }

  public initIndexTagMap
    (prop:
      | {kind: "runtime", map: Map<string, Array<Markdown>>}
      | {kind: "static", map: Map<string, Array<MarkdownHeader>>},
      type: "tag" | "time") {
    let m: Map<string, Array<Promise<Markdown>>>;
    const mkarray =
      (map: Map<string, Array<any>>,
        f: (v: any[]) => Array<Promise<Markdown>>) =>
        Array.from(map).map(e => {
          const [k, v] = e;
          return [k, f(v)] as [string, Array<Promise<Markdown>>];
        });
    switch (prop.kind) {
      case "runtime":
        m = new Map(mkarray(prop.map,
          (xs: Array<Markdown>) => xs.map(m => Promise.resolve(m))));
        break;
      case "static":
        m = new Map(mkarray(prop.map,
          (xs: Array<MarkdownHeader>) =>
            xs.map(m => this.fetchStatic!(m.id))));
        break;
      default:
        throw new Error("Unreachable");
    }

    switch (type) {
      case "tag":
        this.indexTagMap = m;
      case "time":
        this.indexTimeMap = m;
    }
  }

  public get(key: number) {
    return super.get(key) as Promise<Markdown>;
  }

  public getByTime(key: Date) {
    return this.indexTimeMap.get(key.toJSON());
  }

  public getByTag(tag: string) {
    return this.indexTagMap.get(tag);
  }

  public isStatic = (): boolean => this.mode === "static";
  public isRuntime = (): boolean => this.mode === "runtime";
}

const fetchStatic = (url: string) => (id: number): Promise<Markdown> =>
  fetch(`${url}/${id}`)
    .then(data => data.json());

function isRuntimeMap(
  other:
    | Map<number, Markdown>
    | StaticObject): other is Map<number, Markdown> {
  return (other as Map<number, Markdown>).entries !== undefined;
}
