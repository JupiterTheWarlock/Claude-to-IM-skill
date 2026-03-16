// Test with explicit env command
import { spawn } from 'node:child_process';

const child = spawn('env', [
  '-u', 'HTTP_PROXY', '-u', 'HTTPS_PROXY', '-u', 'http_proxy', '-u', 'https_proxy',
  '-u', 'ALL_PROXY', '-u', 'all_proxy', '-u', 'NO_PROXY', '-u', 'no_proxy',
  'claude', '--print', 'Say hello'
], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
  console.log('stdout:', data.toString());
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
  console.log('stderr:', data.toString());
});

child.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('Full stdout:', stdout);
});

setTimeout(() => {
  console.log('Timeout, killing...');
  child.kill();
}, 60000);
