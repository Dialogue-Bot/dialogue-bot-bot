require('dotenv').config();
require('./utils/logger');

const app = require('express')();
const bodyParser = require('body-parser');
const { adapter, bot } = require('./bot');

app.use(bodyParser.json());

app.post('/api/messages', async (req, res) => {
  adapter.processActivity(req, res, async (context) => await bot.run(context));
});

app.listen(3978, () => {
  console.log(`Server is listening on port: 3978`);
});
