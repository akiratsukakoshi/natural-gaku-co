import fs from 'fs';
import OpenAI from 'openai';
import { MemoryStore } from './memory/memoryStore.js';
import { ProfileStore } from './context/profileStore.js';
import yaml from 'js-yaml';

const charYaml = yaml.load(fs.readFileSync('config/character.yaml', 'utf8')) as any;
const charPrompt = charYaml.character.persona;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateReply(style: string, userMessage: string, cfg?: any) {
  let systemPrompt: string;
  try {
    systemPrompt = fs.readFileSync(
      `config/system_prompts/${style}.md`, 'utf8'
    );
  } catch (e) {
    // スタイルが存在しない場合はdefault.mdを使う（なければエラー）
    systemPrompt = fs.readFileSync(
      `config/system_prompts/default.md`, 'utf8'
    );
  }
  const fullPrompt = charPrompt + '\n' + systemPrompt;
  const res = await openai.chat.completions.create({
    model: cfg?.llm?.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: fullPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: cfg?.llm?.temperature ?? 0.7,
  });
  return res.choices[0].message.content?.trim() ?? '';
}

export async function generateContextualReply(
  style: string,
  m: { content: string; author: { id: string; username: string } },
  options: {
    memoryStore: MemoryStore,
    profileStore: ProfileStore,
    recentMessages: { author: string; text: string }[],
    cfg: any
  }
) {
  let systemPrompt: string;
  try {
    systemPrompt = fs.readFileSync(
      `config/system_prompts/${style}.md`, 'utf8'
    );
  } catch (e) {
    systemPrompt = fs.readFileSync(
      `config/system_prompts/default.md`, 'utf8'
    );
  }
  const fullPrompt = charPrompt + '\n' + systemPrompt;
  const memory = await options.memoryStore.search(m.content, 3);
  const prof = options.profileStore.get(m.author.id);
  const recent = options.recentMessages.map(x => `${x.author}: ${x.text}`).join('\n');

  const userPrompt = `\n### 会話履歴\n${recent}\n### 長期記憶\n${memory.map((x: any) => x.content).join('\n\n')}\n### ユーザー発言\n${m.content}\n`;

  const res = await openai.chat.completions.create({
    model: options.cfg?.llm?.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: fullPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: options.cfg?.llm?.temperature ?? 0.7,
  });
  let text = res.choices[0].message.content?.trim() ?? '';

  if (Math.random() < (options.cfg?.style?.vague_rate ?? 0)) {
    text = text.replace(/。$/u, 'かも。');
  }
  return text;
} 