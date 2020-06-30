
it('test', () => {
  const markdowndb = require('../dist/macro');
  const json = JSON.parse(markdowndb('markdown'));
});
