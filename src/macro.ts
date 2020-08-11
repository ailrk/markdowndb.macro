import {createMacro, MacroParams} from 'babel-plugin-macros';
import {NodePath, Node} from '@babel/core';
import * as Builder from './builder/builder';
import {MarkdownDBMode, MarkdownDB} from './types';
import {log} from './log/logger';

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
  const markdownDir: string | undefined = args[0]?.evaluate()?.value;
  const mode: MarkdownDBMode = args[1]?.evaluate()?.value ?? "runtime";
  const publicURL: string | undefined = args[2]?.evaluate()?.value;

  {
    // sanity check
    if (markdownDir === undefined) {
      throw new Error(`There is a problem evaluating the argument `
        + `${callExpressionPath.getSource()}.`
        + ` Please make sure the value is known at compile time`);
    }
  }

  log(">> build start >>");
  const content = Builder.build(markdownDir, mode, publicURL)
  log("** build finished **");
  referencePath.parentPath.replaceWith(t.expressionStatement(content));
};
