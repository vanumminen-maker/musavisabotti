import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('lisää')
  .setDescription('Lisää biisi musiikkivisalistaan (vain ylläpitäjä)')
  .addStringOption((o) =>
    o.setName('artisti').setDescription('Artistin nimi').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('kappale').setDescription('Kappaleen nimi').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('url').setDescription('YouTube-linkki').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: '❌ Tarvitset **Manage Messages** -oikeuden!', ephemeral: true });
    return;
  }
  if (!interaction.guildId) return;

  const artist = interaction.options.getString('artisti', true).trim().toLowerCase();
  const title = interaction.options.getString('kappale', true).trim().toLowerCase();
  const url = interaction.options.getString('url', true).trim();

  if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
    await interaction.reply({ content: '❌ Anna kelvollinen YouTube-linkki!', ephemeral: true });
    return;
  }

  const state = getState(interaction.guildId);
  state.songs.push({ artist, title, url });

  await interaction.reply({
    content: `✅ Lisätty: **${artist} – ${title}**\n📋 Listalla nyt **${state.songs.length}** biisiä.`,
    ephemeral: true,
  });
}
