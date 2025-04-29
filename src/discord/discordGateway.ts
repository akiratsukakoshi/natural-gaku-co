import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import { ConversationService } from '../responder/conversationService';

export const makeDiscordGateway = (
  cfg: any,
  convo: ConversationService
) => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });

  client.once(Events.ClientReady, () =>
    console.log(`Logged in as ${client.user?.tag}`)
  );

  client.on(Events.MessageCreate, async (m: Message) => {
    if (m.author.bot && cfg.bot.ignoreBots) return;
    if (!(await convo.shouldRespond(m))) return;
    const reply = await convo.buildReply(m);
    if (reply) await m.reply(reply);
  });

  return {
    start: () => client.login(process.env.DISCORD_BOT_TOKEN)
  };
}; 