// module for generating static articles.

import {CallExpression} from '@babel/types';
import {
  scopedAST,
  varAST,
  setMapAST,
  mdAST,
  buildMarkdownHeaderObjAST,
  getTagIdMap,
  getTimeIdMap,
} from './astbuilder';
import * as babelcore from '@babel/core';
import path from 'path';
import fs from 'fs';
import {MarkdownRaw} from 'src/types';

// top level AST Builder from static mode.
// Process:
// 1. make a :: {url: string, headers: Map<string, MarkdownHeader>}
// 2. declare b, c :: Map<string, MarkdownHeader>
// 3. mmap = MarkdownStaticDatabase(a, {time, a, tag: b})
// 4. return mmap.
export function buildMarkdownDBAST(url: string, markdowns: Array<MarkdownRaw>): CallExpression {
  const t = babelcore.types;
  // {url: string, headers: Array<MarkdownHeader>}

  const defaultMap = varAST('defaultMap', buildMarkdownHeaderMapAST(markdowns));
  const tag = varAST('tag', t.newExpression(t.identifier('Map'), []));
  const time = varAST('time', t.newExpression(t.identifier('Map'), []));
  const staticObj = varAST('mmap', buildMarkdownStaticObjAST('a'));
  const returnStatement = t.returnStatement(
    t.objectExpression([
      t.objectProperty(t.identifier('db'), t.identifier('a')),
      t.objectProperty(t.identifier('indexTag'), t.identifier('b')),
      t.objectProperty(t.identifier('indexTime'), t.identifier('c')),
    ]));
  return scopedAST(
    t.blockStatement([
      defaultMap, tag, time, mmap,
      buildTagIndexBlockAST('mmap', 'a', markdowns),
      buildTimeIndexBlockAST('mmap', 'b', markdowns),
      returnStatement,
    ]),
  );
}

// { url: string, Map<number, MarkdownHeader>}
function buildMarkdownStaticObjAST(url: string, markdowns: Array<MarkdownRaw>) {
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

// Map<number, MarkdownHeader>
function buildMarkdownHeaderMapAST(markdowns: Array<MarkdownRaw>) {
  const t = babelcore.types;
  const pair = (m: MarkdownRaw) => t.arrayExpression([
    t.numericLiteral(m.header.id),
    buildMarkdownHeaderObjAST(m)]);

  const mdExpr = markdowns.map(pair);
  const mdarryExprs = t.arrayExpression(mdExpr);
  return t.newExpression(t.identifier('Map'), [mdarryExprs]);
}

// _ :: Map<string, Array<MarkdownHeader>>
export function buildTagIndexBlockAST(to: string, from: string, markdowns: Array<MarkdownRaw>) {
  const t = babelcore.types;
  const tagIndex = getTagIdMap(markdowns.map(m => m.header));
  const block = tagIndex.map(
    (tagIds: [string, Array<number>]) => {
      const [tag, ids] = tagIds;
      return t.expressionStatement(setMapAST(to, tag, mdAST(from, ids)))
    });
  return t.blockStatement(block);
}

export function buildTimeIndexBlockAST(to: string, from: string, markdowns: Array<MarkdownRaw>) {
  const t = babelcore.types;
  const timeIndex = getTimeIdMap(markdowns.map(m => m.header));
  const block = timeIndex.map((timeIds: [any, any]) => {
    const [time, ids] = timeIds;
    return t.expressionStatement(setMapAST(to, time, mdAST(from, ids)))
  });
  return t.blockStatement(block);
}

namespace Files {
  // parse markdowns into html to pubDir
  export function toPublic(
    markdowns: Array<MarkdownRaw>,
    pubDir: string,
    url?: string) {
    const makeFile = publicDirReader(pubDir, url);
    markdowns.forEach(m => {makeFile(m);});
  }

  type MakeFile = (markdown: MarkdownRaw) => void;

  const publicDirReader = (pubdir: string, url?: string): MakeFile =>
    (markdown: MarkdownRaw) => {
      const p = path.join(
        url ?? "",
        path.resolve(pubdir),
        markdown.header.id.toString() + '.html');
      fs.writeFileSync(p, markdown.content);
    }
}
