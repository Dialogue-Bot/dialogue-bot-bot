const {
  ComponentDialog,
  DialogSet,
  DialogTurnStatus,
  WaterfallDialog,
} = require("botbuilder-dialogs");
const { CustomActivityTypes } = require("../classes/CustomActivityTypes");

const {
  SEND_TEXT,
  PROMPTING,
  SET_DATA,
  HTTP_REQUEST,
  SUB_FLOW,
  CHECK_VARIABLE,
} = require("../Constant");

const { getFlowByChannelId } = require("../services/proxy");
const { SendText } = require("./SendText");
const { Prompting } = require("./Prompting");
const { endConversation, keyValueToObject } = require("../utils/utils");
const { SetData } = require("./SetData");
const { HttpRequest } = require("./HTTPRequest");
const { SubFlow } = require("./SubFlow");
const { CheckVariable } = require("./CheckVariable");

const CHAT = "CHAT";

class MainDialog extends ComponentDialog {
  constructor(conversationState, adapter) {
    super(CHAT);

    this.adapter = adapter;
    this.conversationState = conversationState;
    this.conversationDataAccessor =
    this.conversationState.createProperty("conversationData");
    this.dialogState = conversationState.createProperty("DialogState");
    this.dialogSet = new DialogSet(this.dialogState);
    // this.dialogSet = new DialogSet(this.conversationDataAccessor);
    this.dialogSet.add(this);

    this.addDialog(new SendText(this));
    this.addDialog(new Prompting(this));
    this.addDialog(new SetData(this));
    this.addDialog(new HttpRequest(this));
    this.addDialog(new SubFlow(this));
    this.addDialog(new CheckVariable(this));

    this.addDialog(
      new WaterfallDialog("Main_Water_Fall", [this.ReadFlow.bind(this)])
    );

    this.addDialog(
      new WaterfallDialog("REDIRECT_FLOW", [
        this.RedirectFlow.bind(this),
        this.CheckNextFlow.bind(this),
      ])
    );

    this.initialDialogId = "Main_Water_Fall";
  }

