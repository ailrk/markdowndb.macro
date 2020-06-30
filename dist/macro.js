"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var markdown_it_1 = __importDefault(require("markdown-it"));
var babel_plugin_macros_1 = require("babel-plugin-macros");
exports.default = babel_plugin_macros_1.createMacro(markdowndbMacros);
;
function mdToHtml(md) {
    var rmd = new markdown_it_1.default({
        html: false,
        breaks: true,
        linkify: true,
    });
    return rmd.render(md);
}
function markdowndbMacros(_a) {
    var references = _a.references, state = _a.state, babel = _a.babel;
    references.default.forEach(function (referencePath) {
        if (referencePath.parentPath.type == "CallExpression") { // expand function call only.
            requiremarkdowndb({ referencePath: referencePath, state: state, babel: babel });
        }
        else {
            throw new Error("This is not supported " + referencePath.findParent(babel.types.isExpression).getSource());
        }
    });
}
;
// db will represented as json string.
var requiremarkdowndb = function (_a) {
    var referencePath = _a.referencePath, state = _a.state, babel = _a.babel;
    var filename = state.file.opts.filename;
    var t = babel.types;
    var callExpressionPath = referencePath.parentPath;
    if (typeof (filename) != "string") {
        throw new Error("filename " + filename + " doesn't exist");
    }
    var markdownDir = callExpressionPath.get("arguments")[0]
        .evaluate()
        .value;
    if (markdownDir === undefined) {
        throw new Error("There is a problem evaluating the argument " + callExpressionPath.getSource() + "." +
            " Please make sure the value is known at compile time");
    }
    var content = JSON.stringify(makeMarkdownDB(path_1.default.resolve(markdownDir)));
    referencePath.parentPath.replaceWith(t.expressionStatement(t.stringLiteral(content)));
};
function makeMarkdownDB(dirname) {
    return fs_1.default.readdirSync(dirname)
        .map(function (filename) { return path_1.default.resolve(dirname, filename); })
        .map(function (filename, idx) { return parseMarkdown(filename, idx); })
        .filter(function (e) { return e !== undefined; });
}
function parseMarkdown(filename, id) {
    var _a;
    if (id === void 0) { id = 0; }
    var txt = fs_1.default.readFileSync(filename, { encoding: "utf-8" }).split(';;');
    console.log('Text' + JSON.stringify(txt) + '\n\n');
    var headers = txt[0].split("--").filter(function (e) { return e !== ''; });
    var content = mdToHtml(txt[1]);
    console.log('header' + headers);
    var tag;
    var source;
    var time;
    var title;
    for (var _i = 0, headers_1 = headers; _i < headers_1.length; _i++) {
        var line = headers_1[_i];
        var tokens = line.trim().split(" ");
        switch (tokens[0]) {
            // tag and source can be empty
            case "tag":
                if (tokens.length == 1)
                    break;
                tag = tokens.slice(1);
                break;
            case "source":
                if (tokens.length == 1)
                    break;
                source = tokens.slice(1);
                break;
            // all articles must have a titile and a date.
            case "date":
                try {
                    time = new Date(tokens[1]);
                }
                catch (err) {
                    throw Error("date " + tokens[1] + " format is not correct");
                }
                break;
            case "title":
                try {
                    if (tokens.length >= 2)
                        title = tokens.slice(1, -1).join('');
                    else {
                        var parsed = /(.+).md/.exec(filename);
                        title = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.pop()) !== null && _a !== void 0 ? _a : "untitled";
                    }
                }
                catch (err) {
                    throw Error("title of " + path_1.default.basename(filename) + " is unavaiable");
                }
                break;
        }
    }
    return { header: { title: title, tag: tag, source: source, time: time, id: id }, content: content };
}
