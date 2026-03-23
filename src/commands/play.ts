import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Jatka pysäytettyä musiikkia');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const state = getState(interaction.guildId);

  if (state.player && state.mode === 'MUSIC') {
    state.player.unpause();
    await interaction.reply('▶️ Jatketaan soittoa.');
  } else {
    await interaction.reply({ content: '❌ Mitään ei ole keskeytetty musiikkitilassa.', ephemeral: true });
  }
}
