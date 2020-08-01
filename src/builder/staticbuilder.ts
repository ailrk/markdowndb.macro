// module for generating static articles.

import {CallExpression} from '@babel/types';
import template from '@babel/template';
import {
  scopeBuilder,
  assignBuilder,
  setMapBuilder,
  markdownArrayBuilder,
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
  const defaultMap = assignBuilder('defaultMap', markdownHeaderMapBuilder(markdowns));
  const tagIdex = assignBuilder('tagIdex', t.newExpression(t.identifier('Map'), []));
  const timeIndex = assignBuilder('timeIndex', t.newExpression(t.identifier('Map'), []));
  const staticObj = assignBuilder('staticObj', markdownStaticObjBuilder(url, 'defaultMap'));
  const mmap = assignBuilder('mmap', staticMarkdownDatabaseBuilder('defaultMap', 'tagIdex', 'timeIndex'));
  const returnStatement = t.returnStatement(t.identifier('mmap'));
  {
    const scoped = scopeBuilder(
      t.blockStatement([
        defaultMap,
        tagIdex,
        timeIndex,
        staticObj,
        tagIndexBlockBuilder('tagIdex', 'defaultMap', markdowns),
        timeIndexBlockBuilder('timeIndex', 'defaultMap', markdowns),
        mmap,
        returnStatement,
      ]),
    );
    return scoped;
  }
}

function staticMarkdownDatabaseBuilder(main: string, tag: string, time: string) {
  const t = babelcore.types;
  const tp = template.expression`new MarkdownStaticDatabase(MAIN, INDEX_OBJ)`;
  return tp({
    MAIN: t.identifier(main),
    INDEX_OBJ: buildIndexObjAST(tag, time),
  })
}

// { url: string, map: Map<number, MarkdownHeader>}
function markdownStaticObjBuilder(url: string, headers: string) {
  const tp = template.expression.ast`{ url: ${url}, map: ${headers} }`;
  return tp;
}

// Map<number, MarkdownHeader>
function markdownHeaderMapBuilder(markdowns: Array<MarkdownRaw>) {
  const t = babelcore.types;
  const pair = (m: MarkdownRaw) => template.expression`[ID, MARKDOWN_HEADER_OBJ]`
    ({
      ID: m.header.id,
      MARKDOWN_HEADER_OBJ: buildMarkdownHeaderObjAST(m),
    });

  const mdExpr = markdowns.map(pair);
  const mdarryExprs = t.arrayExpression(mdExpr);
  return template.expression`new Map(ARRARY)`({
    ARRARY: mdarryExprs,
  });
}

// _ :: Map<string, Array<MarkdownHeader>>
export function tagIndexBlockBuilder(to: string, from: string, markdowns: Array<MarkdownRaw>) {
  const t = babelcore.types;
  const tagIndex = getTagIdMap(markdowns.map(m => m.header));
  const block = tagIndex.map(
    (tagIds: [string, Array<number>]) => {
      const [tag, ids] = tagIds;
      return t.expressionStatement(setMapBuilder(to, tag, markdownArrayBuilder(from, ids)))
    });
  return t.blockStatement(block);
}

export function timeIndexBlockBuilder(to: string, from: string, markdowns: Array<MarkdownRaw>) {
  const t = babelcore.types;
  const timeIndex = getTimeIdMap(markdowns.map(m => m.header));
  const block = timeIndex.map((timeIds: [any, any]) => {
    const [time, ids] = timeIds;
    return t.expressionStatement(setMapBuilder(to, time, markdownArrayBuilder(from, ids)))
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
