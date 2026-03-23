import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getState } from '../game/state';
import { getSoundCloudInfo } from '../game/soundcloud';

export const data = new SlashCommandBuilder()
  .setName('lisää')
  .setDescription('Lisää biisi tai soittolista SoundCloudista')
  .addStringOption((o) =>
    o.setName('url').setDescription('SoundCloud-linkki biisiin tai settiin').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const url = interaction.options.getString('url', true).trim();
  console.log(`Käyttäjä yritti lisätä linkin: ${url}`);
  await interaction.deferReply({ ephemeral: true });

  try {
    const state = getState(interaction.guildId);
    
    if (!url.includes('soundcloud.com/')) {
      await interaction.editReply('❌ Anna kelvollinen SoundCloud-linkki!');
      return;
    }

    const addedSongs = await getSoundCloudInfo(url);

    if (addedSongs.length === 0) {
      await interaction.editReply('❌ Mitään biisejä ei löytynyt.');
      return;
    }

    for (const s of addedSongs) {
      state.songs.push({
        artist: s.artist.trim().toLowerCase(),
        title: s.title.trim().toLowerCase(),
        url: s.url,
        addedBy: interaction.user.id,
      });
    }

    const mySongs = state.songs.filter(s => s.addedBy === interaction.user.id);
    await interaction.editReply(
      `✅ Lisätty **${addedSongs.length}** biisiä.\n📋 Sinun listallasi on nyt **${mySongs.length}** biisiä.`
    );
  } catch (error: any) {
    console.error('SoundCloud-lisäysvirhe:', error);
    await interaction.editReply(`❌ Virhe: ${error.message}`);
  }
}
