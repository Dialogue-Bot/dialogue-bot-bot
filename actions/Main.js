const { ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog } = require('botbuilder-dialogs');
const { CustomActivityTypes } = require('../classes/CustomActivityTypes');

const { SEND_TEXT, PROMPTING, SET_DATA, HTTP_REQUEST, SUB_FLOW, CHECK_VARIABLE } = require('../Constant');

const { getFlowByChannelId } = require('../services/proxy');
const { SendText } = require('./SendText');
const { Prompting } = require('./Prompting');
const { endConversation, keyValueToObject } = require('../utils/utils');
const { SetData } = require('./SetData');
const { HttpRequest } = require('./HTTPRequest');
const { SubFlow } = require('./SubFlow');
const { CheckVariable } = require('./CheckVariable');

const CHAT = 'CHAT';

class MainDialog extends ComponentDialog {
  constructor(conversationState, adapter) {
    super(CHAT);

    this.adapter = adapter;
    this.conversationState = conversationState;
    this.conversationDataAccessor = this.conversationState.createProperty('conversationData');
    this.dialogState = conversationState.createProperty('DialogState');
    this.dialogSet = new DialogSet(this.dialogState);
    // this.dialogSet = new DialogSet(this.conversationDataAccessor);
    this.dialogSet.add(this);

    this.addDialog(new SendText(this));
    this.addDialog(new Prompting(this));
    this.addDialog(new SetData(this));
    this.addDialog(new HttpRequest(this));
    this.addDialog(new SubFlow(this));
    this.addDialog(new CheckVariable(this));

    this.addDialog(new WaterfallDialog('Main_Water_Fall', [this.ReadFlow.bind(this)]));

    this.addDialog(new WaterfallDialog('REDIRECT_FLOW', [this.RedirectFlow.bind(this), this.CheckNextFlow.bind(this)]));

    this.initialDialogId = 'Main_Water_Fall';
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

    conversationData.data = {
      ...conversationData.data,
      ...((typeof context.activity.data == 'object' && context.activity.data) || {}),
    };

    return await next();
  }

  async sendTypingIndicator(turnContext, isTyping) {
    const { context } = turnContext;
    const eventActivity = {
      type: isTyping ? CustomActivityTypes.Typing : CustomActivityTypes.StopTyping,
    };
    if (context) return context.sendActivity(eventActivity);
    return await turnContext.sendActivity(eventActivity);
  }

  // get the chat flow step
  async ReadFlow(step) {
    const { recipient, from, channelId } = step.context.activity;
    const { ERROR_MESSAGE } = process.env;

    const conversationData = await this.conversationDataAccessor.get(step.context, {});

    let { flow, settings, attributes } = (await getFlowByChannelId(recipient.id)) || {};

    if (!flow) return await endConversation(step, ERROR_MESSAGE);

    try {
      if (typeof flow == 'string') flow = JSON.parse(flow);
      if (typeof settings == 'string') settings = JSON.parse(settings);
      if (typeof attributes == 'string') attributes = keyValueToObject(attributes);
    } catch (e) {
      // console.log(e)
    }

    const language = settings && settings.find((e) => e.default);

    conversationData.language = (language && language.value) || 'en';
    conversationData.flow = [flow];
    conversationData.currentFlow = flow;
    conversationData.data = { ...attributes };
    conversationData.sender = from.id;
    conversationData.channelId = channelId;
    conversationData.botId = recipient.id;

    const firstAction = flow.find((a) => a && a.type == 'start');

    if (!firstAction) return await step.context.sendActivity(ERROR_MESSAGE);

    const nextAction = flow.find((a) => a.id == firstAction.nextAction);

    return await step.replaceDialog('REDIRECT_FLOW', { ...nextAction });
  }

  async RedirectFlow(step) {
    console.log('--------------------------------------------------------------------');

    const { type } = step._info.options;

    const types = {
      message: SEND_TEXT,
      promptandcollect: PROMPTING,
      setattribute: SET_DATA,
      http: HTTP_REQUEST,
      subflow: SUB_FLOW,
      checkattribute: CHECK_VARIABLE,
    };

    if (!types[type]) {
      console.log('Can can not find next action type => end dialog');
      return await endConversation(step);
    }

    return await step.beginDialog(types[type], step._info.options);
  }

  async CheckNextFlow(step) {
    const { nextAction: id, answer, nextAction: actions, attribute } = step._info.options;
    const { checkAction, actionId } = step.result;
    const conversationData = await this.conversationDataAccessor.get(step.context);

    const { currentFlow, flow, continueAction } = conversationData;

    let nextAction;

    if (checkAction) {
      const Case = this.GetNextAction({
        attribute: answer || (attribute && attribute.label) || attribute,
        actions,
        data: conversationData.data,
      });
      nextAction = currentFlow.find((a) => a.id == (Case && Case.actionId));

      if (nextAction && Case) {
        console.log(`${answer} Pass case option : ${Case.case}`);
      }

      if (!nextAction) {
        const OtherCase = actions.find((c) => c.case == 'other');

        nextAction = currentFlow.find((a) => a.id == (OtherCase && OtherCase.actionId));
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

      nextAction = conversationData.currentFlow.find((a) => a.id == continueAction);
    }

    return await step.replaceDialog('REDIRECT_FLOW', nextAction);
  }

  GetNextAction({ attribute, actions, data }) {
    if (!Array.isArray(actions)) return;

    const checkData = data[attribute];

    for (let Case of actions) {
      if (!Case) return;

      const { case: condition } = Case;
      const options = condition && condition.split(':');

      if (!options || !options.length) continue;

      const option = options[0] && options[0].trim();
      const value = options[1] && options[1].trim();

      switch (option) {
        case 'Empty':
          if (typeof checkData == 'object') {
            if (value == 'true' && !Object.keys(checkData).length) return Case;
            if (value == 'false' && Object.keys(checkData).length) return Case;
          }
          if ((typeof checkData == 'string' || typeof checkData == 'array') && checkData.length) {
            return Case;
          }
          continue;
        case 'Equal':
          if (checkData == value) return Case;
          if (typeof checkData == 'string' && checkData.toLocaleLowerCase() == value.toLocaleLowerCase()) return Case;
          continue;
        case 'Not equal':
          if (checkData != value) return Case;
          continue;
        case 'Is less than':
          if (parseInt(checkData) < parseInt(value)) return Case;
          continue;
        case 'Is less than or equal':
          if (parseInt(checkData) <= parseInt(value)) return Case;
          continue;
        case 'Is greater than':
          if (parseInt(checkData) > parseInt(value)) return Case;
          continue;
        case 'Is greater than or equal':
          if (parseInt(checkData) >= parseInt(value)) return Case;
          continue;
        case 'Starts with':
          if (typeof checkData === 'string' && checkData.startsWith(value)) return Case;
          continue;
        case 'Ends with':
          if (typeof checkData === 'string' && checkData.endsWith(value)) return Case;
          continue;
        case 'Contains with':
          if (typeof checkData === 'string' && checkData.includes(value)) return Case;
          continue;
        case 'Exist':
          if (value == 'true' && checkData) return Case;
          if (value == 'false' && !checkData) return Case;
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
