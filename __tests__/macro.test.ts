// import {MarkdownRuntimeDatabase} from '../dist/markdown-map';
import {MarkdownRuntimeDatabase, MarkdownStaticDatabase} from '../dist/markdown-map';
import createMarkdownDB from '../dist/macro';
import 'regenerator-runtime';

it("Basic runtime promise test", async () => {
  const md: MarkdownRuntimeDatabase = createMarkdownDB('markdown', 'runtime');

  const list = await Promise.all(
    Array.from(md.values("default"))
      .map(m => m.content)
  );
  expect(list.filter(e => e.length <= 20).length).toBe(1);
});

// it("Basic static promise test", async () => {
//   const md: MarkdownStaticDatabase = createMarkdownDB('markdown', 'static');

//   // fake fetch behavior
//   const list = await Promise.all(
//     Array.from(md.values("default"))
//       .map(m => m.content)
//   );
//   expect(list.filter(e => e.length <= 20).length).toBe(1);
// });
