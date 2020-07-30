import {MarkdownRaw, MarkdownHeader} from '../types';
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
  const memberCall = t.memberExpression(
    t.identifier(b),
    t.identifier('set'));
  {
    const callParams = [t.stringLiteral(key), val];
    return t.callExpression(memberCall, callParams);
  }
}

// [a.get(1), a.get(2)]
export function mdAST(a: string, ids: Array<number>) {
  const t = babelcore.types;
  const memberCall = t.memberExpression(
    t.identifier(a),
    t.identifier('get')
  );

  {
    const elements = ids.map(n =>
      t.callExpression(memberCall, [t.numericLiteral(n)]));
    return t.arrayExpression(elements);
  }
}

// Map<number, MarkdownRaw>
export function buildMarkdownMapAST(markdowns: Array<MarkdownRaw>) {
  const t = babelcore.types;
  const pair = (m: MarkdownRaw) => t.arrayExpression([
    t.numericLiteral(m.header.id),
    buildMarkdownObjAST(m)]);

  const mdExprs = markdowns.map(pair);
  const mdarryExprs = t.arrayExpression(mdExprs);

  return t.newExpression(t.identifier('Map'), [mdarryExprs]);
}


export function buildMarkdownObjAST(markdown: MarkdownRaw) {
  const t = babelcore.types;
  const header = t.objectProperty(
    t.identifier('header'),
    buildMarkdownHeaderObjAST(markdown));
  const body = t.objectProperty(
    t.identifier('content'),
    buildMarkdownContentObjAst(markdown)
  );

  return t.objectExpression([header, body]);
}

export function buildMarkdownContentObjAst(markdown: MarkdownRaw) {
  const t = babelcore.types;
  const contentProperty = t.objectProperty(
    t.identifier("content"), t.stringLiteral(markdown.content));

  return t.objectExpression([contentProperty]);
}

export function buildMarkdownHeaderObjAST(markdown: MarkdownRaw) {
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
  return t.objectExpression([
    titleProperty, tagProperty, sourceProperty, timeProperty,
    idProperty,
  ]);
}

//  new Map([s1, [m.get(1), m.get(2)], s2, [m.get(4), m.get(9), m.get(12)] ...])
export function getTagIdMap(headers: Array<MarkdownHeader>): Array<[string, Array<number>]> {
  type Val_ = [string, Array<number>];
  const buildval = Util_.buildval(headers, "tag");
  const tags: Set<string> = new Set(flat(
    headers
      .map(m => m.tag)
      .filter(tl => tl !== undefined) as Array<Array<string>>
  ));

  {
    let acc: Array<Val_> = [];
    tags.forEach(tag => {acc.push(buildval(tag));});
    return acc;
  }
}

// date can not be key, so use its Json format.
export function getTimeIdMap(headers: Array<MarkdownHeader>): Array<[string, Array<number>]> {
  type Val_ = [string, Array<number>];
  const buildval = Util_.buildval(headers, "time");
  const timeStrs: Set<string> = new Set(
    headers.map(m => m.time.toJSON()));

  {
    let acc: Array<Val_> = [];
    timeStrs.forEach(tStr => {acc.push(buildval(tStr))});
    return acc;
  }
}

namespace Util_ {
  // build tuple of key and all markdowns it refers to.
  export const buildval =
    (markdowns: Array<MarkdownHeader>, keytype: keyof MarkdownHeader) =>
      (key: string): [string, Array<number>] => {
        const f = (m: MarkdownHeader) => {
          let val: any;
          switch (keytype) {
            case "time":
              val = m.time.toJSON();
              return key === val!;
            case "tag":
              val = m.tag;
              return (val! as Array<string>).includes(key);
            case "source":
              val = m.source;
              return (val! as Array<string>).includes(key);
            case "time":
              val = m.title;
              return key === val!;
            default:
              return false;
          }
        };
        return [
          key,
          markdowns.filter(f).map(m => m.id),
        ];
      }
}

// {tag: ..., time: ...}
export function buildIndexObjAST(tag: string, time: string) {
  const t = babelcore.types;
  const tagProperty = t.objectProperty(
    t.identifier("tag"),
    t.identifier(tag)
  );

  const timeProperty = t.objectProperty(
    t.identifier("time"),
    t.identifier(time)
  );
  return t.objectExpression([tagProperty, timeProperty]);
}
