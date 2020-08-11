import {MarkdownDBConfig} from './types';
import {log, setLoggerOnce} from './log/logger';

type MakeConfigFn = (props: MarkdownDBConfig) => MarkdownDBConfig;

export const makeConfig: MakeConfigFn = (
  {
    markdownDir,
    mode,
    publicURL,
    logLevel,
    logDir,
  }: MarkdownDBConfig) => {

  if (logLevel === undefined) {
    setLoggerOnce("info", logDir);
  } else {
    setLoggerOnce(logLevel, logDir);
  }

  if (markdownDir === undefined) {
    throw new Error(`Markdown directory is not specified`);
  }

  if (mode === undefined) {
    throw new Error(`Build mode is note specified`);
  }

  publicURL = (() => {
    if (publicURL === undefined) {
      log("publicURL is not specified, using / as default", "warning");
      return '/';
    }
    return publicURL;
  })()

  return {
    markdownDir,
    mode,
    publicURL,
  }
}
