/**
 * Simple test: run claude CLI directly
 */

import { spawn } from 'node:child_process';

const child = spawn('/home/gjim258/.local/bin/claude', ['--print', 'Say hello in 5 words'], {
  env: {
    ...process.env,
    HTTP_PROXY: '',
    HTTPS_PROXY: '',
    http_proxy: '',
    https_proxy: '',
    CTI_ENV_ISOLATION: 'strict',
  },
  cwd: process.cwd(),
});

child.stdout.on('data', (data) => {
  console.log('stdout:', data.toString());
});

child.stderr.on('data', (data) => {
  console.log('stderr:', data.toString());
});

child.on('close', (code) => {
  console.log('Exit code:', code);
});

child.on('error', (err) => {
  console.error('Error:', err);
});
