import path from 'path';
import * as RuntimeBuilder from './runtime-builder';
import * as StaticBuilder from './static-builder';
import {MarkdownDBMode} from '../types';
import * as Parse from '../preprocess/parse';
import * as StaticGen from '../preprocess/static-gen';

// dispatch markdown build mode.
export function build(mdpath: string, mode: MarkdownDBMode, publicUrl?: string) {
  switch (mode) {
    case "runtime": {
      const markdownarray = Parse.makeMarkdownArray(path.resolve(mdpath));
      return RuntimeBuilder.buildMarkdownDBAST(markdownarray);
    }
    case "static": {
      const markdownarray = StaticGen.toPublic({
        pubDir: "public", url: mdpath
      });
      return StaticBuilder.buildMarkdownDBAST(mdpath, markdownarray, publicUrl ?? "/");
    }
    default:
      throw new Error("unknown build mode. Either static or runtime");
  }
}
