import fs from 'fs';
import path from 'path';
import {LogLevel} from '../types';
import {fnv1a} from '../utils/hash';
import {once} from '../utils/functools';

export const log = Log.log;
export const logThrow = Log.logThrow;
export const setLoggerOnce = (level: LogLevel) => once((level: LogLevel) => {
  Log.level = level;
}, level);

namespace Log {

  const sessionId = fnv1a(new Date().toJSON());
  export let level: LogLevel = 'info';

  export function log(record: string, level: LogLevel = 'info') {
    const logname = path.join(
      process.cwd(),
      `markdowndb.macro-${sessionId}.log`);
    fs.appendFileSync(logname,
      `${level} -- ${new Date().toLocaleString()} - ${record}\n`
    );
  }

  export function logThrow(record: string, level: LogLevel = 'info') {
    log(record, level);
    throw new Error(record);
  }

}
