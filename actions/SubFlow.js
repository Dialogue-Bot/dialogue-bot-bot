const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { SUB_FLOW } = require('../Constant');
const { keyValueToObject } = require('../utils/utils');
const { getFlowById } = require('../services/proxy');
const { ERROR_MESSAGE } = process.env;

const SUB_FLOW_WATERFALL = 'SUB_FLOW_WATERFALL';

class SubFlow extends ComponentDialog {
  constructor(dialog) {
    super(SUB_FLOW);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(SUB_FLOW_WATERFALL, [this.GetSubFlow.bind(this)]));
    this.initialDialogId = SUB_FLOW_WATERFALL;
  }

  async GetSubFlow(step) {
    let { name, nextAction, subFlowId, assignVars } = step._info.options;

    console.log(`[SubFlow] ${name}`);

    const conversationData = await this.dialog.conversationDataAccessor.get(step.context);

    const {flow, testBot } = conversationData;

    let { flows, settings, variables } = (await getFlowById(subFlowId, testBot)) || {};

    if (!flows) return await endConversation(step, ERROR_MESSAGE);

    try {
      if (typeof flows == 'string') flows = JSON.parse(flows);
      if (typeof settings == 'string') settings = JSON.parse(settings);
      if (typeof variables == 'string') variables = keyValueToObject(variables);
    } catch (e) {
      // console.log(e)
    }

    if (flow && flow.length) {
      flow.unshift(flows);
    }

    variables = variables.filter(v => v.name !== 'language');
    conversationData.variables = [ ...conversationData.variables, ...(variables ? variables : {}) ];
    conversationData.subFlowOutput = assignVars || [];
    conversationData.currentFlow = flows;
    conversationData.continueAction = nextAction;

    const firstAction = flows.find((a) => a.action == 'start');
    
    if (!firstAction) return await step.context.sendActivity(ERROR_MESSAGE);

    nextAction = flows.find((a) => a.id == firstAction.nextAction);

    return await step.endDialog({ actionId: nextAction.id });
  }
}

module.exports = {
  SubFlow,
};
