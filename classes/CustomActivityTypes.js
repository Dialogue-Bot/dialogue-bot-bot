const { ActivityTypes } = require('botbuilder');

const CustomActivityTypes = {
  ...ActivityTypes,
  StopTyping: 'stop-typing',
  Image: 'image',
};

module.exports = { CustomActivityTypes };
