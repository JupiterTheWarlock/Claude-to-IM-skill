// Debug spawn env
import { spawn } from 'node:child_process';

const cleanEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) {
  if (v === undefined) continue;
  if (k.match(/proxy/i)) continue; // Skip all proxy vars
  cleanEnv[k] = v;
}

console.log('Clean env proxy vars:', Object.keys(cleanEnv).filter(k => k.match(/proxy/i)));

const child = spawn('claude', ['--print', 'Say hello'], {
  env: cleanEnv,
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
  if (stderr) console.log('Full stderr:', stderr);
});

child.on('error', (err) => {
  console.error('Error:', err);
});

// Timeout after 60s
setTimeout(() => {
  console.log('Timeout, killing...');
  child.kill();
}, 60000);
