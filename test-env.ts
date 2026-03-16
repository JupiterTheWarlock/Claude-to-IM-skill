import { buildSubprocessEnv } from './src/llm-provider.js';

const env = buildSubprocessEnv();

console.log('Environment variables:');
for (const [key, value] of Object.entries(env)) {
  console.log(`  ${key}: ${value}`);
}

console.log('\nChecking for proxy vars:');
console.log('  HTTP_PROXY:', env.HTTP_PROXY || '(none)');
console.log('  HTTPS_PROXY:', env.HTTPS_PROXY || '(none)');
console.log('  http_proxy:', env.http_proxy || '(none)');
console.log('  https_proxy:', env.https_proxy || '(none)');
