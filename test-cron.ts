/**
 * Test script to manually trigger a cron task
 */

// Remove proxy for testing
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

import { CronStore, type CronTask } from './src/cron-store.js';
import { CronScheduler } from './src/cron.js';
import { loadConfig } from './src/config.js';

async function main() {
  const config = loadConfig();
  const store = new CronStore();

  const scheduler = new CronScheduler({
    store,
    defaultWorkDir: config.defaultWorkDir || process.cwd(),
    defaultModel: config.defaultModel,
  });

  // Get the test task
  const task = store.get('test_task_001');
  if (!task) {
    console.error('Test task not found');
    process.exit(1);
  }

  console.log('Executing test task manually...');
  console.log(`Task: ${task.message}`);

  // Access private method via the scheduler instance
  // Need to bind to preserve 'this' context
  const schedulerAny = scheduler as unknown as Record<string, unknown>;
  const executeTaskFn = schedulerAny.executeTask as ((t: CronTask) => Promise<void>) | undefined;
  
  if (!executeTaskFn) {
    console.error('executeTask method not found');
    process.exit(1);
  }

  await executeTaskFn.call(scheduler, task);

  console.log('\nDone! Check logs:');
  console.log('  cat ~/.claude-to-im/logs/cron.log');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
