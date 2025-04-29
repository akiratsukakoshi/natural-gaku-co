import { createClient } from '@supabase/supabase-js';

export class MemoryStore {
  private supa;
  private readonly cfg: any;
  constructor(cfg: any) {
    this.cfg = cfg;
    this.supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
  }
  async search(q: string, k = 5) {
    const { data } = await this.supa.rpc('match_chunks', {
      query_embedding: await this.embed(q),
      match_threshold: this.cfg.memory.match_threshold,
      match_count: k
    });
    return data ?? [];
  }
  private async embed(text: string) {
    // call openai embeddings … (省略)
    return [];
  }
} 