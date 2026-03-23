import { SlashCommandBuilder, ChatInputCommandInteraction, Client } from 'discord.js';
import { getState, stopCurrentSong } from '../game/state';
import { playNextInQueue } from '../game/play';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Hyppää seuraavaan biisiin tai tyhjennä jono')
  .addStringOption(o => 
    o.setName('kohde')
     .setDescription('Mitä skipataan?')
     .addChoices({ name: 'biisi', value: 'biisi' }, { name: 'jono', value: 'jono' })
  );

export async function execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);
  const target = interaction.options.getString('kohde') || 'biisi';

  if (state.mode !== 'MUSIC') {
    await interaction.reply({ content: '❌ Tämä komento toimii vain musiikkitilassa!', ephemeral: true });
    return;
  }

  if (target === 'jono') {
    state.musicQueue = [];
    stopCurrentSong(interaction.guildId);
    await interaction.reply('⏹️ Jono tyhjennetty ja toisto lopetettu.');
  } else {
    await interaction.reply('⏭️ Skipataan seuraavaan...');
    stopCurrentSong(interaction.guildId);
    await playNextInQueue(interaction.guildId, client);
  }
}
