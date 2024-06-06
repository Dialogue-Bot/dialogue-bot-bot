const { ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');
const { REPLACE_ACTION, HTTP_REQUEST } = require('../Constant');
const { replaceData, replaceObjWithParam, keyValueToObject, arrayKeyValueToObject } = require('../utils/utils');
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
    const { name, assignUserResponse, httpRequest, nextActions } = step._info.options;
    let {url, method, body, headers, params} = httpRequest;

    const conversationData = await this.dialog.conversationDataAccessor.get(step.context);

    try {
      params = arrayKeyValueToObject(params);
      headers = arrayKeyValueToObject(headers);
      body = arrayKeyValueToObject(body);
      let config = {
        method: method,
        url: replaceData({ text: url, data: conversationData.variables }),
        data: replaceObjWithParam(conversationData.variables, keyValueToObject(body) || body),
        headers: replaceObjWithParam(conversationData.variables, keyValueToObject(headers) || headers),
        params: replaceObjWithParam(conversationData.variables, keyValueToObject(params) || params),
      };

      console.log(`[HTTP] ${name} ${JSON.stringify(config)}`);

      const { data } = await axios(config);

      if (assignUserResponse) {
        conversationData.variables = conversationData.variables.map((d) =>
          d.name === assignUserResponse
            ? { name: assignUserResponse, value: data, type: typeof data, filled: true }
            : d
        );
      }
    } catch (e) {
      console.log(`[HTTP] HTTP request failed`, e.message);
      const nextId = nextActions.find((c) => c.condition == 'failure');
      return await step.endDialog({ actionId: nextId && nextId.id });
    }

    const nextId = nextActions.find((c) => c.condition == 'success');
    return await step.endDialog({ actionId: nextId && nextId.id });
  }
}

module.exports = {
  HttpRequest,
};
