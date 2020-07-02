import fs from 'fs';
import path from 'path';
import MardownIt from 'markdown-it';
import MarkdownItMath from 'markdown-it-math';
import {createMacro, MacroParams} from 'babel-plugin-macros';
import {NodePath, Node} from '@babel/core';
import * as babelcore from '@babel/core';
import {ObjectExpression, NewExpression, Expression, ArrayExpression, BlockStatement} from '@babel/types';
import {fnv1a} from './hash';
import {flat} from './utils';

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
};

function mdToHtml(md: string): string {
  const rmd = new MardownIt({
    html: false,
    breaks: true,
    linkify: true,
  }).use(MarkdownItMath);
  return rmd.render(md);
}

function markdowndbMacros({references, state, babel}: MacroParams) {
  references.default.forEach(referencePath => {
    if (referencePath.parentPath.type == "CallExpression") {
      requiremarkdowndb({referencePath, state, babel});
    } else {
      throw new Error(`This is not supported ${referencePath.findParent(babel.types.isExpression).getSource()}`);
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
    throw new Error(`There is a problem evaluating the argument ${callExpressionPath.getSource()}.` +
      ` Please make sure the value is known at compile time`);
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
    return scopedAST(
      t.blockStatement([
        varAST('a', buildMarkdownMapAST(markdowns)),
        varAST('b', t.newExpression(t.identifier('Map'), [])),

        t.blockStatement(
          tagIndex.map(
            tagIds => {
              const [tag, ids] = tagIds;
              return t.expressionStatement(setMapAST('b', tag, mdAST('a', ids)))
            })),

        t.returnStatement(
          t.objectExpression([
            t.objectProperty(t.identifier('db'), t.identifier('a')),
            t.objectProperty(t.identifier('indexTag'), t.identifier('b')),
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
          t.objectProperty(t.identifier("title"), t.stringLiteral(markdown.header.title)),
          t.objectProperty(t.identifier("tag"), t.arrayExpression(markdown.header.tag?.map(e => t.stringLiteral(e)))),
          t.objectProperty(t.identifier("source"), t.arrayExpression(markdown.header.source?.map(e => t.stringLiteral(e)))),
          t.objectProperty(t.identifier("time"),
            t.newExpression(t.identifier("Date"), [t.stringLiteral(markdown.header.time.toJSON())])),
          t.objectProperty(t.identifier("id"), t.numericLiteral(markdown.header.id)),
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
    const buildval = (tag: string): Val_ => [
      tag,
      markdowns.filter(m => {
        const mtags = m.header.tag;
        return mtags !== undefined && mtags.includes(tag);
      }).map(m => m.header.id)
    ];

    const tags: Set<string> = (() => {
      const a = markdowns
        .map(m => m.header.tag)
        .filter(tl => tl !== undefined) as Array<Array<string>>;
      return new Set(flat(a));
    })();

    return (() => {
      let acc: Array<Val_> = [];
      tags.forEach(tag => {acc.push(buildval(tag));});
      return acc;
    })();
  }
}

namespace Parse {
  // parse the whole directory.
  export function makeMarkdownDB(dirname: string): Array<Markdown> {
    return fs.readdirSync(dirname)
      .map(filename => path.resolve(dirname, filename))
      .map(filename => parseMarkdown(filename))
      .filter(e => e !== undefined) as Array<Markdown>;
  }

  export function parseMarkdown(filename: string): Markdown | undefined {
    const txt =
      fs.readFileSync(filename, {encoding: "utf-8"}).split(';;');

    const headers = txt[0].split("--").filter(e => e !== '');
    const content = mdToHtml(txt[1]);

    let tag: Array<string> | undefined;
    let source: Array<string> | undefined;
    let time: Date | undefined;
    let title: string | undefined;

    for (const line of headers) {
      const tokens = line.trim().split(" ");
      switch (tokens[0]) {

        // tag and source can be empty
        case "tag":
          if (tokens.length == 1) break
          tag = tokens.slice(1);
          break

        case "source":
          if (tokens.length == 1) break
          source = tokens.slice(1);
          break

        // all articles must have a titile and a date.
        case "date":
        case "time":
          try {
            time = new Date(tokens[1]);
          } catch (err) {
            throw Error(`date ${tokens[1]} format is not correct`);
          }
          break

        case "title":
          try {
            if (tokens.length >= 2)
              title = tokens.slice(1).join(' ');
            else {
              const parsed = /(.+).md/.exec(filename);
              title = parsed?.pop() ?? "untitled";
            }
          } catch (err) {
            throw Error(`title of ${path.basename(filename)} is unavaiable`);
          }
          break
        default:
          throw Error("Incorrect markdown header format.");
      }
    }
    return {
      header:
      {
        title: (title as string),
        tag,
        source,
        time: (time as Date),
        id: fnv1a((title as string)),
      },
      content
    };
  }
}


