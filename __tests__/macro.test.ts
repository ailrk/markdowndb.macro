import {MarkdownRuntimeDatabase} from '../dist/MarkdownMap';

it('runtime article length', () => {
  const markdowndb = require('../dist/macro');
  const db: MarkdownRuntimeDatabase = markdowndb('markdown');
  expect(
    Array.from(db.values("default"))
      .filter(e => e.header.tag.length === 2).length)
    .toBe(1);
});

it('runtime promise', () => {
  const markdowndb = require('../dist/macro');
  const db: MarkdownRuntimeDatabase = markdowndb('markdown');
  expect(
    Array.from(db.values("default"))
      .filter(e => {
        let val = "";
        e.content.then(m => {val = m;});
        console.log(val);
        return val === "test";
      }).length).toBe(1);
});
