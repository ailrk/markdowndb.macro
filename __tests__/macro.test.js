
it('test1', () => {
  const markdowndb = require('../dist/macro');
  const markdowns = markdowndb('markdown');
  expect(markdowns.filter(e => e.header.tag.length === 2).length).toBe(1);
});
