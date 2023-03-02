const logger = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug:
    process.env.NODE_ENV !== 'production'
      ? console.debug
      : () => {
          return;
        }
};

export default logger;
