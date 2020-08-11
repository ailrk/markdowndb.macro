import fs from 'fs';
import path from 'path';
import {LogLevel} from '../types';
import {fnv1a} from '../utils/hash';
import {once} from '../utils/functools';

namespace Log {

  const sessionId = fnv1a(new Date().toJSON());
  export let level: LogLevel = 'info';
  export let enabledLevels = new Set(['info', 'warning', 'error']);
  export let logDir = process.cwd();

  export function log(record: string, level: Exclude<LogLevel, 'silence'> = 'info') {
    if (!enabledLevels.has(level)) return;
    const logfile = path.join(
      logDir,
      `markdowndb.macro-${sessionId}.log`);
    fs.appendFileSync(logfile,
      `${level} -- ${new Date().toLocaleString()} - ${record}\n`
    );
  }

  export function logThrow(record: string, level: Exclude<LogLevel, 'silence'> = 'info') {
    log(record, level);
    throw new Error(record);
  }
}

export const log = Log.log;
export const logThrow = Log.logThrow;
export const setLoggerOnce = (level: LogLevel, logDir?: string) => once(() => {
  Log.level = level;
  Log.logDir = logDir ?? Log.logDir;
  switch (level) {
    case "info":
    case "warning":
      Log.enabledLevels.delete("info");
    case "error":
      Log.enabledLevels.delete("warn");
    case "silence":
    default:
      Log.enabledLevels = new Set();
  }
}, level);

