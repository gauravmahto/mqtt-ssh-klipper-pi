import log from 'node-file-logger';

import loggerConfig from './configs/node-file-logger.json' assert {type: 'json'};

log.SetUserOptions(loggerConfig);

export class Logger {

  #loggers = [];

  constructor(transports) {

    if (Array.isArray(transports)) {

      this.#loggers = transports;

    }

  }

  debug(...args) {

    this.#forEach('debug', ...args);

  }

  trace(...args) {

    this.#forEach('trace', ...args);

  }

  info(...args) {

    this.#forEach('info', ...args);

  }

  warn(...args) {

    this.#forEach('warn', ...args);

  }

  error(...args) {

    this.#forEach('error', ...args);

  }

  fatal(...args) {

    this.#forEach('fatal', ...args);

  }

  log(...args) {

    this.#forEach('log', ...args);

  }

  #forEach(fnStr, ...args) {

    this.#loggers.forEach((logger) => {

      const logFn = logger[fnStr];

      if (typeof logFn === 'function') {

        logFn(...args);

      }

    });

  }

}

class SimpleFileLogger {

  debug(msg) {

    log.Debug(msg);

  }

  trace(msg) {

    log.Trace(msg);
  }

  info(msg) {

    log.Info(msg);

  }

  warn(msg) {

    log.Warn(msg);

  }

  error(msg) {

    log.Error(msg);

  }

  fatal(msg) {

    log.Fatal(msg);

  }

  log(msg) {

    log.Log(msg);

  }

}

export const defaultLogger = new Logger([new SimpleFileLogger, console]);
