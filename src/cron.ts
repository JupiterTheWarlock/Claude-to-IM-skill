/**
 * Cron scheduler for claude-to-im-skill.
 *
 * Uses croner to schedule tasks, executes them by creating new sessions
 * and calling the LLMProvider.
 */

import { Cron } from 'croner';
import type { LLMProvider } from 'claude-to-im/src/lib/bridge/host.js';
import { CronStore, type CronTask } from './cron-store.js';
import { CTI_HOME } from './config.js';
import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = path.join(CTI_HOME, 'logs');

interface CronSchedulerOptions {
  store: CronStore;
  llm: LLMProvider;
  defaultWorkDir: string;
  defaultModel?: string;
  /** Optional: send message to IM channel. Format: "platform:chatId" */
  sendMessage?: (channel: string, message: string) => Promise<void>;
}

interface ScheduledJob {
  task: CronTask;
  job: Cron;
}

export class CronScheduler {
  private store: CronStore;
  private llm: LLMProvider;
  private sendMessage?: (channel: string, message: string) => Promise<void>;
  private defaultWorkDir: string;
  private defaultModel?: string;
  private jobs: Map<string, ScheduledJob> = new Map();

  constructor(options: CronSchedulerOptions) {
    this.store = options.store;
    this.llm = options.llm;
    this.sendMessage = options.sendMessage;
    this.defaultWorkDir = options.defaultWorkDir;
    this.defaultModel = options.defaultModel;

    // Ensure log dir exists
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  /**
   * Start the scheduler — load all enabled tasks and schedule them.
   */
  start(): void {
    const tasks = this.store.list().filter(t => t.enabled);

    for (const task of tasks) {
      this.scheduleTask(task);
    }

    console.log(`[cron] Scheduler started with ${tasks.length} task(s)`);
  }

  /**
   * Stop all scheduled jobs.
   */
  stop(): void {
    for (const [id, { job }] of this.jobs) {
      job.stop();
      console.log(`[cron] Stopped task ${id}`);
    }
    this.jobs.clear();
  }

  /**
   * Schedule a single task.
   */
  scheduleTask(task: CronTask): boolean {
    // Stop existing job if any
    const existing = this.jobs.get(task.id);
    if (existing) {
      existing.job.stop();
    }

    try {
      const job = new Cron(task.schedule, async () => {
        await this.executeTask(task);
      });

      this.jobs.set(task.id, { task, job });

      if (task.enabled) {
        console.log(`[cron] Scheduled task ${task.id} (${task.schedule})`);
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[cron] Failed to schedule task ${task.id}: ${error}`);
      this.store.markRun(task.id, 'error', `Schedule error: ${error}`);
      return false;
    }
  }

  /**
   * Unschedule a task.
   */
  unscheduleTask(taskId: string): void {
    const scheduled = this.jobs.get(taskId);
    if (scheduled) {
      scheduled.job.stop();
      this.jobs.delete(taskId);
      console.log(`[cron] Unscheduled task ${taskId}`);
    }
  }

  /**
   * Reload all tasks from store and reschedule.
   */
  reload(): void {
    this.stop();
    this.start();
  }

  /**
   * Execute a task — create new session, call LLM, send results.
   */
  private async executeTask(task: CronTask): Promise<void> {
    console.log(`[cron] Executing task ${task.id}: ${task.message.slice(0, 50)}...`);

    let responseText = '';
    let hasError = false;
    let errorMessage = '';

    try {
      // Create a new session for this task
      const sessionId = `cron_${task.id}_${Date.now()}`;
      const stream = this.llm.streamChat({
        prompt: task.message,
        sessionId,
        workingDirectory: this.defaultWorkDir,
        model: this.defaultModel,
        sdkSessionId: undefined, // New session each time
        abortController: new AbortController(),
      });

      // Read the stream
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // value is already string (ReadableStream<string>)
        responseText += this.extractTextFromSSE(value);
      }

      // Truncate if too long for IM
      const maxLen = 4000;
      const truncatedResponse = responseText.length > maxLen
        ? responseText.slice(0, maxLen) + '\n... (truncated)'
        : responseText;

      // Send to channels if configured
      if (task.channels && task.channels.length > 0 && this.sendMessage) {
        for (const channel of task.channels) {
          try {
            await this.sendMessage(channel, truncatedResponse);
          } catch (err) {
            const chError = err instanceof Error ? err.message : String(err);
            console.error(`[cron] Failed to send to ${channel}: ${chError}`);
            if (task.log) {
              this.store.appendLog(task.id, `Send error to ${channel}: ${chError}`);
            }
          }
        }
      } else if (task.channels && task.channels.length > 0) {
        // Channels configured but no sendMessage handler
        console.warn(`[cron] Task ${task.id} has channels but no sendMessage handler`);
        if (task.log) {
          this.store.appendLog(task.id, `Warning: channels configured but no sendMessage handler`);
        }
      }

      // Log if enabled
      if (task.log) {
        this.store.appendLog(task.id, `Success:\n${truncatedResponse}`);
      }

      this.store.markRun(task.id, 'success');
      console.log(`[cron] Task ${task.id} completed`);

    } catch (err) {
      hasError = true;
      errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[cron] Task ${task.id} failed: ${errorMessage}`);

      if (task.log) {
        this.store.appendLog(task.id, `Error: ${errorMessage}`);
      }

      this.store.markRun(task.id, 'error', errorMessage);
    }
  }

  /**
   * Extract text content from SSE events.
   * SSE format: event: text\ndata: <content>\n\n
   */
  private extractTextFromSSE(chunk: string): string {
    let text = '';
    const lines = chunk.split('\n');

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:') && currentEvent === 'text') {
        text += line.slice(5).trim();
      }
    }

    return text;
  }
}
