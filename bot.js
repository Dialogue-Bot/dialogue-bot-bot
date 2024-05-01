const { ActivityHandler, ActivityTypes } = require('botbuilder');
const { ConversationState, MemoryStorage, UserState } = require('botbuilder');

const CustomAdapter = require('./classes/CustomAdapter');
const { MainDialog } = require('./actions/Main');
const { predict } = require('./services/intent');
const { CustomActivityTypes } = require('./classes/CustomActivityTypes');

const { REFERENCE_ID_CONNECT_AGENT } = process.env;

class DialogBot extends ActivityHandler {
  constructor(conversationState, userState, dialog) {
    super();
    if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
    if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
    if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');

    this.userState = userState;
    this.dialog = dialog;
    this.conversationState = conversationState;
    this.dialogState = this.conversationState.createProperty('DialogState');

    this.onEvent(async (context, next) => {
      console.log(`Receive event from ${context.activity.from.id} - ${context.activity.typeName}`);
      await this.dialog.handleEvent(context);
      await next();
    });

    this.onTurn(async (context, next) => {
      try {
        context.onSendActivities(async (ctx, activities, next) => {
          const modifiedActivities = activities.map(async (activity) => {
            if (activity.type === ActivityTypes.Message) {
              console.log(`Bot sent message: ${activity.text || JSON.stringify(activity.channelData)}`);
            }

          });

          if (!ctx.responded && ctx.activity.type === ActivityTypes.Message) {
            if (context.activity.text) {
              if(context.activity.isConnectAgent) {
                console.log(`User ${context.activity.from.id} connect agent`);
                context.activity.typeName = 'endConversation';
                await this.dialog.handleEventEndConversation(context)
              }
              else {
                console.log(`User message: ${context.activity.text}`)
              }
            }

            if (ctx.activity.data) {
              await this.dialog.savePayload(ctx, next);
            }
          }

          await next().then(() => modifiedActivities);
        });
        await next();
      } catch (e) {
        console.log('Error occurred while running flow: ' + e.message);
        console.error((e.error && e.error.stack) || e.stack);
      }
    });

    this.onMessage(async (context, next) => {
      // if (context.activity.type === ActivityTypes.Message && context.activity.text && context.activity.channelId === 'WEB') {
      //   const predictConnAgent = await predict(context.activity.text, REFERENCE_ID_CONNECT_AGENT);
      //   if (predictConnAgent) {
      //     context.activity.isConnectAgent = true;
      //     await mainDialog.sendTypingIndicator(context, true);
      //     await context.sendActivity({ type: CustomActivityTypes.ConnectAgent, text: predictConnAgent.answer });
      //     return mainDialog.sendTypingIndicator(context, false);
      //   }
      // } 
      if (await mainDialog.predictConnectAgentWEB(context)) return;

      // Run the Dialog with the new message Activity.
      await this.dialog.run(context, this.dialogState);
      await mainDialog.sendTypingIndicator(context, false);
      await next();
    });
  }

  async run(context) {
    await super.run(context);

    // Save any state changes. The load happened during the execution of the Dialog.
    await this.conversationState.saveChanges(context, false);
    await this.userState.saveChanges(context, false);
  }
}

var adapter = new CustomAdapter({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
});

const memoryStorage = new MemoryStorage();

// Create conversation state with in-memory storage provider.
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
const mainDialog = new MainDialog(conversationState, adapter);
const bot = new DialogBot(conversationState, userState, mainDialog);

module.exports = {
  bot,
  adapter,
};
