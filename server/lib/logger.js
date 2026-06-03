const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  // In dev, pipe through pino-pretty for readable output. In prod, ship raw
  // JSON so log aggregators can parse fields directly.
  transport: isProd || isTest
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
      },
  // Redact authorization headers / cookies so secrets never reach the log
  // store, even by accident through `req.log.error({ req }, ...)`.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
    ],
    censor: '[redacted]',
  },
});

module.exports = logger;
