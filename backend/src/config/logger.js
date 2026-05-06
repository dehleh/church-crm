const winston = require('winston');
const Transport = require('winston-transport');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const { combine, timestamp, printf, colorize, json } = winston.format;

// Lightweight HTTP log drain transport. Batches logs and POSTs them as
// newline-delimited JSON to LOG_DRAIN_URL (compatible with Logtail, Better
// Stack, Axiom, Papertrail HTTP, Datadog logs intake, etc.).
class HttpDrainTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.url = new URL(opts.url);
    this.token = opts.token || '';
    this.flushInterval = opts.flushInterval || 5000;
    this.maxBatch = opts.maxBatch || 50;
    this.queue = [];
    this.timer = setInterval(() => this.flush().catch(() => {}), this.flushInterval);
    if (this.timer.unref) this.timer.unref();
  }
  log(info, callback) {
    setImmediate(() => this.emit('logged', info));
    this.queue.push({ ...info, ts: new Date().toISOString() });
    if (this.queue.length >= this.maxBatch) this.flush().catch(() => {});
    callback();
  }
  flush() {
    return new Promise((resolve) => {
      if (!this.queue.length) return resolve();
      const batch = this.queue.splice(0, this.queue.length);
      const body = batch.map((b) => JSON.stringify(b)).join('\n');
      const lib = this.url.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          method: 'POST',
          hostname: this.url.hostname,
          port: this.url.port || (this.url.protocol === 'https:' ? 443 : 80),
          path: this.url.pathname + this.url.search,
          headers: {
            'Content-Type': 'application/x-ndjson',
            'Content-Length': Buffer.byteLength(body),
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          timeout: 5000,
        },
        (res) => { res.on('data', () => {}); res.on('end', resolve); }
      );
      req.on('error', () => resolve());
      req.on('timeout', () => { req.destroy(); resolve(); });
      req.write(body);
      req.end();
    });
  }
}

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${extra}`;
  })
);

const prodFormat = combine(timestamp(), json());

const transports = [new winston.transports.Console()];
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: 'logs/combined.log', maxsize: 5242880, maxFiles: 5 })
  );
}
if (process.env.LOG_DRAIN_URL) {
  try {
    transports.push(new HttpDrainTransport({
      url: process.env.LOG_DRAIN_URL,
      token: process.env.LOG_DRAIN_TOKEN || '',
      level: process.env.LOG_DRAIN_LEVEL || 'info',
    }));
  } catch (e) {
    console.error('Failed to init log drain:', e.message);
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'church-crm' },
  transports,
});

// Stream for Morgan HTTP logging
logger.stream = { write: (message) => logger.http(message.trim()) };

module.exports = logger;
