import yaml from 'js-yaml';
import fs from 'fs';
export class ProfileStore {
  private mem = new Map<string, any>();
  constructor() {
    const raw = yaml.load(fs.readFileSync('config/members.yaml', 'utf8')) as any;
    raw.members.forEach((m: any) => this.mem.set(m.id, m));
  }
  get(id: string) {
    return this.mem.get(id);
  }
} 