# natural-gaku-co

## 概要

**natural-gaku-co** は、Discordサーバー上で自然な会話・話題提供を行うAIエージェントです。短期・長期記憶を統合し、個別プロファイルやスタイル揺らぎ、主体的な投げかけなど多彩な応答を実現します。

- TypeScript/Node.js (ESM)
- Discord.js v14
- OpenAI GPT-4o API
- Supabase (pgvector) による長期記憶
- n8nによるETL連携
- 設定・プロファイルはYAML管理

## ディレクトリ構成

```
natural-gaku-co/
 ├─ src/
 │   ├─ discord/      … Discordクライアント
 │   ├─ context/      … プロファイル管理
 │   ├─ memory/       … Supabase RAG I/F
 │   ├─ responder/    … 応答ロジック
 │   ├─ initiator/    … 自発発話モジュール
 │   └─ utils/        … ユーティリティ
 ├─ config/
 │   ├─ config.yaml   … 設定
 │   ├─ prompts.yaml  … プロンプト
 │   └─ members.yaml  … 参加者プロファイル
 ├─ workflows/        … n8nワークフロー
 ├─ .env.example      … 環境変数サンプル
 ├─ package.json
 ├─ tsconfig.json
 └─ README.md
```

## セットアップ

1. **依存パッケージのインストール**

```bash
npm install
```

2. **環境変数ファイルの作成**

`.env.example` をコピーして `.env` を作成し、各種APIキーやURLを記入してください。

```
cp .env.example .env
# .env を編集
```

3. **設定ファイルの編集**

- `config/config.yaml` … LLMモデル・温度・確率・Bot設定など
- `config/prompts.yaml` … LLM用プロンプト
- `config/members.yaml` … 参加者プロファイル（初回は `config/members.example.yaml` をコピーして作成してください）

```bash
cp config/members.example.yaml config/members.yaml
# members.yaml を編集
```

4. **ビルド・起動**

```bash
npm run build
npm start
# または開発用ホットリロード
npm run dev
```

## 主な機能

- **ユーザー応答**: 短期メモリ＋長期記憶（Supabase RAG）を用いた返答
- **プロファイル学習**: 発話から興味タグ・口調を更新、YAMLと同期
- **スタイル揺らぎ**: ジョーク・曖昧回答など確率制御
- **介入判定**: 盛り上がり度×ランダムで応答頻度を変動
- **主体的投げかけ**: 静かなときに長期記憶を引き合いに低頻度で質問
- **長期記憶ETL**: n8nワークフローで日次バッチ処理→Supabase格納
- **Bot⇄Botスイッチ**: 他Botとのループ防止
- **参加者YAML管理**: 起動時ロード・新規参加は自動追記
- **A2A連携土台**: agent.json公開・将来のRPC受け口stub

## config/config.yaml パラメータ解説

| セクション / キー                | 役割                                 | 設定範囲・型         | 目安値         | 補足・説明                                           |
|:---------------------------------|:-------------------------------------|:---------------------|:---------------|:-----------------------------------------------------|
| `llm.model`                      | LLMのモデル名                        | 文字列               | gpt-4o / gpt-4-turbo など | OpenAI APIで有効なモデルID                           |
| `llm.temperature`                | 応答の"揺らぎ"強さ                   | 0 – 2 (float)        | 0.8            | 0: ほぼ決定論的 / 1.0: 標準 / 1.2以上: ランダム多め  |
| `style.joke_rate`                | 冗談を差し込む確率                   | 0 – 1                | 0.2 (20%)      | 0ならジョーク無効                                    |
| `style.vague_rate`               | 曖昧表現へ変換する確率               | 0 – 1                | 0.1            | 断定を「かも」などに置換                             |
| `intervention.base_prob`         | "普通のメッセージ"に反応する初期確率 | 0 – 1                | 0.02 (2%)      | メンション時は必ず応答                               |
| `intervention.silence_threshold` | 「静か」とみなす直近メッセージ数     | 整数 (≥0)            | 5              | この値以下だとbase_probがそのまま適用                |
| `memory.match_threshold`         | 長期記憶検索の類似度しきい値         | 0 – 1                | 0.7            | 1に近いほど厳密、0に近いほど広くヒット               |
| `bot.ignoreBots`                 | 他Botの発言を無視するか              | true / false         | false          | trueにするとBot同士の無限ループを防止               |

