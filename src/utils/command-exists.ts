import * as os from 'os';
import * as child_process from 'child_process';

export function commandExists(cmd: string) {
  const isWin = os.platform().indexOf('win') > -1;
  const where = isWin ? 'where' : 'whereis';
  const out = child_process.spawnSync(`${where} ${cmd}`, ['/?']);
  return out.status !== 0;
}
