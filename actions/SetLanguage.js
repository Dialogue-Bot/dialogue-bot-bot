const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { REPLACE_ACTION, SET_LANGUAGE } = require('../Constant');

const SETLANGUAGE_WATERFALL = 'SETLANGUAGE_WATERFALL';

class SetLanguage extends ComponentDialog {
  constructor(dialog) {
    super(SET_LANGUAGE);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(SETLANGUAGE_WATERFALL, [this.TempAction.bind(this)]));
    this.initialDialogId = SETLANGUAGE_WATERFALL;
  }

  async TempAction(step) {
    return await step.endDialog();
  }
}

module.exports = {
  SetLanguage,
};
