import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/.env` });
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const styleYaml = fs.readFileSync('config/prompt_styles.yaml','utf8');
const ruleYaml  = fs.readFileSync('config/room_rules.yaml', 'utf8');

export async function decideAndClassify(message: string, options: {
  mentions?: string[],
  reply_to_id?: string,
  user_id?: string,
  username?: string
} = {}) {
  // 追加情報をプロンプトに含める
  const mentionsText = Array.isArray(options.mentions) && options.mentions.length > 0
    ? `\n# メンション: ${options.mentions.join(', ')}` : '';
  const replyToText = (typeof options.reply_to_id === 'string' && options.reply_to_id.length > 0)
    ? `\n# reply_to_id: ${options.reply_to_id}` : '';
  const userText = typeof options.username === 'string' && options.username.length > 0 ? `\n# 発言者: ${options.username}` : '';

  const prompt = `
あなたは Discord の会話モデレーター AI です。

# ユーザー発言:
${message}${userText}${mentionsText}${replyToText}

# ルームルール (YAML):
${ruleYaml}

# スタイル定義:
${styleYaml}

▼ 判断基準
- silent_without_nomination: 指名・メンション・質問文がなければ should_respond=false
- 指名（「がっこちゃん、」等）・メンション・reply・疑問文（「？」で終わる等）があれば should_respond=true
- should_respond=true の場合は最適な selected_style を選ぶ
- 迷った場合は安全側（should_respond=false）で停止

▼ 例
- 「がっこちゃんって便利！」→ should_respond=false
- 「がっこちゃん、これどう思う？」→ should_respond=true, 適切なstyle
- 「SNSが社会に与える影響についてどう思う？」→ should_respond=true, deep_analysis
- 「新しいブログ書いたよ！」→ should_respond=true, short_positive_reaction
- 「ここ数日ちょっとメンタル落ちてる」→ should_respond=true, empathetic_human

出力は JSON:
{
  "should_respond": true|false,
  "selected_style": "<style_key or null>",
  "reason": "<80字以内>"
}
`;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{role:'user', content: prompt}],
    temperature: 0.0,
  });

  const content = res.choices[0].message.content ?? '';
  return JSON.parse(content);
} 