import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, ChatInputCommandInteraction } from 'discord.js';
import { handleGuess } from './game/play';

// Import all commands
import * as lisaaCmd from './commands/lisaa';
import * as listaCmd from './commands/lista';
import * as poistaCmd from './commands/poista';
import * as musavisaCmd from './commands/musavisa';
import * as stopCmd from './commands/stop';
import * as nextCmd from './commands/next';
import * as lopetaCmd from './commands/lopeta';
import * as leaderboardCmd from './commands/leaderboard';
import * as ohjeCmd from './commands/ohje';

type Command = {
  data: { name: string; toJSON(): object };
  execute: (interaction: ChatInputCommandInteraction, client: Client) => Promise<void>;
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

const commands = new Collection<string, Command>();
for (const cmd of [
  lisaaCmd,
  listaCmd,
  poistaCmd,
  musavisaCmd,
  stopCmd,
  nextCmd,
  lopetaCmd,
  leaderboardCmd,
  ohjeCmd,
]) {
  commands.set(cmd.data.name, cmd as Command);
}

client.once('ready', () => {
  console.log(`✅ ${client.user?.tag} on nyt online!`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Virhe komennossa ${interaction.commandName}:`, error);
    const reply = { content: '❌ Tapahtui virhe komennon suorituksessa.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Handle player guesses (plain text messages, not slash commands)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guildId) return;
  if (message.content.startsWith('/')) return;
  await handleGuess(message, client);
});

client.login(process.env.DISCORD_TOKEN);
