const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { REPLACE_ACTION, CHECK_VARIABLE } = require('../Constant');

const CHECKVARIABLE_WATERFALL = 'CHECKVARIABLE_WATERFALL';

class CheckVariable extends ComponentDialog {
  constructor(dialog) {
    super(CHECK_VARIABLE);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(CHECKVARIABLE_WATERFALL, [this.checkVariable.bind(this)]));
    this.initialDialogId = CHECKVARIABLE_WATERFALL;
  }

  async checkVariable(step) {
    return await step.endDialog({ checkAction: true });
  }
}

module.exports = {
  CheckVariable,
};
