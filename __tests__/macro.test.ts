import {MarkdownDB} from '../dist/types';
it('test1', () => {
  const markdowndb = require('../dist/macro');
  const db: MarkdownDB = markdowndb('markdown');
  console.log(db);
  expect(
    Array.from(db.values("default"))
      .filter(e => e.header.tag.length === 2).length)
    .toBe(1);
});
