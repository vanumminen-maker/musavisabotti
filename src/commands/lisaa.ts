import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('lisää')
  .setDescription('Lisää biisi musiikkivisalistaan')
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
  if (!interaction.guildId) return;

  const artist = interaction.options.getString('artisti', true).trim().toLowerCase();
  const title = interaction.options.getString('kappale', true).trim().toLowerCase();
  const url = interaction.options.getString('url', true).trim();

  if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
    await interaction.reply({ content: '❌ Anna kelvollinen YouTube-linkki!', ephemeral: true });
    return;
  }

  const state = getState(interaction.guildId);
  state.songs.push({ artist, title, url, addedBy: interaction.user.id });

  const mySongs = state.songs.filter(s => s.addedBy === interaction.user.id);
  await interaction.reply({
    content: `✅ Lisätty: **${artist} – ${title}**\n📋 Sinun listallasi on nyt **${mySongs.length}** biisiä.`,
    ephemeral: true,
  });
}
