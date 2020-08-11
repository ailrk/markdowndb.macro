import {MarkdownRaw} from '../types';
import path from 'path';
import fs from 'fs';
import {execSync, ExecException} from 'child_process';
import approotpath from 'app-root-path';
import commandExists from 'command-exists';
import {notUndefined} from '../utils/type';
import * as Parse from './parse';

export interface ToPublic {
  (props: {pubDir: string, url: string}): void
}

// `url` is where raw markdown files resides.
// `fullPublicUrl` is where compiled html will be hosted.
export function toPublic(props: {pubDir: string, url: string}) {
  const {pubDir, url} = props;
  const fullPublicUrl = pubDirURL(pubDir, url);
  if (!fs.existsSync(fullPublicUrl)) {
    fs.mkdirSync(fullPublicUrl);
    return topublic.toPublicBasic({fullPublicUrl, url});
  };

  return (git.gitCheck() ?
    topublic.toPublicGitDiff :
    topublic.toPublicBasic)({fullPublicUrl, url});
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

  export function toPublicGitDiff(props: {fullPublicUrl: string, url: string}) {
    const {fullPublicUrl, url} = props;
    try {
      const stdout = git.gitRun();

      // list of changed markdown files.
      const diffList = git.getDiffList(url, stdout);
      if (diffList === undefined) {return fallback(props)};

      diffList.forEach(({header, content}) => {
        const p = htmlPath(fullPublicUrl, header.id.toString());
        fs.mkdirSync(p, content);
      });
      return diffList;

    } catch (err) {
      console.log('incremental build failed, ' +
        'failed to invoke git diff --filename-only\n' +
        `error msg: ${err}\n` +
        'fall back to normal build (this will rebuild all markdown files)');
      return fallback(props);
    }
  };

  function del(fullPublicUrl: string, filename: string) {
    fs.unlinkSync(path.join(path.resolve(fullPublicUrl), filename));
  }

  export const fallback = toPublicBasic;
}

namespace git {
  export function gitRun() {
    return execSync('git diff --name-only').toString();
  }

  export function getDiffList(url: string, stdout: | string | Buffer | ExecException | null) {
    const splitPath = (rawPath: string) => {
      const [folder, markdownfile] = rawPath.split('/');
      if (folder === url) return path.resolve(markdownfile);
    }
    if (stdout === null) return undefined;

    const diffList = stdout.toString()
      .trim()
      .split("\n")
      .map(splitPath)
      .filter(notUndefined)
      .filter(filename => fs.existsSync(filename))
      .map(filename => Parse.parseMarkdown({
        filename,
        rawtxt: fs.readFileSync(filename, {encoding: 'utf8'})
      }))
      .filter(notUndefined)

    return diffList;
  }

  export function gitCheck() {
    return gitExist() && hasDotGit();
  }

  export function gitPath(): string {
    return path.join(approotpath.path, '.git');
  }

  function gitExist() {
    return commandExists.sync('git')
  }

  async function hasDotGit() {
    return fs.existsSync(gitPath());
  }
}

export function pubDirURL(pubDir: string, url?: string) {
  return path.join(path.resolve(pubDir), url ?? "");
}

export function htmlPath(fullPublicUrl: string, id: string) {
  return path.join(fullPublicUrl, id + '.html');
}
