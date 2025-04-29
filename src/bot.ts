import 'dotenv/config';
import { loadConfig } from './utils/configLoader.js';
import { makeDiscordGateway } from './discord/discordGateway.js';
import { ConversationService } from './responder/conversationService.js';

(async () => {
  const cfg = loadConfig();
  const convo = new ConversationService(cfg);
  const gateway = makeDiscordGateway(cfg, convo);
  await gateway.start();
})(); 