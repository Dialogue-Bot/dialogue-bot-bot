const { ActivityTypes } = require('botbuilder');

const CustomActivityTypes = {
  ...ActivityTypes,
  StopTyping: 'stop-typing',
};

module.exports = { CustomActivityTypes };
