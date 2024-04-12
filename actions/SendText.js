const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { SEND_TEXT } = require('../Constant');
const { getTranslatedMessage, replaceData, formatMessage, getExtendTypeMessage } = require('../utils/utils');
const { translate } = require('../services/translate');
const { ERROR_MESSAGE } = process.env;

const SENDTEXT_WATERFALL = 'SENDTEXT_WATERFALL';

class SendText extends ComponentDialog {
  constructor(dialog) {
    super(SEND_TEXT);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(SENDTEXT_WATERFALL, [this.SendTextAction.bind(this)]));
    this.initialDialogId = SENDTEXT_WATERFALL;
  }

  async SendTextAction(step) {
    const { name, nextAction, prompt_type, extend, contents } = step._info.options;

    console.log(`[SendMessage] ${name}`);

    const conversationData = await this.dialog.conversationDataAccessor.get(step.context);

    const { language, data } = conversationData;

    let msg = getTranslatedMessage(contents, language);

    if (msg.message) {
      msg.message = replaceData({ text: msg.message, data: conversationData.variables });
    }

    // translate
    msg.message = await translate(msg.message, msg.language, language);
    
    msg = formatMessage({ text: (msg && msg.message) || '', conversationData, type: msg.type, extend });
    
    const extendType = getExtendTypeMessage(contents, language, conversationData.channelId);

    if (extendType && Array.isArray(extendType.data) && extendType.data.length) {
      msg.channelData = {};

      msg.channelData['extendData'] = extendType.data;

      msg.channelData.type = extendType.type;
    }

    if(!msg.message && !extendType) msg.text = ERROR_MESSAGE;

    await step.context.sendActivity(msg);

    return await step.endDialog({ id: nextAction });
  }
}

module.exports = {
  SendText,
};
