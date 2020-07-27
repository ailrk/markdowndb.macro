import {Markdown, MarkdownDBMode} from './types';

// Map from article id to a Promise of Markdown
//
// There are two modes -- "static" and "runtime".
// "static" means your articles are on the server, and when you're
// tyring to access by calling `get` method, the map will send a request to
// the server and return a Promise.
//
// "runtime" mode means all Markdowns are send upon the first request. Markdowns
//  are stored directly in the Map and no requests needed.
//
// both modes will return a promise to make the interface uniform.
export class MarkdownMap extends Map<number, Markdown | Promise<Markdown>> {
  mode: MarkdownDBMode = "static";

  constructor(other:
    | Map<number, Markdown>
    | {url: string, ids: Array<number>}) {
    super((() => {
      if (isRuntimeMap(other)) {
        this.mode = "runtime";
        return Array.from(other.entries());
      } else if (isStaticMap(other)) {
        this.mode = "static";
        const {url, ids} = other;
        return ids.map(id =>
          [id, fetchStatic(url, id)] as [number, Promise<Markdown>]);
      } else {
        console.error("unknown parameter for MarkdownMap constructor");
        return [];
      }
    })());
  }

  public get(key: number): Promise<Markdown> | undefined {
    if (this.mode === "static") {
      return super.get(key) as Promise<Markdown> | undefined;
    } else if (this.mode === "runtime") {
      const executor = (resolve: any, reject: any) => {
        const markdown = super.get(key) as Markdown | undefined;
        if (markdown === undefined) reject();
        else resolve(markdown);
      };
      return new Promise(executor);
    }
    return undefined;
  }

  public isStatic = (): boolean => this.mode === "static";
  public isRuntime = (): boolean => this.mode === "runtime";
}

const fetchStatic = (url: string, id: number): Promise<Markdown> =>
  fetch(`${url}/${id}`)
    .then(data => data.json());

function isRuntimeMap(
  other:
    | Map<number, Markdown>
    | {url: string, ids: Array<number>}): other is Map<number, Markdown> {
  return (other as Map<number, Markdown>).entries !== undefined;
}

function isStaticMap(
  other:
    | Map<number, Markdown>
    | {url: string, ids: Array<number>}): other is {url: string, ids: Array<number>} {
  return (other as {url: string, ids: Array<number>}).url !== undefined;
}
