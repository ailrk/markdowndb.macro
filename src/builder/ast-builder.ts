import {MarkdownRaw, MarkdownHeader} from '../types';
import template from '@babel/template';
import * as babelcore from '@babel/core';
import {Expression, ArrayExpression, BlockStatement} from '@babel/types';
import {flat} from '../utils/flat';


// AST for an instant call of arrow function.
// helpful for creating a local scope.
export function scopeBuilder(body: BlockStatement) {
  return template.expression`(() =>  BODY )()`({BODY: body});
}

export function assignBuilder(name: string, val: Expression) {
  const t = babelcore.types;
  return template.statement`const NAME = VAL;`
    ({
      NAME: t.identifier(name),
      VAL: val
    });
}

// b.set(key, [...])
export function setMapBuilder(b: string, key: string, val: ArrayExpression) {
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
export function markdownArrayBuilder(a: string, ids: number[]) {
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
export function markdownMapBuilder(markdowns: MarkdownRaw[]) {
  const t = babelcore.types;
  const pair = (m: MarkdownRaw) => t.arrayExpression([
    t.numericLiteral(m.header.id),
    buildMarkdownObjAST(m)]);

  const mdExprs = markdowns.map(pair);
  const mdarryExprs = t.arrayExpression(mdExprs);

  return t.newExpression(t.identifier('Map'), [mdarryExprs]);
}

export function buildMarkdownObjAST(markdown: MarkdownRaw) {
  return template.expression`
    {
      header: HEADER,
      content: CONTENT,
    }
  `({
    HEADER: buildMarkdownHeaderObjAST(markdown),
    CONTENT: buildMarkdownContentStringAst(markdown),
  });
}

export function buildMarkdownContentStringAst(markdown: MarkdownRaw) {
  const t = babelcore.types;
  return t.stringLiteral(markdown.content);
}

export function buildMarkdownHeaderObjAST(markdown: MarkdownRaw) {
  const t = babelcore.types;
  const {header, } = markdown;
  const {title, time, tag, source, id} = header;
  return template.expression`
    {
      title: "${title}",
      tag: TAG,
      source: SOURCE,
      time: new Date("${time.toJSON()}"),
      id: ID,
    }
  `({
    TAG: t.arrayExpression(tag?.map(e => t.stringLiteral(e))),
    SOURCE: t.arrayExpression(source?.map(e => t.stringLiteral(e))),
    ID: t.numericLiteral(id)
  });
}

//  new Map([s1, [m.get(1), m.get(2)], s2, [m.get(4), m.get(9), m.get(12)] ...])
export function getTagIdMap(headers: MarkdownHeader[]): [string, number[]][] {
  type Val_ = [string, number[]];
  const buildval = Util_.buildval(headers, "tag");
  const tags: Set<string> = new Set(flat(
    headers
      .map(m => m.tag)
      .filter(tl => tl !== undefined) as string[][]
  ));

  {
    let acc: Val_[] = [];
    tags.forEach(tag => {acc.push(buildval(tag));});
    return acc;
  }
}

// date can not be key, so use its Json format.
export function getTimeIdMap(headers: MarkdownHeader[]): [string, number[]][] {
  type Val_ = [string, Array<number>];
  const buildval = Util_.buildval(headers, "time");
  const timeStrs: Set<string> = new Set(
    headers.map(m => m.time.toJSON()));

  {
    let acc: Val_[] = [];
    timeStrs.forEach(tStr => {acc.push(buildval(tStr))});
    return acc;
  }
}

// {tag: ..., time: ...}
export function buildIndexObjAST(tag: string, time: string) {
  return template.expression.ast`
    {
      tag: ${tag},
      time: ${time},
    }
  `;
}
namespace Util_ {
  // build tuple of key and all markdowns it refers to.
  export const buildval =
    (markdowns: MarkdownHeader[], keytype: keyof MarkdownHeader) =>
      (key: string): [string, number[]] => {
        const f = (m: MarkdownHeader) => {
          let val: any;
          switch (keytype) {
            case "time":
              val = m.time.toJSON();
              return key === val!;
            case "tag":
              val = m.tag;
              return (val! as string[]).includes(key);
            case "source":
              val = m.source;
              return (val! as string[]).includes(key);
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
