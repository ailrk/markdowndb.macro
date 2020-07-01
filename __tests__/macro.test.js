it('test1', () => {
  const markdowndb = require('../dist/macro');
  const markdowns = markdowndb('markdown');
  const {db, indexTag} = markdowns;
  expect(
    Array.from(db.values())
      .filter(e => e.header.tag.length === 2).length)
    .toBe(1);
});
