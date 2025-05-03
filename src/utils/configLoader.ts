import fs from 'fs';
import yaml from 'js-yaml';

export function loadConfig() {
  const raw = fs.readFileSync('config/config.yaml', 'utf8');
  const cfg = yaml.load(raw) as any;
  // INITIATION_CHANNEL_IDS（カンマ区切り）を.envから取得し、cfg.intervention.channelsを上書き
  if (process.env.INITIATION_CHANNEL_IDS) {
    cfg.intervention = cfg.intervention || {};
    cfg.intervention.channels = process.env.INITIATION_CHANNEL_IDS.split(',').map(id => id.trim());
  }
  return cfg;
} 