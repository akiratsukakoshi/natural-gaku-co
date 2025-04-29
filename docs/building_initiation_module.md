目的

主体的投げかけ (Initiation) 機能 を実装して Bot に "静かな時間に話題を振る" 振る舞いを追加。

既存の v1.2 ミニマル構成を崩さず、8 ファイル構成 を維持。

タスク一覧

#

作業

ファイル

重要度

1

新規ファイル追加: src/initiator/initiationService.ts

新規

★★★

2

DiscordGateway 返却値に client を追加

src/discordGateway.ts

★★

3

bot 起動時に InitiationService を start

src/bot.ts

★★

4

prompts.yaml に initiation テンプレを追加

config/prompts.yaml

★★

5

config.yaml に initiation セクションが無い場合追記

config/config.yaml

★

6

mustache を dependencies に追加 (未インストールなら)

package.json

★

7

README 更新: initiation 追加手順／設定の説明

README.md

☆

1. src/initiator/initiationService.ts

丸ごと貼り付けて OK

import { Client, TextChannel } from 'discord.js';
import { MemoryStore } from '../memory/memoryStore.js';
import { renderPrompt, callLLM } from '../llmClient.js';
import { ProfileStore } from '../profileStore.js';
import { logger } from '../logger.js';

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
    logger.info(`InitiationService: every ${this.interval / 60000} min`);
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
      logger.info(`Initiation → #${ch.name}`);
      break;
    }
  }

  private async buildVars() {
    const profs = Array.from(this.profiles.all());
    const user = profs[Math.floor(Math.random() * profs.length)] ?? { username: 'みなさん' };
    const mem = await this.mem.search(user.username, 1);
    return { user: user.username, topic: mem[0]?.content ?? '最近の話題' };
  }
}

2. src/discordGateway.ts 変更

-  return {
-    start: () => client.login(process.env.DISCORD_BOT_TOKEN)
-  };
+  return {
+    start: () => client.login(process.env.DISCORD_BOT_TOKEN),
+    client                     // 👈  InitiationService で利用
+  };

3. src/bot.ts 追記

 import { loadConfig } from './config';
 import { makeDiscordGateway } from './discordGateway';
 import { ConversationService } from './conversationService';
+import { InitiationService } from './initiator/initiationService.js';

 (async () => {
   const cfg = loadConfig();
   const convo = new ConversationService(cfg);
   const gateway = makeDiscordGateway(cfg, convo);
+  // ▶ start background initiation
+  new InitiationService(gateway.client, cfg).start();
   await gateway.start();
 })();

4. config/prompts.yaml

initiation: |
  ねえ{{user}}さん、そういえば{{topic}}ってどうなってる？
  気になっちゃって！

テンプレは自由に編集可。

5. config/config.yaml 追記

intervention:
  base_prob: 0.02
  silence_threshold: 5
  interval_minutes: 10   # 👈 新キー

6. 依存追加 (未インストールなら)

npm i mustache --save

7. README 追記例

### Initiation Module
* Bot が静かなチャンネルで **話題を切り出す** 機能です。
* 挙動は `config.yaml` > `intervention.*` と `prompts.yaml` > `initiation` で調整できます。

完了条件 ✅

npm run dev でエラーなく起動し、

Bot が静かなときに 10 分おき ※確率 2 % で投げかけを投稿、

メンション時は従来どおり即時応答。