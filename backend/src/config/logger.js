import pino from 'pino';

export const logger = pino({
  name: 'quickshare',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: undefined,
});
