import {MarkdownRuntimeDatabase} from '../dist/MarkdownMap';
import markdowndb from '../dist/macro';
import 'regenerator-runtime';

it("Basic runtime promise test", async () => {
  const md: MarkdownRuntimeDatabase = markdowndb('markdown');

  const list = await Promise.all(
    Array.from(md.values("default"))
      .map(m => m.content)
  );
  expect(list.filter(e => e.length <= 20).length).toBe(1);
});