  async run(turnContext, accessor) {
    const dialogContext = await this.dialogSet.createContext(turnContext);

    await this.sendTypingIndicator(turnContext, true);

    const results = await dialogContext.continueDialog();

    if (results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  async savePayload(context, next) {
    const conversationData = await this.conversationDataAccessor.get(context);

    if (!conversationData) return await next();

    conversationData.variables = {
      ...conversationData.variables,
      ...((typeof context.activity.data == "object" && context.activity.data) ||
        {}),
    };

    return await next();
  }

  async handleEvent(context) {
    const { activity } = context;
    try {
      switch (activity.typeName) {
        case 'endConversation':
          await this.handleEventEndConversation(context);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error(`Handle event ${context.activity.name} error : ${e.message}`);
      console.error(e.stack);
    }
  }

  async handleEventEndConversation(turnContext) {
    const dialogContext = await this.dialogSet.createContext(turnContext);

    if (turnContext.activity.typeName == 'endConversation') {

      console.log(`[Main] - Run function - handel ${turnContext.activity.typeName} event => end conv`);
      return await endConversation(dialogContext);
    }
  }

  async sendTypingIndicator(turnContext, isTyping) {
    const { context } = turnContext;
    const eventActivity = {
      type: isTyping
        ? CustomActivityTypes.Typing
        : CustomActivityTypes.StopTyping,
    };
    if (context) return context.sendActivity(eventActivity);
    return await turnContext.sendActivity(eventActivity);
  }

  // get the chat flow step
  async ReadFlow(step) {
    const { recipient, from, channelId, testBot } = step.context.activity;
    const { ERROR_MESSAGE } = process.env;

    const conversationData = await this.conversationDataAccessor.get(
      step.context,
      {}
    );

    let { flows, settings, variables } =
      (await getFlowByChannelId(recipient.id, testBot)) || {};

    if (!flows) return await endConversation(step, ERROR_MESSAGE);

    try {
      if (typeof flows == "string") flows = JSON.parse(flows);
      if (typeof settings == "string") settings = JSON.parse(settings);
      if (typeof attributes == "string")
        attributes = keyValueToObject(attributes);
    } catch (e) {
      // console.log(e)
    }

    const language =
      settings && settings.find((e) => e.default && e.type === "language");

    conversationData.language = (language && language.value) || "en";
    conversationData.flow = [flows];
    conversationData.currentFlow = flows;
    conversationData.variables = variables;
    conversationData.sender = from.id;
    conversationData.channelId = channelId;
    conversationData.botId = recipient.id;
    conversationData.testBot = testBot || false;

    const firstAction = flows.find((a) => a && a.action == "start");

    if (!firstAction) return await step.context.sendActivity(ERROR_MESSAGE);

    const nextAction = flows.find((a) => a.id == firstAction.nextAction);

    return await step.replaceDialog("REDIRECT_FLOW", { ...nextAction });
  }

  async RedirectFlow(step) {
    console.log(
      "--------------------------------------------------------------------"
    );

    const { action } = step._info.options;

    const actions = {
      message: SEND_TEXT,
      "prompt-and-collect": PROMPTING,
      "http-request": HTTP_REQUEST,
      "sub-flow": SUB_FLOW,
      "check-variables": CHECK_VARIABLE,
    };

    if (!actions[action]) {
      console.log("Can can not find next action type => end dialog");
      return await endConversation(step);
    }

    return await step.beginDialog(actions[action], step._info.options);
  }

  async CheckNextFlow(step) {
    const {
      nextAction: id,
      nextActions,
      assignUserResponse,
    } = step._info.options;
    const { checkAction, actionId } = step.result;
    const conversationData = await this.conversationDataAccessor.get(
      step.context
    );

    const { currentFlow, continueAction } = conversationData;
    
    if (assignUserResponse) {
      let findVar = conversationData.variables.find(
        (x) => x.name === assignUserResponse
      );
      const value = conversationData.variables.find(x=> x.name === 'answer')?.value;
      if (findVar && value) {
        findVar.value = value;
      }
      if(assignUserResponse === 'language' && ['en', 'vi'].includes(value)) conversationData[assignUserResponse] = value;
    }

    let nextAction;

    if (checkAction) {
      const Case = this.GetNextAction({
        attribute: assignUserResponse || "answer",
        actions: nextActions || [],
        data: conversationData.variables,
      });
      nextAction = currentFlow.find((a) => a.id == (Case && Case.id));

      if (nextAction && Case) {
        console.log(`Pass case option : ${Case.condition}`);
      }

      if (!nextAction) {
        const OtherCase = nextActions && nextActions.find((c) => c.condition == "otherwise");

        nextAction = currentFlow.find(
          (a) => a.id == (OtherCase && OtherCase.id)
        );
      }
    } else {
      nextAction = currentFlow.find((a) => a.id == (actionId || id));
    }

    if (!nextAction) {
      conversationData.flow.shift();

      if (conversationData.flow.length) {
        conversationData.currentFlow = conversationData.flow[0];
      } else {
        conversationData.currentFlow = [];
      }

      nextAction = conversationData.currentFlow.find(
        (a) => a.id == continueAction
      );
    }

    return await step.replaceDialog("REDIRECT_FLOW", nextAction);
  }

  GetNextAction({ attribute, actions, data }) {
    if (!Array.isArray(actions)) return;

    const checkData = data.find((x) => x.name === attribute).value;

    for (let Case of actions) {
      if (!Case) return;

      const { condition, value, id } = Case;

      switch (condition) {
        case "empty":
          if (typeof checkData == "object") {
            if (value == "true" && !Object.keys(checkData).length) return Case;
            if (value == "false" && Object.keys(checkData).length) return Case;
          }
          if (
            (typeof checkData == "string" || typeof checkData == "array") &&
            checkData.length
          ) {
            return Case;
          }
          continue;
        case "equal":
          if (checkData == value) return Case;
          if (
            typeof checkData == "string" &&
            checkData.toLocaleLowerCase() == value.toLocaleLowerCase()
          )
            return Case;
          continue;
        case "not_equal":
          if (checkData.toLocaleLowerCase() != value.toLocaleLowerCase()) return Case;
          continue;
        case "less_than":
          if (parseInt(checkData) < parseInt(value)) return Case;
          continue;
        case "less_than_or_equal":
          if (parseInt(checkData) <= parseInt(value)) return Case;
          continue;
        case "greater_than":
          if (parseInt(checkData) > parseInt(value)) return Case;
          continue;
        case "greater_than_or_equal":
          if (parseInt(checkData) >= parseInt(value)) return Case;
          continue;
        case "Starts with":
          if (typeof checkData === "string" && checkData.startsWith(value))
            return Case;
          continue;
        case "Ends with":
          if (typeof checkData === "string" && checkData.endsWith(value))
            return Case;
          continue;
        case "contains":
          if (typeof checkData === "string" && checkData.includes(value))
            return Case;
          continue;
        case "exist":
          if (value && checkData) return Case;
          if (!value && !checkData) return Case;
          continue;
        default:
          continue;
      }
    }
  }
}

module.exports = {
  MainDialog,
  CHAT,
};
