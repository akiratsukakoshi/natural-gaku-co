import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/.env` });
import OpenAI from 'openai';
import yaml from 'js-yaml';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const styleYaml = fs.readFileSync('config/prompt_styles.yaml','utf8');
const ruleYaml  = fs.readFileSync('config/room_rules.yaml', 'utf8');
const rulesObj = yaml.load(ruleYaml) as any;
const rules = Array.isArray(rulesObj.rules) ? rulesObj.rules : [];
const rulesText = rules
  .map((r: any) => `- ${r.id}: ${r.description}` + (r.examples ? '\n    例: ' + r.examples.join(' / ') : ''))
  .join('\n');
const maxPriority = Math.max(...rules.map((r: any) => r.priority || 0));
const strictRules = rules.filter((r: any) => r.priority === maxPriority);
const strictRuleText = strictRules.map((r: any) => `【最重要】${r.id}: ${r.description}（このルールは絶対に守ること。他のルールや文脈よりも優先する）`).join('\n');

export async function decideAndClassify(message: string, options: {
  mentions?: string[],
  reply_to_id?: string,
  user_id?: string,
  username?: string,
  is_bot?: boolean
} = {}) {
  // 追加情報をプロンプトに含める
  const mentionsText = Array.isArray(options.mentions) && options.mentions.length > 0
    ? `\n# メンション: ${options.mentions.join(', ')}` : '';
  const replyToText = (typeof options.reply_to_id === 'string' && options.reply_to_id.length > 0)
    ? `\n# reply_to_id: ${options.reply_to_id}` : '';
  const userText = typeof options.username === 'string' && options.username.length > 0 ? `\n# 発言者: ${options.username}` : '';
  const isBotText = options.is_bot ? '\n# 発話者はBotです' : '';

  const prompt = `
あなたは Discord の会話モデレーター AI です。

# ユーザー発言:
${message}${userText}${mentionsText}${replyToText}${isBotText}

# ルームルール (YAML):
${ruleYaml}

# スタイル定義:
${styleYaml}

▼ 判断基準
${rulesText}
- should_respond=true の場合は最適な selected_style を選ぶ
- 迷った場合は安全側（should_respond=false）で停止

${strictRuleText}

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