import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('lista')
  .setDescription('Näytä kaikki lisätyt biiset (vain ylläpitäjä)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: '❌ Tarvitset **Manage Messages** -oikeuden!', ephemeral: true });
    return;
  }
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);

  if (state.songs.length === 0) {
    await interaction.reply({ content: '📭 Biisilista on tyhjä.', ephemeral: true });
    return;
  }

  const list = state.songs.map((s, i) => `**${i + 1}.** ${s.artist} – ${s.title}`).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🎶 Biisilista')
    .setDescription(list)
    .setColor(0x5865f2)
    .setFooter({ text: `${state.songs.length} biisiä` });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
