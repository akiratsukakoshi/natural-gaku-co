import { Message } from 'discord.js';
import { MemoryStore } from '../memory/memoryStore.js';
import { ProfileStore } from '../context/profileStore.js';
import { renderPrompt, callLLM } from '../utils/llmClient.js';

export class ConversationService {
  private shortMem: { author: string; text: string }[] = [];
  private readonly cfg: any;
  private readonly memStore: MemoryStore;
  private readonly profile: ProfileStore;

  constructor(cfg: any) {
    this.cfg = cfg;
    this.memStore = new MemoryStore(cfg);
    this.profile = new ProfileStore();
  }

  async shouldRespond(m: Message) {
    // メンションされた場合
    if (m.mentions.has(m.client.user!.id)) return true;

    // トリガーワードが含まれている場合
    const triggers: string[] = this.cfg.bot.trigger_words || [];
    if (triggers.some(word => m.content.includes(word))) return true;

    // 通常の確率判定
    const act = this.activity(m.channelId);
    const prob = this.cfg.intervention.base_prob + act * 0.02;
    return Math.random() < prob;
  }

  async buildReply(m: Message) {
    this.pushShort(m);
    const memory = await this.memStore.search(m.content, 3);
    const prof = this.profile.get(m.author.id);

    const prompt = renderPrompt('response', {
      input: m.content,
      recent: this.shortMem.map(x => `${x.author}: ${x.text}`).join('\n'),
      memory: memory.map((x: any) => x.content).join('\n\n'),
      user: prof?.username ?? ''
    });

    const raw = await callLLM(prompt, this.cfg.llm);
    return this.applyVariation(raw, prof);
  }

  // --- private helpers ---
  private pushShort(m: Message) {
    this.shortMem.push({ author: m.author.username, text: m.content });
    if (this.shortMem.length > 20) this.shortMem.shift();
  }
  private activity(chanId: string) {
    return this.shortMem.filter(x => x.text && x.author && x.author === chanId).length;
  }
  private applyVariation(text: string, _prof?: any) {
    // if (Math.random() < this.cfg.style.joke_rate) {
    //   return text + '\n\n（ところで冗談だけど…）';
    // }
    if (Math.random() < this.cfg.style.vague_rate) {
      return text.replace(/。$/u, 'かも。');
    }
    return text;
  }
} 