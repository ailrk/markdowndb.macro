// module for generating static articles.

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
} from './ast-builder';
import * as babelcore from '@babel/core';
import {MarkdownRaw} from 'src/types';

// top level AST Builder from static mode.
// Process:
// 1. make a :: {url: string, headers: Map<string, MarkdownHeader>}
// 2. declare b, c :: Map<string, MarkdownHeader>
// 3. mmap = MarkdownStaticDatabase(a, {time, a, tag: b})
// 4. return mmap.
export function buildMarkdownDBAST(url: string, markdowns: Array<MarkdownRaw>, publicUrl: string) {
  const t = babelcore.types;
  const defaultMap = assignBuilder('defaultMap', markdownHeaderMapBuilder(markdowns));
  const tagIdex = assignBuilder('tagIdex', t.newExpression(t.identifier('Map'), []));
  const timeIndex = assignBuilder('timeIndex', t.newExpression(t.identifier('Map'), []));
  const staticObj = assignBuilder('staticObj', markdownStaticObjBuilder(url, publicUrl, 'defaultMap'));
  const mmap = assignBuilder('mmap', staticMarkdownDatabaseBuilder('staticObj', 'tagIdex', 'timeIndex'));
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
function markdownStaticObjBuilder(url: string, publicUrl: string, headers: string) {
  const tp = template.expression.ast`{
    url: "${url}",
    publicUrl: "${publicUrl}",
    map: ${headers}
  }`;
  return tp;
}

// Map<number, MarkdownHeader>
function markdownHeaderMapBuilder(markdowns: Array<MarkdownRaw>) {
  const t = babelcore.types;
  const pair = (m: MarkdownRaw) =>
    template.expression`[ID, MARKDOWN_HEADER_OBJ]`
      ({
        ID: t.numericLiteral(m.header.id),
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
