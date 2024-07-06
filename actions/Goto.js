const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { GO_TO } = require('../Constant');

const GOTOACTION_WATERFALL = 'GOTOACTION_WATERFALL';

class GotoAction extends ComponentDialog {
  constructor(dialog) {
    super(GO_TO);
    this.dialog = dialog;
    this.addDialog(
      new WaterfallDialog(GOTOACTION_WATERFALL, [
        this.goto.bind(this),
      ])
    );
    this.initialDialogId = GOTOACTION_WATERFALL;
  }

  async goto(step) {
    const { gotoId } = step.step._info.options;
    return await step.endDialog({ actionId: gotoId });
  }
}

module.exports = {
  GotoAction,
};
