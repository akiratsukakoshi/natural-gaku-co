import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../.env` });

import { loadConfig } from './utils/configLoader.js';
import { makeDiscordGateway } from './discord/discordGateway.js';
import { ConversationService } from './responder/conversationService.js';
import { InitiationService } from './initiator/initiationService.js';

(async () => {
  const cfg = loadConfig();
  const convo = new ConversationService(cfg);
  const gateway = makeDiscordGateway(cfg, convo);
  new InitiationService(gateway.client, cfg).start();
  await gateway.start();
})(); 