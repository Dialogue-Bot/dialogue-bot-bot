const endConversation = async (step, message) => {
  if (message) await step.context.sendActivity(message);
  if (step.parent && typeof step.parent.cancelAllDialogs == 'function')
    await step.parent.cancelAllDialogs();
  if (typeof step.cancelAllDialogs == 'function') await step.cancelAllDialogs();

  return await step.endDialog();
};

const replaceData = ({ text, data }) => {
  if (!data || !text) return text;

  try {
    text = text.replace(
      /{([a-zA-Z0-9_ ]+(?:->[a-zA-Z0-9_ ]+)*)}/g,
      (match, key) => {
        const keys = key.split('->');
        let value =
          data.find((item) => item.name === keys[0]).value || undefined;

        if (keys.length <= 1) return typeof value === 'object' ? JSON.stringify(value) : value;

        return (
          keys
            .slice(1)
            .reduce(
              (acc, curr) => (value ? (value = value[curr]) : undefined),
              value
            ) || undefined
        );
      }
    );

    text = text.replace(/{cal\((.*?)\)}/g, (match, expression) => {
      try {
        const result = eval(expression);
        return result;
      } catch (error) {
        console.error('Invalid expression:', expression);
        return match; // Return the original placeholder if there's an error in the expression
      }
    });

    if (/{([a-zA-Z0-9_ ]+(?:->[a-zA-Z0-9_ ]+)*)}/g.test(text))
      return replaceData({ text, data });
    return text;
  } catch (e) {
    console.log(e);
  }

  return text;
};

const accessProp = (path, object) => {
  return path.split('->').reduce((o, i) => o[i], object);
};

const replaceObjWithParam = (conversationData, obj) => {
  if (!conversationData || !obj) return {};

  const arr = Object.keys(obj);

  try {
    for (let key of arr) {
      if (obj[key] && typeof obj[key] == 'string') {
        obj[key] = replaceData({ text: obj[key], data: conversationData });
      }
    }
  } catch (e) {
    return {};
  }

  return obj;
};

const keyValueToObject = (data) => {
  if (!data || !!data) return {};
  let result = {};
  try {
    const temp = JSON.parse(data);

    if (!Array.isArray(temp)) return {};

    temp.forEach((e) => {
      result[e.label] = e.value;
    });
  } catch (e) {
    console.log(`keyValueToObject - Can not parse string`);
    console.log(e.stack);
  }

  return result;
};

const arrayKeyValueToObject = (array) => {
  if (!Array.isArray(array) || !array.length) return {};
  let result = {};
  try {
    array.forEach((e) => {
      result[e.key] = e.value;
    });
  } catch (e) {
    console.log(`ArrayKeyValueToObject - Can not replace`);
    console.log(e.stack);
  }

  return result;
};

const replaceSubFlowValueAssigned = (variables, subFlowOutput) => {
  try {
    subFlowOutput.forEach((s) => {
      const value =
        variables.find((v) => v.name === s.outputVar)?.value || null;
      let findVar = variables.find((v) => v.name === s.assignTo);

      if (value && findVar) {
        findVar.value = value;
      }

      // remove subflow var in conversationData variables
      variables = variables.filter((v) => v.name !== s.outputVar);
    });
  } catch (e) {
    console.log(
      '[replaceSubFlowValueAssigned] Can not assign value of variables in subflow to mainflow ' +
        e.message
    );
  }

  return variables;
};

module.exports = {
  endConversation,
  replaceData,
  replaceObjWithParam,
  keyValueToObject,
  arrayKeyValueToObject,
  replaceSubFlowValueAssigned,
};
