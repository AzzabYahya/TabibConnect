const { execSync } = require('child_process');
const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const projectRoot = path.resolve(__dirname, '..');

const canUseLsof = () => {
  try {
    execSync('command -v lsof', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const run = (command) => execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();

const normalizePath = (value) => {
  if (!value) {
    return '';
  }

  return path.resolve(value);
};

const isProjectProcess = (cwd) => {
  if (!cwd) {
    return false;
  }

  const resolved = normalizePath(cwd);
  return resolved === projectRoot || resolved.startsWith(`${projectRoot}${path.sep}`);
};

const getProcessCwd = (pid) => {
  try {
    const output = run(`lsof -a -p ${pid} -d cwd -Fn`);
    const cwdLine = output.split('\n').find((line) => line.startsWith('n'));
    return cwdLine ? cwdLine.slice(1) : '';
  } catch {
    return '';
  }
};

const getListeningPids = (port) => {
  try {
    const output = run(`lsof -tiTCP:${port} -sTCP:LISTEN`);
    return output
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const main = () => {
  if (!canUseLsof()) {
    console.log('[dev] lsof not available; skipping port check.');
    return;
  }

  const pids = getListeningPids(PORT);

  if (!pids.length) {
    return;
  }

  const killed = [];
  const blocked = [];

  pids.forEach((pid) => {
    const cwd = getProcessCwd(pid);

    if (isProjectProcess(cwd)) {
      try {
        process.kill(Number(pid), 'SIGTERM');
        killed.push(pid);
      } catch {
        blocked.push(pid);
      }
      return;
    }

    blocked.push(pid);
  });

  if (killed.length) {
    console.log(`[dev] Freed port ${PORT} by stopping PID(s): ${killed.join(', ')}`);
  }

  if (blocked.length) {
    console.error(
      `[dev] Port ${PORT} is used by another process (PID(s): ${blocked.join(', ')}). ` +
        'Stop it or set PORT to a free value before running the backend.'
    );
    process.exit(1);
  }
};

main();
