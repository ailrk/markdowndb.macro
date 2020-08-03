import {MarkdownRaw} from '../types';
import path from 'path';
import fs from 'fs';

// create new folder /<pubDir>/<url>/. For each markdown create a corresponding file
// in the new foler with the markdown's id as  the filename, markdown's text content as content.
export function toPublic(markdowns: Array<MarkdownRaw>, pubDir: string, url?: string) {
  const purl = pubDirURL(pubDir, url);
  if (!fs.existsSync(purl)) fs.mkdirSync(purl);
  markdowns.forEach(({header, content}: MarkdownRaw) => {
    const p = htmlPath(purl, header.id.toString());
    fs.writeFileSync(p, content);
  });
}

export function pubDirURL(pubDir: string, url?: string) {
  return path.join(path.resolve(pubDir), url ?? "");
}

export function htmlPath(purl: string, id: string) {
  return path.join(purl, id + '.html');
}

