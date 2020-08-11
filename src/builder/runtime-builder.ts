import {MarkdownRaw} from '../types';
import * as babelcore from '@babel/core';
import {
  scopeBuilder,
  assignBuilder,
  markdownMapBuilder,
  buildIndexObjAST,
  getTagIdMap,
  getTimeIdMap,
  setMapBuilder,
  markdownArrayBuilder,
} from './ast-builder';

// top level AST Builder from runtime mode.
// Process:
// 1. make a :: Map<number, Markdown>
// 2. declare b, c :: Map<string, Array<Markdown>>
// 3. mmap = MarkdownRuntimeDatabase(a, {time: a, tag: b});
// 4. return mmap
export function buildMarkdownDBAST(markdowns: MarkdownRaw[]) {
  console.log("build ast");
  const t = babelcore.types;
  const defaultMap = assignBuilder('defaultMap', markdownMapBuilder(markdowns));
  const tagIndex = assignBuilder('tagIndex', t.newExpression(t.identifier('Map'), []));
  const timeIndex = assignBuilder('timeIndex', t.newExpression(t.identifier('Map'), []));
  const mmap = assignBuilder('mmap', runtimeMarkdownDatabaseBuilder('defaultMap', 'tagIndex', 'timeIndex'));
  const returnStatement = t.returnStatement(t.identifier('mmap'));
  {
    const scoped = scopeBuilder(
      t.blockStatement([
        defaultMap,
        tagIndex,
        timeIndex,
        tagIndexBlockBuilder('tagIndex', 'defaultMap', markdowns),
        timeIndexBlockBuilder('timeIndex', 'defaultMap', markdowns),
        mmap,
        returnStatement,
      ]),
    );
    return scoped;
  }
}

// const mmap = new MarkdownDataBase('a', {tag: .., time, ..})
function runtimeMarkdownDatabaseBuilder(main: string, tag: string, time: string) {
  const t = babelcore.types;
  return t.newExpression(
    t.identifier('MarkdownRuntimeDatabase'),
    [
      t.identifier(main),
      buildIndexObjAST(tag, time),
    ]);
}

// _ :: Map<string, Array<Markdown>>
export function tagIndexBlockBuilder(to: string, from: string, markdowns: MarkdownRaw[]) {
  const t = babelcore.types;
  const tagIndex = getTagIdMap(markdowns.map(m => m.header));
  const block = tagIndex.map(
    (tagIds: [string, number[]]) => {
      const [tag, ids] = tagIds;
      return t.expressionStatement(setMapBuilder(to, tag, markdownArrayBuilder(from, ids)))
    });
  return t.blockStatement(block);
}

export function timeIndexBlockBuilder(to: string, from: string, markdowns: MarkdownRaw[]) {
  const t = babelcore.types;
  const timeIndex = getTimeIdMap(markdowns.map(m => m.header));
  const block = timeIndex.map((timeIds: [any, any]) => {
    const [time, ids] = timeIds;
    return t.expressionStatement(setMapBuilder(to, time, markdownArrayBuilder(from, ids)))
  });
  return t.blockStatement(block);
}
