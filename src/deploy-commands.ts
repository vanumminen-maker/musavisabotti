import 'dotenv/config';
import { REST, Routes } from 'discord.js';

import * as lisaaCmd from './commands/lisaa';
import * as listaCmd from './commands/lista';
import * as poistaCmd from './commands/poista';
import * as musavisaCmd from './commands/musavisa';
import * as stopCmd from './commands/stop';
import * as nextCmd from './commands/next';
import * as lopetaCmd from './commands/lopeta';
import * as leaderboardCmd from './commands/leaderboard';
import * as ohjeCmd from './commands/ohje';

const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;

const commandsData = [
  lisaaCmd,
  listaCmd,
  poistaCmd,
  musavisaCmd,
  stopCmd,
  nextCmd,
  lopetaCmd,
  leaderboardCmd,
  ohjeCmd,
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
