const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const services = [
  {
    name: 'backend',
    cwd: path.join(rootDir, 'backend'),
  },
  {
    name: 'frontend',
    cwd: path.join(rootDir, 'frontend'),
  },
];

const children = [];
let shuttingDown = false;

const stopChildren = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const { child } of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  process.exit(exitCode);
};

for (const service of services) {
  const child = spawn(npmCommand, ['run', 'dev'], {
    cwd: service.cwd,
    stdio: 'inherit',
  });

  children.push({ name: service.name, child });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const exitCode = typeof code === 'number' ? code : 1;
    console.error(`[${service.name}] stopped with ${signal ? `signal ${signal}` : `code ${exitCode}`}`);
    stopChildren(exitCode);
  });

  child.on('error', (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[${service.name}] failed to start`);
    console.error(error);
    stopChildren(1);
  });
}

process.on('SIGINT', () => stopChildren(0));
process.on('SIGTERM', () => stopChildren(0));