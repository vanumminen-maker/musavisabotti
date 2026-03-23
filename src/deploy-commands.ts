import 'dotenv/config';
import { REST, Routes } from 'discord.js';

import * as lisaaCmd from './commands/lisaa';
import * as listaCmd from './commands/lista';
import * as poistaCmd from './commands/poista';
import * as musavisaCmd from './commands/musavisa';
import * as spoilerCmd from './commands/spoiler';
import * as nextCmd from './commands/next';
import * as valmistaCmd from './commands/valmista';
import * as leaderboardCmd from './commands/leaderboard';
import * as ohjeCmd from './commands/ohje';
import * as arvaaCmd from './commands/arvaa';
import * as liityCmd from './commands/liity';
import * as jonoCmd from './commands/jono';
import * as skipCmd from './commands/skip';
import * as playCmd from './commands/play';
import * as pauseCmd from './commands/pause';
import * as poistuCmd from './commands/poistu';

const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;

const commandsData = [
  lisaaCmd,
  listaCmd,
  poistaCmd,
  musavisaCmd,
  spoilerCmd,
  nextCmd,
  valmistaCmd,
  leaderboardCmd,
  ohjeCmd,
  arvaaCmd,
  liityCmd,
  jonoCmd,
  skipCmd,
  playCmd,
  pauseCmd,
  poistuCmd,
].map((cmd) => cmd.data.toJSON());

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 Rekisteröidään slash-komennot...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandsData });
    console.log('✅ Slash-komennot rekisteröity onnistuneesti!');
  } catch (error) {
    console.error('❌ Virhe rekisteröinnissä:', error);
    process.exit(1);
  }
})();
