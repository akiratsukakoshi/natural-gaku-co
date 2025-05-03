import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env` });
import fs from 'fs';
import yaml from 'js-yaml';
import Mustache from 'mustache';
import OpenAI from 'openai';

const prompts = yaml.load(fs.readFileSync('config/prompts.yaml', 'utf8')) as Record<string, string>;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const renderPrompt = (key: string, vars: Record<string, any>) =>
  Mustache.render(prompts[key], vars);

export const callLLM = async (prompt: string, cfg: any) => {
  const res = await openai.chat.completions.create({
    model: cfg.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: cfg.temperature
  });
  return res.choices[0].message?.content ?? '';
}; 