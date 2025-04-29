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
- `config/members.yaml` … 参加者プロファイル

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

セクション / キー	役割	設定範囲・型	目安値	補足
llm.model	LLM のモデル名	文字列	gpt-4o / gpt-4-turbo など	OpenAI API で有効なモデル ID
llm.temperature	応答の“揺らぎ”強さ	0 – 2 (float)	0.8	0→ほぼ決定論的／1.0≒標準／1.2↑でランダム多め
style.joke_rate	冗談を差し込む確率	0 – 1	0.2 (20 %)	0 ならジョーク無効
style.vague_rate	曖昧表現へ変換する確率	0 – 1	0.1	断定を「かも」などに置換
intervention.base_prob	“普通のメッセージ”に反応する初期確率	0 – 1	0.02 (2 %)	メンション時は必ず応答
intervention.silence_threshold	「静か」とみなす直近メッセージ数	整数 (≥0)	5	この値以下だと base_prob がそのまま適用
memory.match_threshold	長期記憶検索の類似度しきい値	0 – 1	0.7	1 に近いほど厳密，0 に近いほど広くヒット
bot.ignoreBots	他 Bot の発言を無視するか	true / false	false	true にすると Bot 同士の無限ループを防止
推奨チューニングフロー
温度 で文章の堅さを調整（0.6 – 1.0 に収めると安定）。

会話が静かすぎるなら base_prob を +0.01～+0.03 上げる。

ジョークが多すぎる / 少なすぎる場合は joke_rate を 0.05 刻みで調整。

長期記憶がノイズ気味なら match_threshold を 0.75-0.8 へ上げる。

編集後は Bot を再起動 して設定を反映させてください。

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