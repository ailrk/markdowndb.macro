import path from 'path';
import * as RuntimeBuilder from './runtime-builder';
import * as StaticBuilder from './static-builder';
import {MarkdownDBMode} from '../types';
import * as Parse from '../preprocess/parse';
import * as StaticGen from '../preprocess/static-gen';
import {Expression} from '@babel/types';

// dispatch markdown build mode.
export function build(mdpath: string, mode: MarkdownDBMode, publicUrl?: string): Expression {
  const markdownarray = Parse.makeMarkdownDB(path.resolve(mdpath));
  switch (mode) {
    case "runtime":
      return RuntimeBuilder.buildMarkdownDBAST(markdownarray);
    case "static":
      StaticGen.toPublic(markdownarray, "public", mdpath);
      return StaticBuilder.buildMarkdownDBAST(mdpath, markdownarray, publicUrl ?? "/");
    default:
      throw new Error("unknown build mode. Either static or runtime");
  }
}
