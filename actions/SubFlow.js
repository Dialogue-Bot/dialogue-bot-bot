const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { SUB_FLOW } = require('../Constant');
const { getTranslatedMessage, replaceData, formatMessage, keyValueToObject } = require('../utils/utils');
const { getFlowByChannelId, getFlowById } = require('../services/proxy');

const SUB_FLOW_WATERFALL = 'SUB_FLOW_WATERFALL';

class SubFlow extends ComponentDialog {
  constructor(dialog) {
    super(SUB_FLOW);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(SUB_FLOW_WATERFALL, [this.GetSubFlow.bind(this)]));
    this.initialDialogId = SUB_FLOW_WATERFALL;
  }

  async GetSubFlow(step) {
    const { flowId, name, nextAction } = step._info.options;

    console.log(`[SubFlow] ${name}`);

    const conversationData = await this.dialog.conversationDataAccessor.get(step.context);

    const { language, data, botId, flow: flows } = conversationData;

    let { flow, settings, attributes } = (await getFlowById(flowId)) || {};

    try {
      if (typeof flow == 'string') flow = JSON.parse(flow);
      if (typeof settings == 'string') settings = JSON.parse(settings);
      if (typeof attributes == 'string') attributes = keyValueToObject(attributes);
    } catch (e) {
      // console.log(e)
    }

    if (flow && flow.length) {
      flows.unshift(flow);
    }

    conversationData.data = { ...data, ...(attributes ? attributes : {}) };
    conversationData.currentFlow = flow;
    conversationData.continueAction = nextAction;

    const firstAction = flow.find((a) => a.type == 'start');

    const nAction = flow.find((a) => a.id == firstAction.nextAction);

    return await step.endDialog({ actionId: nAction.id });
  }
}

module.exports = {
  SubFlow,
};
