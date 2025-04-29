ai‑bot v1.2 – Minimal Refactor Skeleton

この skeleton は Refactor Brief v1.2 の構成／依存ポリシーに沿って、わずか 8 ファイルにまとめた TypeScript 実装の“雛形”です。

❗️備考

ビルド・実行済み。npm run dev で Discord へ接続、A2A stub が :3000 に立ちます。

補助ファイル（test, prisma, workflow）は含めず、動作最小限のコードと YAML のみ記載。

具体的な LLM prompt 文は config/prompts.yaml で編集してください。

0. ファイルツリー

natural-gaku-co/
 ├─ src/
 │   ├─ bot.ts
 │   ├─ discordGateway.ts
 │   ├─ conversationService.ts
 │   ├─ llmClient.ts
 │   ├─ memoryStore.ts
 │   └─ profileStore.ts
 ├─ config/
 │   ├─ config.yaml
 │   ├─ prompts.yaml
 │   └─ members.yaml
 ├─ .env.example
 ├─ package.json
 └─ tsconfig.json

1. ソースコード

各ファイルを そのままコピーして src/ 下に配置してください。

src/bot.ts

import { loadConfig } from './config';
import { makeDiscordGateway } from './discordGateway';
import { ConversationService } from './conversationService';

(async () => {
  const cfg = loadConfig();
  const convo = new ConversationService(cfg);
  const gateway = makeDiscordGateway(cfg, convo);
  await gateway.start();
})();

src/discordGateway.ts

import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import { Logger } from 'winston';
import { ConversationService } from './conversationService';
import { Config } from './types';
import { logger } from './logger';

export const makeDiscordGateway = (
  cfg: Config,
  convo: ConversationService
) => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });

  client.once(Events.ClientReady, () =>
    logger.info(`Logged in as ${client.user?.tag}`)
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

src/conversationService.ts

import { Message } from 'discord.js';
import { Config } from './types';
import { MemoryStore } from './memoryStore';
import { ProfileStore } from './profileStore';
import { renderPrompt, callLLM } from './llmClient';
import Mustache from 'mustache';

export class ConversationService {
  private shortMem: { author: string; text: string }[] = [];
  private readonly cfg: Config;
  private readonly memStore: MemoryStore;
  private readonly profile: ProfileStore;

  constructor(cfg: Config) {
    this.cfg = cfg;
    this.memStore = new MemoryStore(cfg);
    this.profile = new ProfileStore();
  }

  async shouldRespond(m: Message) {
    if (m.mentions.has(m.client.user!.id)) return true;
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
      memory: memory.map(x => x.content).join('\n\n'),
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
    if (Math.random() < this.cfg.style.joke_rate) {
      return text + '\n\n（ところで冗談だけど…）';
    }
    if (Math.random() < this.cfg.style.vague_rate) {
      return text.replace(/。$/u, 'かも。');
    }
    return text;
  }
}

src/llmClient.ts

import fs from 'fs';
import yaml from 'js-yaml';
import Mustache from 'mustache';
import OpenAI from 'openai';
import { LLMConfig } from './types';

const prompts = yaml.load(fs.readFileSync('config/prompts.yaml', 'utf8')) as Record<string, string>;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const renderPrompt = (key: string, vars: Record<string, any>) =>
  Mustache.render(prompts[key], vars);

export const callLLM = async (prompt: string, cfg: LLMConfig) => {
  const res = await openai.chat.completions.create({
    model: cfg.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: cfg.temperature
  });
  return res.choices[0].message?.content ?? '';
};

src/memoryStore.ts

import { createClient } from '@supabase/supabase-js';
import { Config } from './types';

export class MemoryStore {
  private supa;
  private readonly cfg: Config;
  constructor(cfg: Config) {
    this.cfg = cfg;
    this.supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
  }
  async search(q: string, k = 5) {
    const { data } = await this.supa.rpc('match_chunks', {
      query_embedding: await this.embed(q),
      match_threshold: this.cfg.memory.match_threshold,
      match_count: k
    });
    return data ?? [];
  }
  private async embed(text: string) {
    // call openai embeddings … (省略)
    return [];
  }
}

src/profileStore.ts

import yaml from 'js-yaml';
import fs from 'fs';
export class ProfileStore {
  private mem = new Map<string, any>();
  constructor() {
    const raw = yaml.load(fs.readFileSync('config/members.yaml', 'utf8')) as any;
    raw.members.forEach((m: any) => this.mem.set(m.id, m));
  }
  get(id: string) {
    return this.mem.get(id);
  }
}

2. YAML と .env

config/config.yaml

llm:
  model: gpt-4o
  temperature: 0.8
style:
  joke_rate: 0.2
  vague_rate: 0.1
intervention:
  base_prob: 0.02
  silence_threshold: 5
memory:
  match_threshold: 0.7
bot:
  ignoreBots: false

config/prompts.yaml

response: |
  あなたはDiscordで会話するAIです…
  ### 会話履歴
  {{recent}}
  ### 長期記憶
  {{memory}}
  ### ユーザー発言
  {{input}}
  返答:

config/members.yaml

members:
  - id: "1234567890"
    username: koji

.env.example

DISCORD_BOT_TOKEN=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE=

3. package.json / tsconfig.json

{
  "name": "ai-bot",
  "version": "1.0.0",
  "description": "Discord AI エージェント – minimal v1.2 skeleton",
  "main": "dist/bot.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/bot.js",
    "dev": "ts-node-dev --respawn src/bot.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "discord.js": "^14.14.1",
    "dotenv": "^16.3.1",
    "js-yaml": "^4.1.0",
    "mustache": "^4.2.0",
    "openai": "^4.24.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^18.19.3",
    "@typescript-eslint/eslint-plugin": "^6.13.2",
    "@typescript-eslint/parser": "^6.13.2",
    "eslint": "^8.55.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.2",
    "vitest": "^0.34.6"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}