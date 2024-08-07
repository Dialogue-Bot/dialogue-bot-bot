const {
  ComponentDialog,
  WaterfallDialog,
  TextPrompt,
} = require('botbuilder-dialogs');
const { PROMPTING } = require('../Constant');
const {
  getPrompt,
  formatMessage,
  getExtendTypeMessage,
} = require('../utils/prompts');
const { replaceData } = require('../utils/utils');
const { translate } = require('../services/translate');
const { predict } = require('../services/intent');
const { CustomActivityTypes } = require('../classes/CustomActivityTypes');
const { ERROR_MESSAGE } = process.env;

const PROMPTING_WATERFALL = 'PROMPTING_WATERFALL';
const ASK = 'ASK';

class Prompting extends ComponentDialog {
  constructor(dialog) {
    super(PROMPTING);
    this.dialog = dialog;

    this.addDialog(new TextPrompt(ASK));

    this.addDialog(
      new WaterfallDialog(PROMPTING_WATERFALL, [
        this.Ask.bind(this),
        this.BuiltinValidate.bind(this),
        this.IntentValidate.bind(this),
      ])
    );
    this.initialDialogId = PROMPTING_WATERFALL;
  }

  async Ask(step) {
    const { name, contents, repeat, retry, nextActions } = step._info.options;

    console.log(`[Prompting] ${name}`);

    const conversationData = await this.dialog.conversationDataAccessor.get(
      step.context
    );

    const { language, variables } = conversationData;

    if (retry) {
      if (repeat <= 0) {
        const nextId =
          nextActions && nextActions.find((e) => e.condition == 'otherwise');
        if (nextId && nextId.id) {
          return await step.endDialog({ actionId: nextId.id });
        }
        await step.context.sendActivity(ERROR_MESSAGE);
        return await step.endDialog();
      }

      const notMatchMsg = getPrompt(contents, language, retry);

      if (notMatchMsg && notMatchMsg.message) {
        notMatchMsg.message = replaceData({
          text: notMatchMsg.message,
          data: variables,
        });

        notMatchMsg.message = await translate(
          notMatchMsg.message,
          notMatchMsg.language,
          language
        );

        await step.context.sendActivity({
          type: CustomActivityTypes.Message,
          text: notMatchMsg.message,
          channelData: {},
        });
      }
    }

    let msg = getPrompt(contents, language);

    msg.message = replaceData({ text: msg.message, data: variables });

    msg.message = await translate(msg.message, msg.language, language);

    msg = formatMessage({
      data: msg.message,
      type: msg.type,
      conversationData,
    });

    const extendType = await getExtendTypeMessage(contents, conversationData);

    if (
      extendType &&
      Array.isArray(extendType.data) &&
      extendType.data.length
    ) {
      msg.channelData.extendData = extendType.data;

      msg.channelData.type = extendType.type;
    }

    await step.context.sendActivity(msg);

    return await step.prompt(ASK, {});
  }

  async BuiltinValidate(step) {
    const { id, grammarType, repeat } = step._info.options;

    if (grammarType == 'intent') return await step.next(step.result);

    const conversationData = await this.dialog.conversationDataAccessor.get(
      step.context
    );

    let answer = { name: 'answer', value: step.result, type: 'string' };

    // assign answer
    conversationData.variables = conversationData.variables.filter(
      (x) => x.name !== 'answer'
    );
    conversationData.variables.push(answer);

    if (
      !['yes-no', 'number', 'email', 'phone-number', 'number'].includes(
        grammarType
      )
    ) {
      console.log(
        `Validate type : ${grammarType} => go check for user response`
      );
      return await step.endDialog({ checkAction: true });
    }

    const userIntent = await this.validateBuiltin(
      step.result,
      grammarType,
      conversationData.language
    );

    if (!userIntent) {
      return await step.replaceDialog(PROMPTING_WATERFALL, {
        ...step._info.options,
        repeat: repeat ? repeat - 1 : 0,
        retry: true,
      });
    }

    conversationData.variables = conversationData.variables.map((d) =>
      d.name === 'answer'
        ? { name: 'answer', value: userIntent, type: 'string' }
        : d
    );

    return await step.endDialog({ checkAction: true });
  }

  async IntentValidate(step) {
    const { trainedData, repeat } = step._info.options;

    const conversationData = await this.dialog.conversationDataAccessor.get(
      step.context
    );

    const { language } = conversationData;

    const userInput = await translate(step.result, language);

    const userIntent = await predict(userInput, trainedData);

    if (!userIntent) {
      return await step.replaceDialog(PROMPTING_WATERFALL, {
        ...step._info.options,
        repeat: repeat ? repeat - 1 : 0,
        retry: true,
      });
    }

    const answer = {
      name: 'answer',
      value: userIntent.intent,
      type: 'string',
      filled: true,
    };

    if (conversationData.variables.find((d) => d.name === 'answer')) {
      conversationData.variables = conversationData.variables.map((d) =>
        d.name === 'answer' ? answer : d
      );
    } else
      conversationData.variables.push(answer);

    return await step.endDialog({ checkAction: true });
  }

  async validateBuiltin(response, type, language) {
    if (type == 'yes-no') return await this.checkYesNo(response, language);

    const types = {
      number: !isNaN(response) && response,
      email: (response.match(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      ) || [])[0],
      'phone-number': (response.match(
        /(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/
      ) || [])[0],
    };

    return types[type];
  }

  async checkYesNo(ur, language) {
    if (!ur) return ur;

    let text = ur;

    if (language && !language.startsWith('en')) {
      text = (await translate(ur, language, 'en')) || ur;
    }

    text = text.toLowerCase();

    if (
      /\b(?:yes|correct|ok|okay|yep|exactly|1|yeah|uh|right|true|sure|agree|confirm|have)\b/.test(
        text
      )
    ) {
      return 'yes';
    }

    if (/\b(?:no|nope|not|2|none|false|disagree)\b/.test(text)) {
      return 'no';
    }

    return;
  }
}

module.exports = {
  Prompting,
};
