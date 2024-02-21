const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { REPLACE_ACTION, HTTP_REQUEST } = require('../Constant');
const { replaceData, replaceObjWithParam, keyValueToObject } = require('../utils/utils');
const { default: axios } = require('axios');

const HTTPREQUEST_WATERFALL = 'HTTPREQUEST_WATERFALL';

class HttpRequest extends ComponentDialog {
  constructor(dialog) {
    super(HTTP_REQUEST);
    this.dialog = dialog;
    this.addDialog(new WaterfallDialog(HTTPREQUEST_WATERFALL, [this.HttpRequest.bind(this)]));
    this.initialDialogId = HTTPREQUEST_WATERFALL;
  }

  async HttpRequest(step) {
    const { name, method, url, body, headers, params, response, nextAction, 'body-type': bodyType } = step._info.options;

    const conversationData = await this.dialog.conversationDataAccessor.get(step.context);

    try {
      let config = {
        method: (method && method.toUpperCase()) || 'GET',
        url: replaceData({ text: url, data: conversationData.data }),
        data: replaceObjWithParam(conversationData.data, keyValueToObject(body) || {}),
        headers: replaceObjWithParam(conversationData.data, keyValueToObject(headers) || {}),
        params: replaceObjWithParam(conversationData.data, keyValueToObject(params) || {}),
      };

      console.log(`[HTTP] ${name} ${JSON.stringify(config)}`);

      const { data } = await axios(config);

      if (response) conversationData.data[response] = data;
    } catch (e) {
      console.log(`[HTTP] HTTP request failed`, e.message);
      const nextId = nextAction.find((c) => c.case == 'failed');
      return await step.endDialog({ actionId: nextId && nextId.actionId });
    }

    const nextId = nextAction.find((c) => c.case == 'success');
    return await step.endDialog({ actionId: nextId && nextId.actionId });
  }
}

module.exports = {
  HttpRequest,
};
