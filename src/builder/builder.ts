import path from 'path';
import * as RuntimeBuilder from './runtime-builder';
import * as StaticBuilder from './static-builder';
import {MarkdownDBMode} from '../types';
import * as Parse from '../preprocess/parse';
import * as StaticGen from '../preprocess/static-gen';
import {logThrow, log} from '../log/logger';

// dispatch markdown build mode.
export function build(mdpath: string, mode: MarkdownDBMode, publicUrl?: string) {
  switch (mode) {
    case "runtime": {
      log(`Build runtime mode from directory: ${mdpath}`);
      const markdownarray = Parse.makeMarkdownArray(path.resolve(mdpath));
      return RuntimeBuilder.buildMarkdownDBAST(markdownarray);
    }
    case "static": {
      log(`Build static mode from directory: ${mdpath}, public url is ${publicUrl}`);
      const markdownarray = StaticGen.toPublic({
        pubDir: "public", url: mdpath
      });
      return StaticBuilder.buildMarkdownDBAST(mdpath, markdownarray, publicUrl ?? "/");
    }
    default: {
      const message = "Unknown build mode. Either static or runtime";
      log(message, 'error');
      throw new Error(message);
    }
  }
}
