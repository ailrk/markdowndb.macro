// module for generating static articles.

import {CallExpression, ObjectExpression, MemberExpression, ArrowFunctionExpression} from '@babel/types';
import {scopedAST, varAST, setMapAST, mdAST, getTagIdMap, getTimeIdMap, buildMarkdownHeaderObjAST} from './astbuilder';
import * as babelcore from '@babel/core';
import path from 'path';
import fs from 'fs';
import {Markdown} from 'src';

// top level AST Builder from static mode.
// {url: string, ids: Array<number>}
export function buildMarkdownDBAST(url: string, markdowns: Array<Markdown>): CallExpression {
  const t = babelcore.types;
  // TODO: build ast for [number]
  const a = varAST('a', buildMarkdownObjAST(url, markdowns));
  const b = varAST('b', t.newExpression(t.identifier('Map'), []));
  const c = varAST('c', t.newExpression(t.identifier('Map'), []));
  const returnStatement = t.returnStatement(
    t.objectExpression([
      t.objectProperty(t.identifier('db'), t.identifier('a')),
      t.objectProperty(t.identifier('indexTag'), t.identifier('b')),
      t.objectProperty(t.identifier('indexTime'), t.identifier('c')),
    ]));
  return scopedAST(
    t.blockStatement([
      a, b, c,
      buildTagIndexBlockAST(markdowns),
      buildTimeIndexBlockAST(markdowns),
      returnStatement,
    ]),
  );
}

function buildMarkdownObjAST(url: string, markdowns: Array<Markdown>): ObjectExpression {
  const t = babelcore.types;
  const headersArryExprs = t.arrayExpression(
    markdowns.map(m => buildMarkdownHeaderObjAST(m))
  );
  const headersProperty = t.objectProperty(
    t.identifier('headers'),
    headersArryExprs);
  const urlProperty = t.objectProperty(
    t.identifier('url'),
    t.stringLiteral(url));
  return t.objectExpression([urlProperty, headersProperty]);
}

namespace Files {
  // parse markdowns into html to pubDir
  export function toPublic(markdowns: Array<Markdown>, pubDir: string, url?: string) {
    const makeFile = publicDirReader(pubDir, url);
    markdowns.forEach(m => {makeFile(m);});
  }

  type MakeFile = (markdown: Markdown) => void;

  const publicDirReader = (pubdir: string, url?: string): MakeFile =>
    (markdown: Markdown) => {
      const p = path.join(
        url ?? "",
        path.resolve(pubdir),
        idToFileName(markdown.header.id));
      fs.writeFileSync(p, markdown.content);
    }

  function idToFileName(id: number): string {
    return id.toString() + '.html';
  }
}

// TODO
function buildTagIndexBlockAST(to: string, from: string, markdowns: Array<Markdown>) {
  const tagIndex = getTagIdMap(markdowns);
  const t = babelcore.types;
  const block = tagIndex.map(
    (tagIds: [any, any]) => {
      const [tag, ids] = tagIds;
      return t.expressionStatement(setMapAST(to, tag, mdAST(from, ids)))
    });
  return t.blockStatement(block);
}

function buildTimeIndexBlockAST(to: string, from: string, markdowns: Array<Markdown>) {
  const timeIndex = getTimeIdMap(markdowns);
  const t = babelcore.types;
  const block = (timeIds: [any, any]) => {
    const [time, ids] = timeIds;
    return t.expressionStatement(setMapAST(to, time, mdAST(from, ids)))
  };
  return t.blockStatement(timeIndex.map(block));
}
