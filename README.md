# natural-gaku-co — Discord AIエージェント V2

## 概要

**natural-gaku-co** は、Discordサーバー上で「ルームルールに従い、文脈・記憶・キャラクター性を活かした自然な会話」を実現するAIエージェントです。  
三段階パイプライン（返答要否判定→スタイル分類→応答生成）と、柔軟なYAML/Markdown設定で運用・拡張が容易です。

---

## ディレクトリ構成

```
natural-gaku-co/
├─ src/
│   ├─ discord/      … Discordクライアント・ハンドラ
│   ├─ context/      … プロファイル管理
│   ├─ memory/       … 長期記憶（Supabase RAG）
│   ├─ initiator/    … 投げかけ（Initiation）モジュール
│   └─ utils/        … ユーティリティ
├─ config/
│   ├─ config.yaml           … 基本設定（モデル・温度・Bot制御等）
│   ├─ room_rules.yaml       … ルームルール・Bot名
│   ├─ prompt_styles.yaml    … スタイル定義
│   ├─ character.yaml        … キャラクター設定
│   ├─ members.yaml          … 参加者プロファイル
│   └─ system_prompts/
│        ├─ short_positive_reaction.md
│        ├─ deep_analysis.md
│        ├─ empathetic_human.md
│        └─ initiation.md
├─ tests/                    … テスト
├─ .env.example              … 環境変数サンプル
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## セットアップ

1. **依存パッケージのインストール**
   ```bash
   npm install
   ```

2. **環境変数ファイルの作成**
   ```bash
   cp .env.example .env
   # .env を編集（DISCORD_BOT_TOKEN, OPENAI_API_KEY, SUPABASE_URL など）
   ```

3. **設定ファイルの編集**
   - `config/config.yaml` … LLMモデル・温度・Bot制御など
   - `config/room_rules.yaml` … ルームルール・Bot名
   - `config/prompt_styles.yaml` … スタイル定義
   - `config/character.yaml` … キャラクター設定
   - `config/members.yaml` … 参加者プロファイル（初回は `config/members.example.yaml` をコピーして作成）
   - `config/system_prompts/*.md` … スタイル/用途ごとのSystem Prompt

   ```bash
   cp config/members.example.yaml config/members.yaml
   # 各YAML/MDを編集
   ```

4. **ビルド・起動**
   ```bash
   npm run build
   npm start
   # または開発用ホットリロード
   npm run dev
   ```

---

## 主な機能

- **三段階パイプライン**: 返答要否判定 → スタイル分類 → 応答生成
- **ルームルール準拠**: room_rules.yamlで柔軟にルール・Bot名を管理
- **スタイル分類**: prompt_styles.yamlで定義した複数スタイルから最適なものを自動選択
- **キャラクター性**: character.yamlで一元管理、全応答・投げかけに反映
- **文脈・記憶活用**: 会話履歴・長期記憶・プロファイルを応答生成に活用
- **主体的投げかけ**: initiation.md＋キャラ設定で静かな時に話題提供
- **Bot間ループ防止**: config.yamlのbotセクションで柔軟に制御
- **YAML/Markdownで全設定管理**: 再デプロイ不要で運用・拡張が容易

---

## 設定ファイルの書き方

### 1. config/config.yaml（基本設定）

```yaml
llm:
  model: gpt-4o
  temperature: 0.8
style:
  vague_rate: 0.1
intervention:
  enabled: true
  base_prob: 0.02
  silence_threshold: 5
  interval_minutes: 10
  channels: []
  active_hours:
    start: 8
    end: 23
memory:
  match_threshold: 0.7
bot:
  ignoreBots: false
  bot_loop_limit: 3
  bot_loop_reset_minutes: 60
```
- **llm.model/temperature**: OpenAI APIのモデル・温度
- **style.vague_rate**: 曖昧表現の確率
- **intervention**: 投げかけ（Initiation）や応答頻度の制御
- **bot**: Bot間ループ防止・Bot発言制御

---

### 2. config/room_rules.yaml（ルームルール・Bot名）

```yaml
rules:
  - id: silent_without_nomination
    description: >
      他者から指名・メンションされない限り発言しない。
  - id: facilitator_priority
    description: >
      ファシリテーター（ガクチョ）の指示を最優先せよ。

bots:
  - name: がっこちゃん
  - name: ガッコちゃん
facilitator: ガクチョ
```
- **rules**: ルームの会話ルール（id＋descriptionで自由に追加可）
- **bots**: Botが「自分宛て」と認識する呼び名（表記ゆれも全て列挙）
- **facilitator**: ファシリテーター名

---

### 3. config/prompt_styles.yaml（スタイル定義）

```yaml
styles:
  short_positive_reaction:
    description: >
      シンプルかつ肯定的。アイディア共有・ニュース報告向け。
    examples:
      - "昨日こんな記事を読んだよ"
      - "新しいアイデアが浮かんだ！"
  deep_analysis:
    description: >
      背景の構造や影響を掘り下げて論じる。
    examples:
      - "SNS疲れが社会に与える影響って？"
  empathetic_human:
    description: >
      感情に寄り添い、共感を示す。
    examples:
      - "最近ちょっとつらいな"
```
- **styles**: スタイルごとにdescription/例文を記載

---

### 4. config/character.yaml（キャラクター設定）

```yaml
character:
  name: がっこちゃん
  persona: |
    あなたはDiscord上で楽しくおしゃべりをする女子高生、がっこちゃんです。明るく元気に話をしてください。
    「うっそー」とか「マジで」とか「キャハッ」とか「すごいねっ」といった女子高生特有の感嘆表現を使って話してください。
```
- **persona**: キャラ設定は全応答・投げかけのsystem prompt先頭に必ず合成

---

### 5. config/system_prompts/*.md（スタイル/用途ごとのSystem Prompt）

例: `config/system_prompts/short_positive_reaction.md`
```
- 返答は120字以内。
- 絵文字1〜2個まで使用可。
- ユーザーが共有した内容に対して肯定し、一言質問があれば加えても良い。
```
- **キャラ設定は書かず、スタイル指示のみ記載**

例: `config/system_prompts/initiation.md`
```
以下の情報をもとに、Discordで自然な投げかけ文を1つ作ってください。
- ユーザー: {{user}}
- テーマ: {{topic}}
条件: ユーザー＋テーマ＋投げかけの形にしてください。
```

---

### 6. config/members.yaml（参加者プロファイル）

```yaml
members:
  - id: "1234567890"
    username: taro
    callname: たろう
    tags: ["音楽", "旅行"]
  - id: "2222222222"
    username: some_bot
    callname: ボットくん
    isBot: true
    tags: []
```
- **isBot: true** でBotを明示
- Initiation（投げかけ）ではisBot: trueは除外

---

## .env例

```
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE=...
```

---

## よくある質問

- **設定を変えたら？**  
  → 必ず `npm run build` & `pm2 restart` で再起動してください。

- **ルールやスタイルを増やしたい**  
  → YAML/MDを編集・追加するだけでOK。再デプロイ不要。

- **キャラやスタイルを複数Botで切り替えたい**  
  → character.yamlやsystem_prompts/をBotごとに分けて運用可能

---

## 技術スタック

- Node.js 18+ / TypeScript (ESM)
- discord.js v14
- OpenAI GPT-4o
- Supabase (pgvector)
- dotenv, yaml, mustache
- jest（テスト）

---

ご質問・要望はIssueまたは開発者まで！ 