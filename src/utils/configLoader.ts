import fs from 'fs';
import yaml from 'js-yaml';

export function loadConfig() {
  const raw = fs.readFileSync('config/config.yaml', 'utf8');
  return yaml.load(raw) as any;
} 