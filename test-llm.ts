/**
 * Simple LLM test
 */

import { SDKLLMProvider, resolveClaudeCliPath } from './src/llm-provider.js';
import { PendingPermissions } from './src/permission-gateway.js';
import { loadConfig } from './src/config.js';

async function main() {
  // Remove proxy for testing (causes timeout issues)
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
  delete process.env.http_proxy;
  delete process.env.https_proxy;
  process.env.CTI_ENV_ISOLATION = 'strict';

  const config = loadConfig();
  const pendingPerms = new PendingPermissions();

  const cliPath = resolveClaudeCliPath();
  if (!cliPath) {
    console.error('Claude CLI not found');
    process.exit(1);
  }

  console.log(`Using Claude CLI: ${cliPath}`);
  console.log(`Working directory: ${config.defaultWorkDir}`);

  const llm = new SDKLLMProvider(pendingPerms, cliPath, true);

  console.log('Sending test message...');

  const stream = llm.streamChat({
    prompt: 'Say hello in exactly 5 words',
    sessionId: 'test_session',
    workingDirectory: config.defaultWorkDir || process.cwd(),
    abortController: new AbortController(),
  });

  console.log('Stream created, reading...');

  const reader = stream.getReader();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    console.log('Chunk:', value);
    fullResponse += value;
  }

  console.log('\nFull response:\n', fullResponse);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
