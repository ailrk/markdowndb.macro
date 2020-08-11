import fs from 'fs';
import path from 'path';
import {LogLevel} from '../types';
import {fnv1a} from '../utils/hash';
import {once} from '../utils/functools';

export const log = Log.log;
export const logThrow = Log.logThrow;
export const setLoggerOnce = (level: LogLevel) => once((level: LogLevel) => {
  Log.level = level;
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

namespace Log {

  const sessionId = fnv1a(new Date().toJSON());
  export let level: LogLevel = 'info';
  export let enabledLevels = new Set(['info', 'warning', 'error']);

  export function log(record: string, level: Exclude<LogLevel, 'silence'> = 'info') {
    if (!enabledLevels.has(level)) return;
    const logname = path.join(
      process.cwd(),
      `markdowndb.macro-${sessionId}.log`);
    fs.appendFileSync(logname,
      `${level} -- ${new Date().toLocaleString()} - ${record}\n`
    );
  }

  export function logThrow(record: string, level: Exclude<LogLevel, 'silence'> = 'info') {
    log(record, level);
    throw new Error(record);
  }
}
