const { ComponentDialog, WaterfallDialog } = require("botbuilder-dialogs");
const { SEND_MAIL } = require("../Constant");
const { botSendMail } = require("../services/proxy");
const { replaceData } = require("../utils/utils");
const SENDMAIL_WATERFALL = "SENDMAIL_WATERFALL";

class SendMail extends ComponentDialog {
  constructor(dialog) {
    super(SEND_MAIL);
    this.dialog = dialog;
    this.addDialog(
      new WaterfallDialog(SENDMAIL_WATERFALL, [this.SendMail.bind(this)])
    );
    this.initialDialogId = SENDMAIL_WATERFALL;
  }

  async SendMail(step) {
    const { name, nextAction, sendMail } = step._info.options;

    console.log(`[SendMail] Action ${name}`);

    const conversationData = await this.dialog.conversationDataAccessor.get(
      step.context
    );
    const { botId } = conversationData;
    let { to, body, subject } = sendMail;
    
    to = replaceData({ text: to, data: conversationData.variables });
    body = replaceData({ text: body, data: conversationData.variables });
    subject = replaceData({ text: subject, data: conversationData.variables });

    await botSendMail(to, subject, body, botId);

    return await step.endDialog({ actionId: nextAction });
  }
}

module.exports = {
  SendMail,
};
