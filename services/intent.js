const { default: axios } = require('axios');

const predict = async (prompt, refId) => {
  console.log({
    method: 'POST',
    url: process.env.PROXY_DOMAIN + '/intent/predict',
    data: {
      text: prompt,
      refId: refId,
    },
  });

  try {
    const { data } = await axios({
      method: 'POST',
      url: process.env.PROXY_DOMAIN + '/intent/predict',
      data: {
        text: prompt,
        referenceId: refId,
      },
    });

    if (!data) return;

    return data.data;
  } catch (e) {
    console.log('Predict failed: ' + e.message);
  }
};

module.exports = { predict };
