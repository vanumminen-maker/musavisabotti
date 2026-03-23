import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getState, stopCurrentSong } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('spoiler')
  .setDescription('Paljasta nykyinen biisi (vain visan vetäjä)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);

  if (!state.isActive) {
    await interaction.reply({ content: '🎮 Ei aktiivista peliä.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== state.hostId) {
    await interaction.reply({ content: '❌ Vain visan vetäjä voi paljastaa vastauksen!', ephemeral: true });
    return;
  }

  if (!state.currentSong) {
    await interaction.reply({
      content: '⏸️ Ei meneillään olevaa biisiä. Käytä `/next` aloittaaksesi uuden.',
      ephemeral: true,
    });
    return;
  }

  const song = state.currentSong;
  state.solvedArtistBy.add(interaction.user.id);
  state.solvedTitleBy.add(interaction.user.id);
  stopCurrentSong(interaction.guildId);

  await interaction.reply(
    `⏹️ Biisi paljastettu! Se oli: **${song.artist} – ${song.title}**\n` +
      `Käytä \`/next\` seuraavaan biisiin tai \`/valmista\` lopettaaksesi pelin.`,
  );
}
