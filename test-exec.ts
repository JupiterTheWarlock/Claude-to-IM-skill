// Test with execSync
import { execSync } from 'node:child_process';

console.log('Running claude with execSync...');

try {
  const result = execSync('env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy -u NO_PROXY -u no_proxy claude --print "Say hello"', {
    encoding: 'utf-8',
    timeout: 60000,
    cwd: process.cwd(),
  });
  console.log('Result:', result);
} catch (err) {
  console.error('Error:', err);
}
