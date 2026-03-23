import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('lista')
  .setDescription('Näytä oma soittolistasi');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);
  const mySongs = state.songs.filter(s => s.addedBy === interaction.user.id);

  if (mySongs.length === 0) {
    await interaction.reply({ content: '📭 Sinulla ei ole vielä biisejä listallasi.', ephemeral: true });
    return;
  }

  const list = mySongs.map((s, i) => `**${i + 1}.** ${s.artist} – ${s.title}`).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🎶 Oma Biisilistasi')
    .setDescription(list)
    .setColor(0x5865f2)
    .setFooter({ text: `${mySongs.length} biisiä lisätty` });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
