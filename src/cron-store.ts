/**
 * Cron task storage for claude-to-im-skill.
 *
 * Manages scheduled tasks in ~/.claude-to-im/cron.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { CTI_HOME } from './config.js';

export interface CronTask {
  id: string;
  schedule: string; // crontab expression (5 fields)
  message: string; // prompt sent to agent
  channels: string[]; // e.g. ["discord:1479399509556592721", "telegram:123456"]
  log: boolean; // write to logs/cron.log
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastResult?: 'success' | 'error';
  lastError?: string;
}

export interface CronConfig {
  tasks: CronTask[];
}

const CRON_FILE = path.join(CTI_HOME, 'cron.json');
const LOG_FILE = path.join(CTI_HOME, 'logs', 'cron.log');

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function atomicWrite(filePath: string, data: string): void {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, data, 'utf-8');
  fs.renameSync(tmp, filePath);
}

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

export class CronStore {
  private config: CronConfig;

  constructor() {
    ensureDir(path.dirname(CRON_FILE));
    ensureDir(path.dirname(LOG_FILE));
    this.config = this.load();
  }

  private load(): CronConfig {
    try {
      const raw = fs.readFileSync(CRON_FILE, 'utf-8');
      return JSON.parse(raw) as CronConfig;
    } catch {
      return { tasks: [] };
    }
  }

  private persist(): void {
    atomicWrite(CRON_FILE, JSON.stringify(this.config, null, 2));
  }

  // ── Task CRUD ──

  list(): CronTask[] {
    return [...this.config.tasks];
  }

  get(id: string): CronTask | undefined {
    return this.config.tasks.find(t => t.id === id);
  }

  add(task: Omit<CronTask, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'lastResult' | 'lastError'>): CronTask {
    const newTask: CronTask = {
      ...task,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    this.config.tasks.push(newTask);
    this.persist();
    return newTask;
  }

  update(id: string, updates: Partial<Omit<CronTask, 'id' | 'createdAt'>>): CronTask | undefined {
    const idx = this.config.tasks.findIndex(t => t.id === id);
    if (idx === -1) return undefined;

    this.config.tasks[idx] = {
      ...this.config.tasks[idx],
      ...updates,
      updatedAt: now(),
    };
    this.persist();
    return this.config.tasks[idx];
  }

  remove(id: string): boolean {
    const idx = this.config.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;

    this.config.tasks.splice(idx, 1);
    this.persist();
    return true;
  }

  enable(id: string): boolean {
    return this.update(id, { enabled: true }) !== undefined;
  }

  disable(id: string): boolean {
    return this.update(id, { enabled: false }) !== undefined;
  }

  // ── Execution tracking ──

  markRun(id: string, result: 'success' | 'error', error?: string): void {
    this.update(id, {
      lastRunAt: now(),
      lastResult: result,
      lastError: error,
    });
  }

  // ── Logging ──

  appendLog(taskId: string, message: string): void {
    const timestamp = now();
    const line = `[${timestamp}] [${taskId}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line, 'utf-8');
  }
}
