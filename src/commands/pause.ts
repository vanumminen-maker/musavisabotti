import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pysäytä musiikki hetkeksi');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const state = getState(interaction.guildId);

  if (state.player && state.mode === 'MUSIC') {
    state.player.pause();
    await interaction.reply('⏸️ Musiikki pysäytetty.');
  } else {
    await interaction.reply({ content: '❌ Mitään ei soiteta musiikkitilassa.', ephemeral: true });
  }
}
