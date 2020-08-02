// parse markdowns.
import fs from 'fs';
import path from 'path';
import MardownIt from 'markdown-it';
import MarkdownItMath from 'markdown-it-math';
import * as HLJS from 'highlightjs';
import * as textzilla from 'texzilla';
import {fnv1a} from '../utils/hash';
import {MarkdownRaw} from '../types';

// parse the whole directory.
export function makeMarkdownDB(dirname: string): Array<MarkdownRaw> {
  const markdownarray = fs.readdirSync(dirname)
    .map(filename => path.resolve(dirname, filename))
    .map(filename => parseMarkdown(filename))
    .filter(e => e !== undefined) as Array<MarkdownRaw>;

  {
    // check duplication.
    const dups = checkdup(markdownarray);
    if (dups.length !== 0) {
      throw new Error(`Some article titles collide in their hash. please change title` +
        ` of these articles ${dups}`);
    }
  }
  return markdownarray;
}

export function parseMarkdown(filename: string): MarkdownRaw | undefined {
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

function mdToHtml(md: string): string {
  const rmd = new MardownIt({
    html: false,
    breaks: true,
    linkify: true,
    highlight: (str: string, lang: string) => {
      if (lang && HLJS.getLanguage(lang)) {
        try {
          return HLJS.highlight(lang, str).value;
        } catch (_) {}
      }
      return str;
    }
  }).use(MarkdownItMath, {
    inlineRenderer: (str: string) => textzilla.toMathMLString(str),
    blockRenderer: (str: string) => textzilla.toMathMLString(str, true),
  });
  return rmd.render(md);
}

function checkdup(markdowns: Array<MarkdownRaw>) {
  const ids = ((arr: Array<MarkdownRaw>) => arr.map(m => m.header.id))(markdowns);
  return ids.filter((id, idx) => ids.indexOf(id) !== idx);
}
