// module for generating static articles.

import {Markdown, MarkdownHeader} from '../types';
import {ObjectExpression, NewExpression, callExpression, ArrayExpression, BlockStatement} from '@babel/types';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// top level AST Builder from static mode.
// It return a CallExpression, which is a call of an
// anonymous function. This allows us to have local binding and
// reference once AST from another.
// static mode will generate a Map with an http request lambda function
// as value.
export function buildMarkdownDBAST(markdowns: Array<Markdown>): CallExpression {

}

// load.
namespace Request {
  export function getMarkdown(id: number) {
    return axios.get<string>();
  }
}

namespace FIles {
  export type MakeFile = (markdown: Markdown) => void;
  export const createMAkeFile = (pubdir: string): MakeFile => {
    const dir = path.resolve(pubdir);
    return (markdown: Markdown) => {
      const p = path.join(dir, markdown.header.id.toString());
      fs.writeFileSync(p, markdown.content);
    }
  }
}

