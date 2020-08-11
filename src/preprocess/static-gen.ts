import {MarkdownRaw} from '../types';
import path from 'path';
import fs from 'fs';
import {log} from '../log/logger';
import * as Parse from './parse';

export interface ToPublic {
  (props: {pubDir: string, url: string}): void
}

// `url` is where raw markdown files resides.
// `fullPublicUrl` is where compiled html will be hosted.
export function toPublic(props: {pubDir: string, url: string}) {
  const {pubDir, url} = props;
  const fullPublicUrl = pubDirURL(pubDir, url);

  log(`Creating static markdown array, public directory: ${fullPublicUrl}`);

  if (!fs.existsSync(fullPublicUrl)) {
    log(`${fullPublicUrl} does not exists, will create a new one`);
    fs.mkdirSync(fullPublicUrl);
  };

  return topublic.toPublicBasic({fullPublicUrl, url});
}

// create new folder /<pubDir>/<url>/. For each markdown create a corresponding file
// in the new foler with the markdown's id as  the filename, markdown's text content as content.
namespace topublic {
  export function toPublicBasic(props: {fullPublicUrl: string, url: string}) {
    const {fullPublicUrl, url} = props;
    const markdowns = Parse.makeMarkdownArray(path.resolve(url));

    fs.readdirSync(fullPublicUrl)
      .forEach(filename => {
        del(fullPublicUrl, filename);
      });

    markdowns.forEach(({header, content}: MarkdownRaw) => {
      const p = htmlPath(fullPublicUrl, header.id.toString());
      fs.writeFileSync(p, content);
    });
    return markdowns;
  }

  function del(fullPublicUrl: string, filename: string) {
    fs.unlinkSync(path.join(path.resolve(fullPublicUrl), filename));
  }

  export const fallback = toPublicBasic;
}

export function pubDirURL(pubDir: string, url?: string) {
  return path.join(path.resolve(pubDir), url ?? "");
}

export function htmlPath(fullPublicUrl: string, id: string) {
  return path.join(fullPublicUrl, id + '.html');
}
