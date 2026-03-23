import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getState } from '../game/state';
import { getTrackInfo, getPlaylistTracks, getAlbumTracks, SpotifyTrack } from '../game/spotify';

export const data = new SlashCommandBuilder()
  .setName('lisää')
  .setDescription('Lisää biisi, albumi tai soittolista Spotifysta')
  .addStringOption((o) =>
    o.setName('url').setDescription('Spotify-linkki biisiin, albumiin tai soittolistaan').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const url = interaction.options.getString('url', true).trim();
  await interaction.deferReply({ ephemeral: true });

  try {
    const state = getState(interaction.guildId);
    let addedSongs: SpotifyTrack[] = [];

    if (url.includes('spotify.com/track/')) {
      const trackId = url.split('track/')[1].split('?')[0];
      const info = await getTrackInfo(trackId);
      if (!info.previewUrl) {
        await interaction.editReply('❌ Tällä biisillä ei ole 30s esikatselupätkää Spotifyssa. Valitse toinen biisi.');
        return;
      }
      addedSongs.push(info);
    } else if (url.includes('spotify.com/playlist/')) {
      const playlistId = url.split('playlist/')[1].split('?')[0];
      const tracks = await getPlaylistTracks(playlistId);
      addedSongs = tracks;
    } else if (url.includes('spotify.com/album/')) {
      const albumId = url.split('album/')[1].split('?')[0];
      const tracks = await getAlbumTracks(albumId);
      addedSongs = tracks;
    } else {
      await interaction.editReply('❌ Anna kelvollinen Spotify-linkki (track, playlist tai album)!');
      return;
    }

    if (addedSongs.length === 0) {
      await interaction.editReply('❌ Mitään biisejä ei löytynyt (varmista että niissä on 30s esikatselut).');
      return;
    }

    for (const s of addedSongs) {
      state.songs.push({
        artist: s.artist.trim().toLowerCase(),
        title: s.title.trim().toLowerCase(),
        url: s.previewUrl!,
        addedBy: interaction.user.id,
      });
    }

    const mySongs = state.songs.filter(s => s.addedBy === interaction.user.id);
    await interaction.editReply(
      `✅ Lisätty **${addedSongs.length}** biisiä.\n📋 Sinun listallasi on nyt **${mySongs.length}** biisiä.`
    );
  } catch (error: any) {
    console.error('Spotify-lisäysvirhe:', error);
    await interaction.editReply(`❌ Virhe: ${error.message}`);
  }
}
