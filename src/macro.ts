import fs from 'fs';
import path from 'path';
import MardownIt from 'markdown-it';
import { createMacro, MacroParams } from 'babel-plugin-macros';
import { NodePath, Node } from '@babel/core';

export default createMacro(markdowndbMacros);

// markdown format
// -- date 1992-20-21
// -- tag <tag1> <tag2> <tag3> ...
// -- source <src1> <src2> ...
// -- title <title>

interface MarkdownHeader {
    title: string,
    time: Date,
    tag?: Array<string>,
    source?: Array<string>,
    id: number,
};

type MarkdownText = string;

type Markdown = {
    header: MarkdownHeader,
    content: MarkdownText,
};

function mdToHtml(md: string): string {
    const rmd = new MardownIt({
        html: false,
        breaks: true,
        linkify: true,
    });
    return rmd.render(md);
}

function markdowndbMacros({ references, state, babel }: MacroParams) {
    references.default.forEach(referencePath => {
        if (referencePath.parentPath.type == "CallExpression") {    // expand function call only.
            requiremarkdowndb({ referencePath, state, babel });
        } else {
            throw new Error(`This is not supported ${referencePath.findParent(babel.types.isExpression).getSource()}`);
        }
    });
};

// db will represented as json string.
const requiremarkdowndb = ({ referencePath, state, babel }: Omit<MacroParams, 'references'> & { referencePath: NodePath<Node> }) => {
    const filename = state.file.opts.filename;
    const t = babel.types;
    const callExpressionPath = referencePath;
    if (typeof (filename) != "string") {
        throw new Error(`filename ${filename} doesn't exist`);
    }
    const dirname = path.dirname(filename);
    const markdownDir: string | undefined =
        (callExpressionPath.get("arguments") as Array<NodePath<Node>>)[0]
            .evaluate()
            .value;

    if (markdownDir === undefined) {
        throw new Error(`There is a problem evaluating the argument ${callExpressionPath.getSource()}.` +
            ` Please make sure the value is known at compile time`);
    }

    const fullDirPath = require.resolve(markdownDir, { paths: [dirname] });
    const content = JSON.stringify(makeMarkdownDB(fullDirPath));
    referencePath.parentPath.replaceWith(t.expressionStatement(t.stringLiteral(content)));
};


function makeMarkdownDB(dirname: string): Array<Markdown> {
    return fs.readdirSync(dirname)
        .map(filename => path.resolve(dirname, filename))
        .map((filename, idx) => parseMarkdown(filename, idx))
        .filter(e => e !== undefined) as Array<Markdown>;
}

function parseMarkdown(filename: string, id: number = 0): Markdown | undefined {
    const txt =
        fs.readdirSync(filename, { encoding: "utf-8" })
            .join("")
            .split(";;");

    const headers = txt[0].split("--");
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
                tag = tokens.slice(1, -1);
                break
            case "source":
                if (tokens.length == 1) break
                source = tokens.slice(1, -1);
                break
            // all articles must have a titile and a date.
            case "date":
                try {
                    time = new Date(tokens[1]);
                } catch (err) {
                    throw Error(`date ${tokens[1]} format is not correct`);
                }
                break
            case "title":
                try {
                    if (tokens.length == 2)
                        title = tokens[1];
                    else {
                        const parsed = /(.+).md/.exec(filename);
                        title = parsed ? parsed[0] : "untitled";
                    }
                } catch (err) {
                    throw Error(`title of ${filename} is unavaiable`);
                }
                break
        }
    }
    return { header: { title: (title as string), tag, source, time: (time as Date), id }, content };
}
