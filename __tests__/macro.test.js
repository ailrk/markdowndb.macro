
it('test1', () => {
  const markdowndb = require('../dist/macro');
  const markdowns = JSON.parse(markdowndb('markdown'));
  expect(markdowns.filter(e => e.header.tag.length === 2).length).toBe(1);
});
