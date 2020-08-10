import * as os from 'os';
import * as child_process from 'child_process';

export async function commandExists(cmd: string): Promise<boolean> {
  const isWin = os.platform().indexOf('win') > -1;
  const where = isWin ? 'where' : 'whereis';
  const out = child_process.spawn(`${where} ${cmd}`, ['/?']);
  return out.exitCode !== 0;
}
