const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { SEND_TEXT } = require('../Constant');
const { getTranslatedMessage, replaceData, formatMessage } = require('../utils/utils');

const SENDTEXT_WATERFALL = 'SENDTEXT_WATERFALL';

class SendText extends ComponentDialog {
  constructor(dialog) {
    super(SEND_TEXT);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(SENDTEXT_WATERFALL, [this.SendTextAction.bind(this)]));
    this.initialDialogId = SENDTEXT_WATERFALL;
  }

  async SendTextAction(step) {
    const { name, text, nextAction, prompt_type, extend, buttons } = step._info.options;

    console.log(`[SendMessage] ${name}`);

    const conversationData = await this.dialog.conversationDataAccessor.get(step.context);

    const { language, data } = conversationData;

    let msg = getTranslatedMessage(text, language);

    if (msg.message) {
      msg.message = replaceData({ text: msg.message, data: conversationData.data });
    }

    msg = formatMessage({ text: (msg && msg.message) || '', conversationData, type: prompt_type, extend });

    if (Array.isArray(buttons) && buttons.length) {
      msg.channelData = {};

      msg.channelData.buttons = buttons;
    }

    await step.context.sendActivity(msg);

    return await step.endDialog({ id: nextAction });
  }
}

module.exports = {
  SendText,
};
