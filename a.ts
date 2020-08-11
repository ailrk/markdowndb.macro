import fs from 'fs';
import {promisify} from 'util';

async function foo() {
  const readdir = promisify(fs.readdir);
  console.log("before");
  const name = await readdir('/home/jimmy/Repo/markdowndb.macro/markdown');
  console.log(name);
}

foo();
