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
    const { id, name, assignUserResponse, httpRequest, nextAction } = step._info.options;
    const {url, method, body, headers, params, query} = httpRequest;

    const conversationData = await this.dialog.conversationDataAccessor.get(step.context);

    try {
      let config = {
        method: method,
        url: replaceData({ text: url, data: conversationData.variables }),
        data: replaceObjWithParam(conversationData.variables, keyValueToObject(body) || {}),
        headers: replaceObjWithParam(conversationData.variables, keyValueToObject(headers) || {}),
        params: replaceObjWithParam(conversationData.variables, keyValueToObject(params) || {}),
      };

      console.log(`[HTTP] ${name} ${JSON.stringify(config)}`);

      const { data } = await axios(config);

      if (assignUserResponse) {
        conversationData.variables = conversationData.variables.map((d) =>
          d.name === assignUserResponse
            ? { name: assignUserResponse, value: data, type: typeof data }
            : d
        );
      }
    } catch (e) {
      console.log(`[HTTP] HTTP request failed`, e.message);
      const nextId = nextAction.find((c) => c.case == 'failed');
      return await step.endDialog({ actionId: nextId && nextId.actionId });
    }

    // const nextId = nextAction.find((c) => c.case == 'success');
    return await step.endDialog({ actionId: nextAction });
  }
}

module.exports = {
  HttpRequest,
};
