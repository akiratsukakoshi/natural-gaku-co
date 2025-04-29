import { Client, TextChannel } from 'discord.js';
import { MemoryStore } from '../memory/memoryStore.js';
import { renderPrompt, callLLM } from '../utils/llmClient.js';
import { ProfileStore } from '../context/profileStore.js';

export class InitiationService {
  private timer: NodeJS.Timeout | null = null;
  private mem: MemoryStore;
  private profiles: ProfileStore;
  private interval: number;

  constructor(private client: Client, private cfg: any) {
    this.mem = new MemoryStore(cfg);
    this.profiles = new ProfileStore();
    this.interval = (cfg.intervention?.interval_minutes || 10) * 60 * 1000;
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick().catch(console.error), this.interval);
    console.log(`InitiationService: every ${this.interval / 60000} min`);
  }

  private async tick() {
    const chans = this.client.channels.cache.filter(
      (c): c is TextChannel => c.isTextBased() && c.type === 0
    );
    const candidates = [...chans.values()].sort(() => Math.random() - 0.5);

    for (const ch of candidates) {
      const recent = await ch.messages.fetch({ limit: 30 });
      const active = recent.filter(m => Date.now() - m.createdTimestamp < 10 * 60 * 1000).size;
      if (active > this.cfg.intervention.silence_threshold) continue;
      if (Math.random() > this.cfg.intervention.base_prob) continue;

      const promptVars = await this.buildVars();
      const text = await callLLM(renderPrompt('initiation', promptVars), this.cfg.llm);
      await ch.send(text);
      console.log(`Initiation → #${ch.name}`);
      break;
    }
  }

  private async buildVars() {
    const profs = this.profiles.all();
    const user = profs[Math.floor(Math.random() * profs.length)] ?? { username: 'みなさん' };
    const name = user.callname || user.username || 'みなさん';
    const mem = await this.mem.search(user.username, 1);
    return { user: name, topic: mem[0]?.content ?? '最近の話題' };
  }
} 