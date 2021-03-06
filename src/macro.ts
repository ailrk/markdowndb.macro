import {createMacro, MacroParams} from 'babel-plugin-macros';
import {NodePath, Node} from '@babel/core';
import * as Builder from './builder/builder';
import {MarkdownDBMode, MarkdownDB, MarkdownDBConfig} from './types';
import {log} from './log/logger';
import {makeConfig} from './config';

export type CreateMarkdownDBFn = (dir: string, mode: MarkdownDBMode, publicURL?: string) => MarkdownDB;
export default createMacro(markdowndbMacros);

function markdowndbMacros({references, state, babel}: MacroParams) {
  references.default.forEach(referencePath => {
    if (referencePath.parentPath.type == "CallExpression") {
      requiremarkdowndb({referencePath, state, babel});
    } else {
      throw new Error(`This is not supported`
        + `${referencePath.findParent(babel.types.isExpression).getSource()}`);
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

  const args = callExpressionPath.get("arguments") as NodePath<Node>[]
  const config: MarkdownDBConfig = args[0]?.evaluate()?.value;
  const {markdownDir, mode, publicURL} = makeConfig(config);

  log(">- build start -<");
  const content = Builder.build(markdownDir, mode, publicURL)
  log("** build finished **");
  referencePath.parentPath.replaceWith(t.expressionStatement(content));
};
