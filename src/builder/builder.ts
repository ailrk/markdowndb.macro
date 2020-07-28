import path from 'path';
import * as RuntimeBuilder from './runtimebuilder';
import * as StaticBuilder from './staticbuilder';
import {MarkdownDBMode} from '../types';
import * as Parse from './parse';
import {Expression} from '@babel/types';

// dispatch markdown build mode.
export function build(mdpath: string, mode: MarkdownDBMode): Expression {
  const markdownarray = Parse.makeMarkdownDB(path.resolve(mdpath));
  switch (mode) {
    case "runtime":
      return RuntimeBuilder.buildMarkdownDBAST(markdownarray);
    case "static":
      return StaticBuilder.buildMarkdownDBAST(mdpath, markdownarray);
    default:
      throw new Error("unknown build mode. Either static or runtime");
  }
}
