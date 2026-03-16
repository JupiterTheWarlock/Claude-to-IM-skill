// Simple direct CLI test
import { spawn } from 'node:child_process';
import { resolveClaudeCliPath } from './src/llm-provider.js';

// Remove ALL proxy variables
const cleanEnv = { ...process.env };
const proxyVars = [
  'HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy',
  'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy'
];
for (const k of proxyVars) {
  delete cleanEnv[k];
}

const cliPath = resolveClaudeCliPath();
if (!cliPath) {
  console.error('Claude CLI not found');
  process.exit(1);
}

console.log('CLI path:', cliPath);
console.log('Env has proxy vars:', proxyVars.filter(k => process.env[k]));

const child = spawn(cliPath, ['--print', 'Say hello'], {
  env: cleanEnv,
  cwd: process.cwd(),
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
  console.log('stdout chunk:', data.toString());
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
  console.log('stderr:', data.toString());
});

child.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('Full stdout:', stdout);
  if (stderr) console.log('Full stderr:', stderr);
});

child.on('error', (err) => {
  console.error('Error:', err);
});
