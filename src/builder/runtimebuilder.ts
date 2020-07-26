import {Markdown} from '../types';
import * as babelcore from '@babel/core';
import {scopedAST, varAST, setMapAST, mdAST, getTagIdMap, getTimeIdMap} from './astbuilder';
import {ObjectExpression, NewExpression} from '@babel/types';

// top level AST Builder from runtime mode.
// It return a CallExpression, which is a call of an
// anonymous function. This allows us to have local binding and
// reference once AST from another.
export function buildMarkdownDBAST(markdowns: Array<Markdown>) {
  const t = babelcore.types;
  const tagIndex = getTagIdMap(markdowns);
  const timeIndex = getTimeIdMap(markdowns);
  const tagIndexBlock = t.blockStatement(
    tagIndex.map(
      (tagIds: [any, any]) => {
        const [tag, ids] = tagIds;
        return t.expressionStatement(setMapAST('b', tag, mdAST('a', ids)))
      }));
  const timeIndexBlock = t.blockStatement(
    timeIndex.map(
      (timeIds: [any, any]) => {
        const [time, ids] = timeIds;
        return t.expressionStatement(setMapAST('c', time, mdAST('a', ids)))
      }));
  const returnStatement = t.returnStatement(
    t.objectExpression([
      t.objectProperty(t.identifier('db'), t.identifier('a')),
      t.objectProperty(t.identifier('indexTag'), t.identifier('b')),
      t.objectProperty(t.identifier('indexTime'), t.identifier('c')),
    ]));
  return scopedAST(
    t.blockStatement([
      varAST('a', buildMarkdownMapAST(markdowns)),
      varAST('b', t.newExpression(t.identifier('Map'), [])),
      varAST('c', t.newExpression(t.identifier('Map'), [])),
      tagIndexBlock,
      timeIndexBlock,
      returnStatement,
    ]),
  );
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

// build AST for one Markdown Object
function buildMarkdownObjAST(markdown: Markdown): ObjectExpression {
  const t = babelcore.types;
  const titleProperty = t.objectProperty(
    t.identifier("title"),
    t.stringLiteral(markdown.header.title));
  const tagProperty = t.objectProperty(
    t.identifier("tag"),
    t.arrayExpression(markdown.header.tag?.map(e => t.stringLiteral(e))));
  const sourceProperty = t.objectProperty(
    t.identifier("source"),
    t.arrayExpression(markdown.header.source?.map(e => t.stringLiteral(e))));
  const timeProperty = t.objectProperty(
    t.identifier("time"),
    t.newExpression(
      t.identifier("Date"),
      [t.stringLiteral(markdown.header.time.toJSON())]));
  const idProperty = t.objectProperty(
    t.identifier("id"),
    t.numericLiteral(markdown.header.id));
  const contentProperty = t.objectProperty(
    t.identifier("content"), t.stringLiteral(markdown.content),
  );

  const markdownExpr = t.objectExpression([
    t.objectProperty(
      t.identifier("header"),
      t.objectExpression([
        titleProperty, tagProperty, sourceProperty, timeProperty,
        idProperty,
      ])),
    contentProperty
  ]);
  return markdownExpr;
}


