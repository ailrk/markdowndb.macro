import {MarkdownRaw} from '../types';
import path from 'path';
import fs from 'fs';
import {exec, ExecException} from 'child_process';
import approotpath from 'app-root-path';
import {commandExists} from '../utils/command-exists';
import {notUndefined, ParameterMap} from '../utils/type';
import * as Parse from './parse';
import {promisify} from 'util';

export interface ToPublic {
  (props: {pubDir: string, url: string}): void
}

// `url` is where raw markdown files resides.
// `fullPublicUrl` is where compiled html will be hosted.
export async function toPublic(props: {pubDir: string, url: string}) {
  const {pubDir, url} = props;
  const fullPublicUrl = pubDirURL(pubDir, url);
  if (!await promisify(fs.exists)(fullPublicUrl)) {
    promisify(fs.mkdir)(fullPublicUrl);
    return topublic.toPublicBasic({fullPublicUrl, url});
  };

  return (git.gitCheck() ?
    topublic.toPublicGitDiff :
    topublic.toPublicBasic)({fullPublicUrl, url});
}

// create new folder /<pubDir>/<url>/. For each markdown create a corresponding file
// in the new foler with the markdown's id as  the filename, markdown's text content as content.
namespace topublic {
  export async function toPublicBasic(props: {fullPublicUrl: string, url: string}) {
    const {fullPublicUrl, url} = props;
    const markdowns = await Parse.makeMarkdownDB(path.resolve(url));

    fs.readdirSync(fullPublicUrl)
      .forEach(filename => {
        del(fullPublicUrl, filename);
      });

    markdowns.forEach(({header, content}: MarkdownRaw) => {
      const p = htmlPath(fullPublicUrl, header.id.toString());
      promisify(fs.writeFile)(p, content);
    });
    return markdowns;
  }

  export async function toPublicGitDiff(props: {fullPublicUrl: string, url: string}) {
    const {fullPublicUrl, url} = props;
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
    const diffList = await git.getDiffList(url, stdout);
    if (diffList === undefined) {return fallback(props)};

    diffList.forEach(({header, content}) => {
      const p = htmlPath(fullPublicUrl, header.id.toString());
      fs.mkdirSync(p, content);
    });
    return diffList;
  };

  function del(fullPublicUrl: string, filename: string) {
    fs.unlinkSync(path.join(path.resolve(fullPublicUrl), filename));
  }

  export const fallback = toPublicBasic;
}

namespace git {
  export async function gitRun() {
    type RParam = ParameterMap<'err' | 'stdout' | 'stderr',
      Parameters<NonNullable<Parameters<typeof exec>[2]>>>

    return new Promise((resolve: ((e: RParam) => void)) => {
      exec('git diff --name-only', (err, stdout, stderr) => {
        resolve({err, stdout, stderr});
      });
    })
  }

  export async function getDiffList(url: string, stdout: | string | Buffer | ExecException | null) {
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
      .filter(fs.existsSync)
      .map(async filename => Parse.parseMarkdown({
        filename,
        rawtxt: (await (promisify(fs.readFile)(filename, {encoding: 'utf8'})))
      }))
      .filter(notUndefined)

    return await Promise.all(diffList) ?? undefined;
  }

  export async function gitCheck() {
    return gitExist() && hasDotGit();
  }

  export function gitPath(): string {
    return path.join(approotpath.path, '.git');
  }

  async function gitExist() {
    return promisify(commandExists)('git');
  }

  async function hasDotGit() {
    return promisify(fs.exists)(gitPath());
  }
}

export function pubDirURL(pubDir: string, url?: string) {
  return path.join(path.resolve(pubDir), url ?? "");
}

export function htmlPath(fullPublicUrl: string, id: string) {
  return path.join(fullPublicUrl, id + '.html');
}