---

### 推奨チューニングフロー

- **温度（temperature）**  
  文章の堅さを調整。0.6～1.0に収めると安定。
- **base_prob**  
  会話が静かすぎる場合は+0.01～+0.03上げる。
- **joke_rate**  
  ジョークが多すぎる/少なすぎる場合は0.05刻みで調整。
- **match_threshold**  
  長期記憶がノイズ気味なら0.75～0.8へ上げる。

> **編集後はBotを再起動して設定を反映させてください。**

## 技術スタック

- Node.js 18+ / TypeScript (ESM)
- discord.js v14
- OpenAI GPT-4o
- Supabase (pgvector)
- n8n (ETL)
- dotenv, yaml
- vitest（テスト）

## 注意事項
- OpenAI/Supabase/DiscordのAPIキーが必要です。
- n8nワークフローやSupabaseスキーマは `docs/requirement.md` を参照してください。

---

ご質問・要望はIssueまたは開発者まで！

---

### Initiation Module（主体的投げかけ機能）

- Botが静かなチャンネルで**話題を切り出す**自発的な投げかけ機能です。
- 挙動は `config.yaml` の `intervention.*` と `prompts.yaml` の `initiation` テンプレートで調整できます。
- 10分ごと（デフォルト）に、静かなチャンネルで2%の確率で話題を投げかけます。
- メンション時は従来通り即時応答します。

---

## ボット同士のループ防止機能

本Botは、**他のBotとの無限ループを防止する機能**を備えています。

### 機能概要
- Bot同士のやり取りが一定回数（N回）続いた場合、自動的に会話を打ち切り、人間ユーザーに話題を振ります。
- N回の上限やリセット間隔は `config/config.yaml` で柔軟に設定可能です。
- 一定期間（分単位）経過後、カウンターは自動リセットされます。

### 設定方法
`config/config.yaml` の `bot` セクションで以下のパラメータを設定してください。

```yaml
bot:
  ignoreBots: false  # 他Botの発言も受け付ける場合はfalse
  bot_loop_limit: 3  # Bot同士のやり取り上限回数（例: 3回）
  bot_loop_reset_minutes: 60  # カウンターリセット間隔（分）
```

### 動作例
- Bot同士の会話が `bot_loop_limit` 回続くと、
  - 「ちょっとちょっと、人間の皆さんの意見も聞きたいよー！」と発言し、以降はBot同士の会話を一時停止します。
- `bot_loop_reset_minutes` で指定した時間が経過すると、カウンターがリセットされ、再びBot同士の会話が可能になります。
- 人間ユーザーが発言した場合もカウンターはリセットされます。

### 注意
- `ignoreBots: true` に設定すると、他Botの発言自体に反応しなくなり、ループ防止機能は動作しません。
- Bot同士のやり取りを楽しみつつ、無限ループを防ぎたい場合は `ignoreBots: false` とし、上記パラメータを調整してください。

---

## 環境変数例

.env で管理する主な値:

```
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE=...
INITIATION_CHANNEL_IDS=1353687394401910797,1364622450918424576 # initiationServiceで投げかけを行うチャンネルID（カンマ区切り）
```

- `INITIATION_CHANNEL_IDS` は **主体的投げかけ（initiationService）専用** のチャンネルIDリストです。
- 通常のBot応答は全チャンネルで行われます。
- チャンネルIDをgit管理したくない場合は、config.yamlのchannelsは空配列にし、.envで管理してください。

--- 