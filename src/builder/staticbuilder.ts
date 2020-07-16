// module for generating static articles.

import {CallExpression, NewExpression, ArrowFunctionExpression} from '@babel/types';
import {scopedAST, varAST, setMapAST, mdAST, getTagIdMap, getTimeIdMap} from './astbuilder';
import * as babelcore from '@babel/core';
import path from 'path';
import fs from 'fs';
import axios, {AxiosResponse} from 'axios';
import {Markdown} from 'src';

// top level AST Builder from static mode.
// It return a CallExpression, which is a call of an
// anonymous function. This allows us to have local binding and
// reference once AST from another.
// static mode will generate a Map with an http request lambda function
// as value.
export function buildMarkdownDBAST(markdowns: Array<Markdown>): CallExpression {
  const t = babelcore.types;
  const tagIndex = getTagIdMap(markdowns);
  const timeIndex = getTimeIdMap(markdowns);

}

//
function buildMarkdownMapAST(markdowns: Array<Markdown>): NewExpression {

}

// build request arrow function
// it's evaluated lazily.
function buildRequestAst(url: string, id: number): ArrowFunctionExpression {
  const t = babelcore.types;
  const importAxios = t.callExpression();

  return t.arrowFunctionExpression([],
    t.callExpression(
      t.memberExpression(
        t.identifier('axios'),
        t.identifier('get')
      ),
      [t.stringLiteral(`${url}/${id}`)]
    ));
}


// load from public folder.
namespace Request {
  export type MakeRequest = (id: number) => Promise<AxiosResponse<string>>;

  export const publicUrlReader = (url: string): MakeRequest =>
    (id: number) => axios.get<string>(`${url}/${id}`);
}

namespace Files {
  // parse markdowns into html to pubDir
  export function toPublic(markdowns: Array<Markdown>, pubDir: string) {
    const makeFile = publicDirReader(pubDir);
    markdowns.forEach(m => {makeFile(m);});
  }

  type MakeFile = (markdown: Markdown) => void;

  const publicDirReader = (pubdir: string): MakeFile =>
    (markdown: Markdown) => {
      const p = path.join(path.resolve(pubdir), idToFileName(markdown.header.id));
      fs.writeFileSync(p, markdown.content);
    }

  function idToFileName(id: number): string {
    return id.toString() + '.html';
  }
}
