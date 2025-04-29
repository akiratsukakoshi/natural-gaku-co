import { Client, GatewayIntentBits, Events, Message, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
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

  // BOT同士のやり取り回数管理
  const botLoopCounter = new Map<string, { count: number; last: number }>();
  const BOT_LOOP_LIMIT = cfg.bot.bot_loop_limit || 3;
  const BOT_LOOP_RESET_MINUTES = cfg.bot.bot_loop_reset_minutes || 10;

  client.on(Events.MessageCreate, async (m: Message) => {
    if (m.author.id === client.user?.id) return;
    // 他Botの発言はignoreBotsで制御
    if (m.author.bot && cfg.bot.ignoreBots) return;

    const now = Date.now();
    const channelId = m.channel.id;
    const botState = botLoopCounter.get(channelId) || { count: 0, last: 0 };
    // 一定期間経過でカウンターリセット
    if (now - botState.last > BOT_LOOP_RESET_MINUTES * 60 * 1000) {
      botState.count = 0;
    }
    if (m.author.bot) {
      botState.count++;
      botState.last = now;
      botLoopCounter.set(channelId, botState);
      if (botState.count >= BOT_LOOP_LIMIT) {
        if (
          m.channel instanceof TextChannel ||
          m.channel instanceof NewsChannel ||
          m.channel instanceof ThreadChannel
        ) {
          await m.channel.send('ちょっとちょっと、人間の皆さんの意見も聞きたいよー！');
        }
        return;
      }
    } else {
      // 人間の発言でカウンターリセット
      botState.count = 0;
      botState.last = now;
      botLoopCounter.set(channelId, botState);
    }

    if (!(await convo.shouldRespond(m))) return;
    const reply = await convo.buildReply(m);
    if (reply) await m.reply(reply);
  });

  return {
    start: () => client.login(process.env.DISCORD_BOT_TOKEN),
    client
  };
}; 