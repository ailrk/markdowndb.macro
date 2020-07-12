import path from 'path';
import {createMacro, MacroParams} from 'babel-plugin-macros';
import {NodePath, Node} from '@babel/core';
import * as babelcore from '@babel/core';
import {ObjectExpression, NewExpression, Expression, ArrayExpression, BlockStatement} from '@babel/types';
import {flat} from './utils';
import * as Parse from './parse';

export default createMacro(markdowndbMacros);

export interface MarkdownHeader {
  title: string,
  time: Date,
  tag?: Array<string>,
  source?: Array<string>,
  id: number,
};

export type MarkdownText = string;

export interface Markdown {
  header: MarkdownHeader,
  content: MarkdownText,
};

// life type of MarkdownDB is the entire program.
// this won't bloat your website :)
export interface MarkdownDB {
  db: Map<number, Markdown>,
  indexTag: Map<string, Array<Markdown>>,  // hold  references of db values
  indexTime: Map<string, Array<Markdown>>,  // hold  references of db values
};

function markdowndbMacros({references, state, babel}: MacroParams) {
  references.default.forEach(referencePath => {
    if (referencePath.parentPath.type == "CallExpression") {
      requiremarkdowndb({referencePath, state, babel});
    } else {
      throw new Error(`This is not supported ` +
        `${referencePath.findParent(babel.types.isExpression).getSource()}`);
    }
  });
};

// db will represented as json string.
const requiremarkdowndb = ({referencePath, state, babel}:
  Omit<MacroParams, 'references'> & {referencePath: NodePath<Node>}) => {
  const filename = state.file.opts.filename;
  const t = babel.types;
  const callExpressionPath = referencePath.parentPath;
  if (typeof (filename) != "string") {
    throw new Error(`babel filename doesn't exist`);
  }
  const markdownDir: string | undefined =
    (callExpressionPath.get("arguments") as Array<NodePath<Node>>)[0]
      .evaluate()
      .value;

  if (markdownDir === undefined) {
    throw new Error(`There is a problem evaluating the argument `
      + `${callExpressionPath.getSource()}.`
      + ` Please make sure the value is known at compile time`);
  }

  const markdownarray = Parse.makeMarkdownDB(path.resolve(markdownDir));

  // check duplication.
  {
    const dups = checkdup(markdownarray);
    if (dups.length !== 0) {
      throw new Error(`Some article titles collide in their hash. please change title` +
        ` of these articles ${dups}`);
    }
  }

  const content = ASTBuilder.buildMarkdownDBAST(markdownarray);
  referencePath.parentPath.replaceWith(t.expressionStatement(content));
};

function checkdup(markdowns: Array<Markdown>) {
  const ids = ((arr: Array<Markdown>) => arr.map(m => m.header.id))(markdowns);
  return ids.filter((id, idx) => ids.indexOf(id) !== idx);
}

namespace ASTBuilder {
  // top level AST Builder.
  // It return a CallExpression, which is a call of an
  // anonymous function. This allows us to have local binding and
  // reference once AST from another.
  export function buildMarkdownDBAST(markdowns: Array<Markdown>) {
    const t = babelcore.types;
    const tagIndex = getTagIdMap(markdowns);
    const timeIndex = getTimeIdMap(markdowns);
    return scopedAST(
      t.blockStatement([
        varAST('a', buildMarkdownMapAST(markdowns)),
        varAST('b', t.newExpression(t.identifier('Map'), [])),
        varAST('c', t.newExpression(t.identifier('Map'), [])),

        t.blockStatement(
          tagIndex.map(
            tagIds => {
              const [tag, ids] = tagIds;
              return t.expressionStatement(setMapAST('b', tag, mdAST('a', ids)))
            })),

        t.blockStatement(
          timeIndex.map(
            timeIds => {
              const [time, ids] = timeIds;
              return t.expressionStatement(setMapAST('c', time, mdAST('a', ids)))
            })),

        t.returnStatement(
          t.objectExpression([
            t.objectProperty(t.identifier('db'), t.identifier('a')),
            t.objectProperty(t.identifier('indexTag'), t.identifier('b')),
            t.objectProperty(t.identifier('indexTime'), t.identifier('c')),
          ]),
        ),
      ]),
    );
  }

