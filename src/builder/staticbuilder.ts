// module for generating static articles.

import {CallExpression} from '@babel/types';
import {
  scopedAST,
  varAST,
  setMapAST,
  mdAST,
  buildMarkdownHeaderObjAST,
  buildIndexObjAST,
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
  const tagIdex = varAST('tagIdex', t.newExpression(t.identifier('Map'), []));
  const timeIndex = varAST('timeIndex', t.newExpression(t.identifier('Map'), []));
  const staticObj = varAST('staticObj', buildMarkdownStaticObjAST(url, 'defaultMap'));
  const mmap = varAST('mmap'
    , buildStaticMarkdownDatabaseAST('defaultMap', 'tagIdex', 'timeIndex'));
  const returnStatement = t.returnStatement(t.identifier('mmap'));
  {
    const scoped = scopedAST(
      t.blockStatement([
        defaultMap,
        tagIdex,
        timeIndex,
        staticObj,
        buildTagIndexBlockAST('tagIdex', 'defaultMap', markdowns),
        buildTimeIndexBlockAST('timeIndex', 'defaultMap', markdowns),
        mmap,
        returnStatement,
      ]),
    );
    return scoped;
  }
}

function buildStaticMarkdownDatabaseAST(main: string, tag: string, time: string) {
  const t = babelcore.types;
  return t.newExpression(
    t.identifier('MarkdownStaticDatabase'),
    [
      t.identifier(main),
      buildIndexObjAST(tag, time),
    ]);
}

// { url: string, map: Map<number, MarkdownHeader>}
function buildMarkdownStaticObjAST(url: string, headers: string) {
  const t = babelcore.types;
  const headersProperty = t.objectProperty(
    t.identifier('headers'),
    t.identifier(headers));
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
  export function toPublic(markdowns: Array<MarkdownRaw>, pubDir: string, url?: string) {
    const makeFile = (markdown: MarkdownRaw) => {
      const p = path.join(
        url ?? "",
        path.resolve(pubDir),
        markdown.header.id.toString() + '.html');
      fs.writeFileSync(p, markdown.content);
    }
    markdowns.forEach(m => {makeFile(m);});
  }

}
