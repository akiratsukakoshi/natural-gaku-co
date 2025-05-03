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
  // ループ防止メッセージ送信後、一定時間Bot発言を無視する
  const loopBlockedChannels = new Map<string, number>(); // channelId -> blockUntil timestamp
  // 「静かに！」コマンドで強制ミュート
  const muteChannels = new Map<string, number>(); // channelId -> muteUntil timestamp

  client.on(Events.MessageCreate, async (m: Message) => {
    if (m.author.id === client.user?.id) return;
    // 他Botの発言はignoreBotsで制御
    if (m.author.bot && cfg.bot.ignoreBots) return;

    const now = Date.now();
    const channelId = m.channel.id;
    // 強制ミュート中はBot発言を無視
    if (muteChannels.has(channelId)) {
      const muteUntil = muteChannels.get(channelId)!;
      if (now < muteUntil) return;
      if (now >= muteUntil) muteChannels.delete(channelId);
    }
    // 「静かに！」コマンド検知
    if (!m.author.bot && m.content.includes('静かに！')) {
      muteChannels.set(channelId, now + 10 * 60 * 1000); // 10分間ミュート
      if (
        m.channel instanceof TextChannel ||
        m.channel instanceof NewsChannel ||
        m.channel instanceof ThreadChannel
      ) {
        await m.channel.send('（10分間おとなしくします…）');
      }
      return;
    }
    // ループ防止メッセージ送信後、5分間Bot発言を無視
    if (loopBlockedChannels.has(channelId)) {
      const blockUntil = loopBlockedChannels.get(channelId)!;
      if (now < blockUntil && m.author.bot) return;
      if (now >= blockUntil) loopBlockedChannels.delete(channelId);
    }
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
          // 5分間（300000ms）Bot発言を無視
          loopBlockedChannels.set(channelId, now + 5 * 60 * 1000);
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