import {Markdown} from '../types';
import * as babelcore from '@babel/core';
import {scopedAST, varAST, setMapAST, mdAST, getTimeIdMap, getTagIdMap, buildMarkdownObjAST, buildTaggedUnionAST} from './astbuilder';
import {NewExpression, CallExpression} from '@babel/types';

// top level AST Builder from runtime mode.
// It return a CallExpression, which is a call of an
// anonymous function. This allows us to have local binding and
// reference once AST from another.
export function buildMarkdownDBAST(markdowns: Array<Markdown>): CallExpression {
  const t = babelcore.types;
  const a = varAST('a', buildMarkdownMapAST(markdowns));
  const b = varAST('b', t.newExpression(t.identifier('Map'), []));
  const c = varAST('c', t.newExpression(t.identifier('Map'), []));
  const returnStatement = t.returnStatement(
    t.objectExpression([
      t.objectProperty(t.identifier('db'), t.identifier('a')),
      t.objectProperty(t.identifier('indexTag'), t.identifier('b')),
      t.objectProperty(t.identifier('indexTime'), t.identifier('c')),
    ]));
  {
    const scoped = scopedAST(
      t.blockStatement([
        a, b, c,
        buildTagIndexBlockAST('b', 'a', markdowns),
        buildTimeIndexBlockAST('c', 'a', markdowns),
        returnStatement,
      ]),
    );
    return scoped;
  }
}

function buildMarkdownMapAST(markdowns: Array<Markdown>): NewExpression {
  const t = babelcore.types;

  const pair = (m: Markdown) => t.arrayExpression([
    t.numericLiteral(m.header.id),
    buildMarkdownObjAST(m)]);

  const mdExprs = markdowns.map(pair);
  const mdarryExprs = t.arrayExpression(mdExprs);

  return t.newExpression(t.identifier('Map'), [mdarryExprs]);
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
