it('test', () => {
  const markdowndb = require('../dist/macro');
  const json: string = markdowndb('markdown');
  console.log("JSON ==== " + json);
});
