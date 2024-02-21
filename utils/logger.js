const moment = require('moment');

['log', 'error', 'warn', 'info'].forEach((method) => {
  const originalMethod = console[method];
  console[method] = function () {
    const timestamp = moment().format('DD-MMM-YY dddd HH:mm:ss A');
    const modifiedArgs = Array.from(arguments).map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg));
    originalMethod.call(console, `[${timestamp}]`, ...modifiedArgs);
  };
});
