const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { SET_DATA } = require('../Constant');

const SETDATA_WATERFALL = 'SENDTEXT_WATERFALL';

class SetData extends ComponentDialog {
  constructor(dialog) {
    super(SET_DATA);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(SETDATA_WATERFALL, [this.SetAttribute.bind(this)]));
    this.initialDialogId = SETDATA_WATERFALL;
  }

  async SetAttribute(step) {
    const { name, data, nextAction } = step._info.options;

    console.log(`[SetAttribute] Action ${name}`);

    const conversationData = await this.dialog.conversationDataAccessor.get(step.context);

    conversationData.data = { ...conversationData.data, ...data };

    return await step.endDialog({ nextAction });
  }
}

module.exports = {
  SetData,
};
