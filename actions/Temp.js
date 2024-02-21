const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { REPLACE_ACTION, TEMP } = require('../Constant');

const TEMP_WATERFALL = 'TEMP_WATERFALL';

class Temp extends ComponentDialog {
  constructor(dialog) {
    super(TEMP);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(TEMP_WATERFALL, [this.TempAction.bind(this)]));
    this.initialDialogId = TEMP_WATERFALL;
  }

  async TempAction(step) {
    return await step.replaceDialog(REPLACE_ACTION);
  }
}

module.exports = {
  Temp,
};
