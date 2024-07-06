const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { GO_TO } = require('../Constant');
const { endConversation } = require('../utils/utils');
const { ERROR_MESSAGE } = process.env;

const GOTOACTION_WATERFALL = 'GOTOACTION_WATERFALL';

class GotoAction extends ComponentDialog {
  constructor(dialog) {
    super(GO_TO);
    this.dialog = dialog;
    this.addDialog(
      new WaterfallDialog(GOTOACTION_WATERFALL, [this.goto.bind(this)])
    );
    this.initialDialogId = GOTOACTION_WATERFALL;
  }

  async goto(step) {
    const { gotoId } = step._info.options;

    if (!gotoId) {
      return await endConversation(step, ERROR_MESSAGE);
    }

    return await step.endDialog({ actionId: gotoId });
  }
}

module.exports = {
  GotoAction,
};
