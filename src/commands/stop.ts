import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getState, stopCurrentSong } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Keskeytä nykyinen biisi ja paljasta vastaus (peli jatkuu)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: '❌ Tarvitset **Manage Messages** -oikeuden!', ephemeral: true });
    return;
  }
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);

  if (!state.isActive) {
    await interaction.reply({ content: '🎮 Ei aktiivista peliä.', ephemeral: true });
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
  stopCurrentSong(interaction.guildId);

  await interaction.reply(
    `⏹️ Biisi pysäytetty. Se oli: **${song.artist} – ${song.title}**\n` +
      `Käytä \`/next\` seuraavaan biisiin tai \`/lopeta\` lopettaaksesi pelin.`,
  );
}