  // AST for an instant call of arrow function.
  // helpful for creating a local scope.
  function scopedAST(body: BlockStatement) {
    const t = babelcore.types;
    return t.callExpression(
      t.arrowFunctionExpression([], body),
      []);
  }

  function varAST(name: string, val: Expression) {
    const t = babelcore.types;
    return t.variableDeclaration(
      "const",
      [t.variableDeclarator(t.identifier(name), val)]
    );
  }

  // b.set(key, [...])
  function setMapAST(b: string, key: string, val: ArrayExpression) {
    const t = babelcore.types;
    return t.callExpression(
      t.memberExpression(
        t.identifier(b),
        t.identifier('set')),
      [t.stringLiteral(key), val]);
  }

  // [a.get(1), a.get(2)]
  function mdAST(a: string, ids: Array<number>) {
    const t = babelcore.types;
    return t.arrayExpression(ids.map(n => t.callExpression(
      t.memberExpression(
        t.identifier(a),
        t.identifier('get')
      ), [t.numericLiteral(n)])));
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
    const markdownExpr = t.objectExpression([
      t.objectProperty(
        t.identifier("header"),
        t.objectExpression([
          t.objectProperty(
            t.identifier("title"),
            t.stringLiteral(markdown.header.title)),
          t.objectProperty(
            t.identifier("tag"),
            t.arrayExpression(markdown.header.tag?.map(e => t.stringLiteral(e)))),
          t.objectProperty(
            t.identifier("source"),
            t.arrayExpression(markdown.header.source?.map(e => t.stringLiteral(e)))),
          t.objectProperty(
            t.identifier("time"),
            t.newExpression(
              t.identifier("Date"),
              [t.stringLiteral(markdown.header.time.toJSON())])),
          t.objectProperty(
            t.identifier("id"),
            t.numericLiteral(markdown.header.id)),
        ])),
      t.objectProperty(
        t.identifier("content"), t.stringLiteral(markdown.content),
      )
    ]);
    return markdownExpr;
  }

  // To get the reference of Map<id, Markdown> we assign a name to it, say `m` and build
  // AST the with the form
  //  new Map([s1, [m.get(1), m.get(2)], s2, [m.get(4), m.get(9), m.get(12)] ...])
  function getTagIdMap(markdowns: Array<Markdown>): Array<[string, Array<number>]> {
    type Val_ = [string, Array<number>];
    const buildval = Util_.buildval(markdowns, "tag");
    const tags: Set<string> = new Set(flat(
      markdowns
        .map(m => m.header.tag)
        .filter(tl => tl !== undefined) as Array<Array<string>>
    ));

    return (() => {
      let acc: Array<Val_> = [];
      tags.forEach(tag => {acc.push(buildval(tag));});
      return acc;
    })();
  }

  // date can not be key, so use its Json format.
  function getTimeIdMap(markdowns: Array<Markdown>): Array<[string, Array<number>]> {
    type Val_ = [string, Array<number>];
    const buildval = Util_.buildval(markdowns, "time");
    const timeStrs: Set<string> = new Set(
      markdowns.map(m => m.header.time.toJSON()));
    return (() => {
      let acc: Array<Val_> = [];
      timeStrs.forEach(tStr => {acc.push(buildval(tStr))});
      return acc;
    })();
  }

  namespace Util_ {
    // build tuple of key and all markdowns it refers to.
    export const buildval = (markdowns: Array<Markdown>, keytype: keyof MarkdownHeader) => (key: string): [string, Array<number>] => [
      key,
      markdowns.filter(m => {
        let val: any;
        switch (keytype) {
          case "time":
            val = m.header.time.toJSON();
            return val !== undefined && key === val;
          case "tag":
            val = m.header.tag;
            return val !== undefined && (val as Array<string>).includes(key);
          case "source":
            val = m.header.source;
            return val !== undefined && (val as Array<string>).includes(key);
          case "time":
            val = m.header.title;
            return val !== undefined && key === val;
          default:
            return false;
        }
      }).map(m => m.header.id),
    ];
  }
}


