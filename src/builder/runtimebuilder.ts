import {MarkdownRaw} from '../types';
import * as babelcore from '@babel/core';
import {
  scopedAST,
  varAST,
  buildMarkdownMapAST,
  buildIndexObjAST,
  getTagIdMap,
  getTimeIdMap,
  setMapAST,
  mdAST,
} from './astbuilder';
import {CallExpression} from '@babel/types';

// top level AST Builder from runtime mode.
// Process:
// 1. make a :: Map<number, Markdown>
// 2. declare b, c :: Map<string, Array<Markdown>>
// 3. mmap = MarkdownRuntimeDatabase(a, {time: a, tag: b});
// 4. return mmap
export function buildMarkdownDBAST(markdowns: Array<MarkdownRaw>): CallExpression {
  const t = babelcore.types;
  const defaultMap = varAST('defaultMap', buildMarkdownMapAST(markdowns));
  const tagIndex = varAST('tagIndex', t.newExpression(t.identifier('Map'), []));
  const timeIndex = varAST('timeIndex', t.newExpression(t.identifier('Map'), []));
  const mmap = varAST('mmap', buildRuntimeMarkdownDatabaseAST('defaultMap', 'tagIndex', 'timeIndex'));
  const returnStatement = t.returnStatement(t.stringLiteral('mmap'));
  {
    const scoped = scopedAST(
      t.blockStatement([
        defaultMap, tagIndex, timeIndex,
        buildTagIndexBlockAST('tagIndex', 'defaultMap', markdowns),
        buildTimeIndexBlockAST('timeIndex', 'defaultMap', markdowns),
        mmap,
        returnStatement,
      ]),
    );
    return scoped;
  }
}

// const mmap = new MarkdownDataBase('a', {tag: .., time, ..})
function buildRuntimeMarkdownDatabaseAST(main: string, tag: string, time: string) {
  const t = babelcore.types;
  return t.newExpression(
    t.identifier('MarkdownRuntimeDatabase'),
    [
      t.identifier(main),
      buildIndexObjAST(tag, time),
    ]);
}

// _ :: Map<string, Array<Markdown>>
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
