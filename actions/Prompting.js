const {
  ComponentDialog,
  WaterfallDialog,
  TextPrompt,
} = require("botbuilder-dialogs");
const { PROMPTING } = require("../Constant");
const {
  getTranslatedMessage,
  replaceData,
  formatMessage,
} = require("../utils/utils");
const { translate } = require("../services/translate");
const { default: axios } = require("axios");
const { predict } = require("../services/intent");
const { PROXY_DOMAIN } = process.env;
const { ERROR_MESSAGE } = process.env;

const PROMPTING_WATERFALL = "PROMPTING_WATERFALL";
const ASK = "ASK";

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
    const { name, contents, repeat, retry, nextActions, extend } =
      step._info.options;

    console.log(`[Prompting] ${name}`);

    const conversationData = await this.dialog.conversationDataAccessor.get(
      step.context
    );

    const { language, data } = conversationData;

    if (retry) {
      if (repeat <= 0) {
        const nextId =
          nextActions && nextActions.find((e) => e.condition == "otherwise");
        return await step.endDialog({ actionId: nextId && nextId.id });
      }

      const notMatchMsg = getTranslatedMessage(contents, language, retry);

      if (notMatchMsg) {
        await step.context.sendActivity(
          replaceData({ text: notMatchMsg.message, data })
        );
      }
    }

    let msg = getTranslatedMessage(contents, language);

    msg.message = replaceData({ text: msg.message, data });

    if (msg.language != language) {
      msg.message = await translate(msg.message, msg.language, language);
    }

    msg = formatMessage({
      text: msg.message,
      type: msg.type,
      extend,
      conversationData,
    });

    return await step.prompt(ASK, msg);
  }

  async BuiltinValidate(step) {
    const { id, grammarType, repeat } = step._info.options;

    if (grammarType == "intent") return await step.next(step.result);

    const conversationData = await this.dialog.conversationDataAccessor.get(
      step.context
    );
    let answer = { name: "answer", value: step.result, type: "string" };

    //check answer
    conversationData.variables = conversationData.variables.filter(
      (x) => x.name !== "answer"
    );
    conversationData.variables.push(answer);

    if (
      !["yes-no", "number", "email", "phone-number", "number"].includes(
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
        repeat: repeat - 1,
        retry: true,
      });
    }

    conversationData.variables = conversationData.variables.map((d) =>
      d.name === "answer"
        ? { name: "answer", value: userIntent, type: "string" }
        : d
    );

    return await step.endDialog({ checkAction: true });
  }

  async IntentValidate(step) {
    const { name, text, intent, answer, refId, repeat } = step._info.options;

    const conversationData = await this.dialog.conversationDataAccessor.get(
      step.context
    );

    const userIntent = await predict(step.result, intent);

    if (!userIntent) {
      return await step.replaceDialog(PROMPTING_WATERFALL, {
        ...step._info.options,
        repeat: repeat - 1,
        retry: true,
      });
    }

    conversationData.variables[answer] = userIntent;

    return await step.endDialog({ checkAction: true });
  }

  async validateBuiltin(response, type, language) {
    if (type == "yes-no") return await this.checkYesNo(response, language);

    const types = {
      number: !isNaN(response) && response,
      email: (response.match(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      ) || [])[0],
      phonenumber: (response.match(
        /(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/
      ) || [])[0],
    };

    return types[type];
  }

  async checkYesNo(ur, language) {
    if (!ur) return ur;

    let text = ur;

    if (language && !language.startsWith("en")) {
      text = (await translate(ur, language, "en")) || ur;
    }

    text = text.toLowerCase();

    if (
      /\b(?:yes|correct|ok|okay|yep|exactly|1|yeah|uh|right|true|sure|agree|confirm|have)\b/.test(
        text
      )
    ) {
      return "yes";
    }

    if (/\b(?:no|nope|not|2|none|false|disagree)\b/.test(text)) {
      return "no";
    }

    return;
  }
}

module.exports = {
  Prompting,
};
