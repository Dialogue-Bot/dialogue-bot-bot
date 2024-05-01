const { ActivityTypes } = require('botbuilder');

const CustomActivityTypes = {
  ...ActivityTypes,
  StopTyping: 'stop-typing',
  ConnectAgent: 'connect-agent',
};

module.exports = { CustomActivityTypes };
