/**
 * Job queue abstraction.
 *
 * Two backends:
 *  - BullMQ + Redis  (when REDIS_URL is set, and the bullmq + ioredis packages are installed)
 *  - In-process memory queue (default fallback) — runs jobs via setImmediate, stores results
 *    in a bounded Map. Suitable for single-instance deploys.
 *
 * Use `registerProcessor(name, fn)` once at startup, then `enqueue(name, payload)`
 * from anywhere. Read status via `getJob(id)`.
 *
 * Processor signature: async (payload, { updateProgress }) => result
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const processors = new Map();

let queue = null;          // BullMQ Queue instance (if active)
let worker = null;         // BullMQ Worker instance
let backend = 'memory';    // 'memory' | 'bullmq'

const memoryJobs = new Map(); // id -> { name, status, progress, result, error, createdAt, completedAt }
const MAX_MEMORY_JOBS = 200;
const JOB_RESULT_TTL_MS = 60 * 60 * 1000; // 1h
const QUEUE_NAME = 'churchos-jobs';

const gcMemoryJobs = () => {
  const now = Date.now();
  for (const [id, j] of memoryJobs.entries()) {
    if (j.completedAt && now - j.completedAt > JOB_RESULT_TTL_MS) memoryJobs.delete(id);
  }
  if (memoryJobs.size > MAX_MEMORY_JOBS) {
    // Drop oldest
    const sorted = [...memoryJobs.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (let i = 0; i < memoryJobs.size - MAX_MEMORY_JOBS; i++) memoryJobs.delete(sorted[i][0]);
  }
};

const initQueue = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.info('Job queue: using in-process memory backend (set REDIS_URL to use BullMQ)');
    return;
  }
  try {
    const { Queue, Worker } = require('bullmq');
    const IORedis = require('ioredis');
    const connection = new IORedis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });
    connection.on('error', (e) => logger.warn('Redis error', { err: e.message }));

    queue = new Queue(QUEUE_NAME, { connection });
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const fn = processors.get(job.name);
        if (!fn) throw new Error(`No processor registered for job "${job.name}"`);
        return await fn(job.data, {
          updateProgress: (p) => job.updateProgress(p).catch(() => {}),
        });
      },
      { connection, concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '4', 10) }
    );
    worker.on('failed', (job, err) =>
      logger.error('job failed', { id: job?.id, name: job?.name, err: err.message })
    );
    backend = 'bullmq';
    logger.info('Job queue: BullMQ connected to Redis');
  } catch (err) {
    logger.warn('REDIS_URL set but BullMQ failed to init; falling back to memory queue', {
      err: err.message,
    });
    queue = null;
    worker = null;
    backend = 'memory';
  }
};

const registerProcessor = (name, fn) => {
  if (typeof fn !== 'function') throw new Error('Processor must be a function');
  processors.set(name, fn);
};

const enqueue = async (name, payload, opts = {}) => {
  const fn = processors.get(name);
  if (!fn) throw new Error(`No processor registered for job "${name}"`);

  if (backend === 'bullmq' && queue) {
    const job = await queue.add(name, payload, {
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600 },
      attempts: opts.attempts || 1,
    });
    return { id: String(job.id), backend };
  }

  const id = uuidv4();
  memoryJobs.set(id, {
    name, status: 'queued', progress: 0,
    result: null, error: null,
    createdAt: Date.now(), completedAt: null,
  });
  gcMemoryJobs();

  setImmediate(async () => {
    const j = memoryJobs.get(id);
    if (!j) return;
    j.status = 'active';
    try {
      j.result = await fn(payload, { updateProgress: (p) => { j.progress = p; } });
      j.progress = 100;
      j.status = 'completed';
    } catch (err) {
      j.error = err.message || String(err);
      j.status = 'failed';
      logger.error('memory queue job failed', { name, err: j.error });
    } finally {
      j.completedAt = Date.now();
    }
  });

  return { id, backend };
};

const getJob = async (id) => {
  if (backend === 'bullmq' && queue) {
    const job = await queue.getJob(id);
    if (!job) return null;
    const state = await job.getState(); // waiting | active | completed | failed | delayed | paused
    return {
      id: String(job.id),
      name: job.name,
      status: state,
      progress: typeof job.progress === 'number' ? job.progress : 0,
      result: job.returnvalue || null,
      error: job.failedReason || null,
    };
  }
  const j = memoryJobs.get(id);
  if (!j) return null;
  return {
    id, name: j.name, status: j.status, progress: j.progress,
    result: j.result, error: j.error,
  };
};

const shutdown = async () => {
  try { if (worker) await worker.close(); } catch { /* ignore */ }
  try { if (queue) await queue.close(); } catch { /* ignore */ }
};

module.exports = {
  initQueue,
  registerProcessor,
  enqueue,
  getJob,
  shutdown,
  get backend() { return backend; },
};
