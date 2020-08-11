import approotpath from 'app-root-path';
import fs from 'fs';
import path from 'path';
import {fnv1a} from '../utils/hash';

const sessionId = fnv1a(new Date().toJSON());

type LogLevel =
  | 'info'
  | 'warning'
  | 'error'
  ;

export function log(record: string, level: LogLevel = 'info') {
  const logname = path.join(
    approotpath.path,
    `markdowndb.macro-${sessionId}.log`);

  fs.appendFileSync(logname,
    `${level} -- ${new Date().toLocaleString()} - ${record}\n`
  );
}

export function logThrow(record: string, level: LogLevel = 'info') {
  log(record, level);
  throw new Error(record);
}
