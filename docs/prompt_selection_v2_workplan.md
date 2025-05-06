# natural-gaku-co V2対応 統合作業計画

## 1. 概要

本ドキュメントは「三段階プロンプト選択システム（V2）」の設計・実装・移行作業計画をまとめたものです。
V1（prompt_style_two_stage_design.md）とV2（prompt_selection_system_v2.md）の要件を統合し、現状のディレクトリ構成・実装状況を踏まえて最適な改修手順を示します。

---

## 2. 設計方針・要件比較

### 共通点
- ユーザー発言→スタイル分類→応答生成のパイプライン
- スタイル定義・System PromptはYAML/Markdownで外部管理
- LLM（OpenAI）で判定・生成
- テスト・ロギング・柔軟な拡張性を重視

### 主な違い
| 項目 | V1（二段階） | V2（三段階/現行要件） |
|------|--------------|-----------------------|
| ステップ | 1. スタイル分類<br>2. 応答生成 | 0. 返答要否＋スタイル分類<br>2. 応答生成 |
| 返答要否 | なし（常に返答） | あり（should_respond） |
| ルームルール | なし | あり（room_rules.yaml） |
| 判定失敗時 | defaultスタイル | should_respond=falseで停止 |
| ログ | debugレベル | should_respond, reason必須 |
| ファイル構成 | promptClassifier.ts, responseGenerator.ts | decisionAndStyle.ts, responseGenerator.ts |

---

## 3. 現状ディレクトリとの対応

- `src/discord/discordGateway.ts` … Discordハンドラ（index.ts相当）
- `src/responder/conversationService.ts` … 応答生成（responseGenerator.ts相当）
- `src/utils/llmClient.ts` … LLMラッパー
- `config/prompts.yaml` … プロンプト定義（スタイル分離は未実装）
- `config/config.yaml` … 全体設定（ルームルール分離は未実装）
- `tests/` … 未作成

---

## 4. 統合的な作業計画

### A. 設計・ファイル分離
1. **ルームルール・スタイル定義の分離**
   - `config/room_rules.yaml`（V2準拠、ルームルール記述）
   - `config/prompt_styles.yaml`（V1/V2両対応、スタイル定義YAML）
2. **System Promptの分離**
   - `config/system_prompts/` ディレクトリ新設
   - スタイルごとにMarkdownでプロンプト記述

### B. Step-0/1ロジック実装
3. **decisionAndStyle.ts新規作成**
   - ルームルール・スタイルYAMLを読み込み
   - OpenAI APIでshould_respond, selected_style, reasonを判定
   - V1のスタイル分類ロジックを包含し、V2の返答要否判定も実装
4. **既存ConversationServiceの整理**
   - 返答判定・スタイル分類をdecisionAndStyle.tsに移譲
   - 応答生成は既存buildReplyまたは新responseGenerator.tsに集約

### C. Discordハンドラ改修
5. **discordGateway.tsの改修**
   - messageCreateでdecisionAndStyle.tsを呼び出し
   - should_respond=falseならスルー
   - selected_styleで応答生成
   - reason, should_respondをログ出力

### D. テスト・検証
6. **テストディレクトリ新設・テスト実装**
   - `tests/decisionAndStyle.test.ts`：返答要否・スタイル分類のテスト
   - `tests/responseGenerator.test.ts`：応答生成のテスト（必要に応じて）

### E. ドキュメント・リファクタ
7. **README/設計資料の更新**
   - 新アーキテクチャ・運用手順を反映

---

## 5. 具体的な作業手順（推奨順）

1. `config/room_rules.yaml`新規作成（V2例に準拠）
2. `config/prompt_styles.yaml`新規作成（V1例に準拠）
3. `config/system_prompts/`ディレクトリ新設＋3スタイル分のmd作成
4. `src/decisionAndStyle.ts`新規作成（V2サンプル＋V1分類ロジックを統合）
5. `src/discord/discordGateway.ts`改修（Step-0/1/2パイプライン化）
6. `tests/decisionAndStyle.test.ts`新規作成
7. 動作確認・テストパス
8. ドキュメント更新

---

## 6. 補足

- 既存の`ConversationService`は将来的に廃止・統合も検討
- ルームごとにルール・スタイルを切り替える場合はYAMLの動的ロードで対応
- 迷った場合はAkiraに確認 