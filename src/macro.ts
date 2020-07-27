import {createMacro, MacroParams} from 'babel-plugin-macros';
import {NodePath, Node} from '@babel/core';
import * as Builder from './builder/builder';

export default createMacro(markdowndbMacros);

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

  const content = Builder.build(markdownDir, "runtime");

  //const markdownarray = Parse.makeMarkdownDB(path.resolve(markdownDir));
  //const content = ASTBuilder.buildMarkdownDBAST(markdownarray);
  referencePath.parentPath.replaceWith(t.expressionStatement(content));
};
