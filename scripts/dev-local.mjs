import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import process from 'node:process';

const root = process.cwd();
const forwardedArgs = process.argv.slice(2);
const hasPortArg = forwardedArgs.some((arg) => arg === '--port' || arg.startsWith('--port='));
const viteArgs = hasPortArg
  ? forwardedArgs
  : ['--port=3000', '--host=0.0.0.0', ...forwardedArgs];

const start = (command, args) => spawn(command, args, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

const isPortOpen = (port) => new Promise((resolve) => {
  const socket = createConnection({ host: '127.0.0.1', port });
  const finish = (open) => {
    socket.destroy();
    resolve(open);
  };
  socket.once('connect', () => finish(true));
  socket.once('error', () => finish(false));
  socket.setTimeout(500, () => finish(false));
});

const apiPort = Number(process.env.PORT || 3001);
const apiAlreadyRunning = await isPortOpen(apiPort);
const api = apiAlreadyRunning
  ? null
  : start('./node_modules/.bin/tsx', ['server.ts']);
const vite = start('./node_modules/.bin/vite', viteArgs);
let shuttingDown = false;

if (apiAlreadyRunning) {
  console.log(`[Local API] Reusing the existing server on port ${apiPort}.`);
}

const stopAll = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  api?.kill('SIGTERM');
  vite.kill('SIGTERM');
  process.exit(exitCode);
};

if (api) {
  api.on('error', (error) => {
    console.error(`[Local API] Could not start: ${error.message}`);
  });

  api.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.warn(`[Local API] Stopped (${signal || `exit ${code}`}). Vite will continue.`);
    }
  });
}

vite.on('error', (error) => {
  console.error(`[Vite] Could not start: ${error.message}`);
  stopAll(1);
});

vite.on('exit', (code) => {
  if (!shuttingDown) stopAll(code || 0);
});

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
