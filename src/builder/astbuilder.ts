import {Markdown, MarkdownHeader} from '../types';
import * as babelcore from '@babel/core';
import {Expression, ArrayExpression, BlockStatement} from '@babel/types';
import {flat} from '../utils';


// AST for an instant call of arrow function.
// helpful for creating a local scope.
export function scopedAST(body: BlockStatement) {
  const t = babelcore.types;
  return t.callExpression(
    t.arrowFunctionExpression([], body),
    []);
}

export function varAST(name: string, val: Expression) {
  const t = babelcore.types;
  return t.variableDeclaration(
    "const",
    [t.variableDeclarator(t.identifier(name), val)]
  );
}
// b.set(key, [...])
export function setMapAST(b: string, key: string, val: ArrayExpression) {
  const t = babelcore.types;
  return t.callExpression(
    t.memberExpression(
      t.identifier(b),
      t.identifier('set')),
    [t.stringLiteral(key), val]);
}

// [a.get(1), a.get(2)]
export function mdAST(a: string, ids: Array<number>) {
  const t = babelcore.types;
  return t.arrayExpression(ids.map(n => t.callExpression(
    t.memberExpression(
      t.identifier(a),
      t.identifier('get')
    ), [t.numericLiteral(n)])));
}

  // To get the reference of Map<id, Markdown> we assign a name to it, say `m` and build
  // AST the with the form
  //  new Map([s1, [m.get(1), m.get(2)], s2, [m.get(4), m.get(9), m.get(12)] ...])
export function getTagIdMap(markdowns: Array<Markdown>): Array<[string, Array<number>]> {
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
export function getTimeIdMap(markdowns: Array<Markdown>): Array<[string, Array<number>]> {
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


