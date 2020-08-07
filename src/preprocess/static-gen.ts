import {MarkdownRaw} from '../types';
import path from 'path';
import fs from 'fs';
import {exec, ExecException} from 'child_process';
import approotpath from 'app-root-path';
import {commandExists} from '../utils/command-exists';
import {notUndefined, ParameterMap} from '../utils/type';
import * as Parse from './parse';

export interface ToPublic {
  (props: {pubDir: string, url: string}): void
}

export async function toPublic(props: {pubDir: string, url: string}) {
  if (git.gitCheck()) {
    return topublic.toPublicGitDiff(props);
  } else {
    return topublic.toPublicBasic(props);
  }
}

// create new folder /<pubDir>/<url>/. For each markdown create a corresponding file
// in the new foler with the markdown's id as  the filename, markdown's text content as content.
namespace topublic {
  export function toPublicBasic(props: {pubDir: string, url: string}) {
    const {pubDir, url} = props;
    const markdowns = Parse.makeMarkdownDB(path.resolve(url));

    const purl = pubDirURL(pubDir, url);
    if (!fs.existsSync(purl)) fs.mkdirSync(purl);
    fs.readdirSync(purl).forEach(filename => {del(purl, filename);});

    markdowns.forEach(({header, content}: MarkdownRaw) => {
      const p = htmlPath(purl, header.id.toString());
      fs.writeFileSync(p, content);
    });
    return markdowns;
  }

  export async function toPublicGitDiff(props: {pubDir: string, url: string}) {
    const {pubDir, url} = props;
    const purl = pubDirURL(pubDir, url);

    const {err, stdout, stderr} = await git.gitRun();
    if (err) {
      console.log('incremental build failed, ' +
        'failed to invoke git diff --filename-only\n' +
        `error msg: ${err}\n` +
        `stderr: ${stderr}\n` +
        'fall back to normal build (this will rebuild all markdown files)');
      return fallback(props);
    }

    // list of changed markdown files.
    const diffList = git.getDiffList(url, stdout);
    if (diffList === undefined) {return fallback(props)};

    diffList.forEach(({header, content}) => {
      const p = htmlPath(purl, header.id.toString());
      fs.mkdirSync(p, content);
    });
    return diffList;
  };

  function del(purl: string, filename: string) {
    fs.unlinkSync(path.join(path.resolve(purl), filename));
  }

  export const fallback = toPublicBasic;
}

namespace git {
  export function gitRun() {
    type RParam = ParameterMap<'err' | 'stdout' | 'stderr',
      Parameters<NonNullable<Parameters<typeof exec>[2]>>>

    return new Promise((resolve: ((e: RParam) => void)) => {
      exec('git diff --name-only', (err, stdout, stderr) => {
        resolve({err, stdout, stderr});
      });
    })
  }

  export function getDiffList(url: string, stdout: | string | Buffer | ExecException | null) {
    const diffList = stdout?.toString()
      .trim()
      .split("\n")
      .map(rawPath => {
        const [folder, markdownfile] = rawPath.split('/');
        if (folder === url) return path.resolve(markdownfile);
      })
      .filter(notUndefined)
      .filter(fs.existsSync)
      .map(Parse.parseMarkdown)
      .filter(notUndefined)
    return diffList;
  }

  export function gitCheck() {
    return gitExist() && hasDotGit();
  }

  export function gitPath(): string {
    return path.join(approotpath.path, '.git');
  }

  function gitExist(): boolean {
    return commandExists('git');
  }

  function hasDotGit(): boolean {
    return fs.existsSync(gitPath());
  }
}

export function pubDirURL(pubDir: string, url?: string) {
  return path.join(path.resolve(pubDir), url ?? "");
}

export function htmlPath(purl: string, id: string) {
  return path.join(purl, id + '.html');
}
