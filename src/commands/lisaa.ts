import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getState } from '../game/state';
import { getSoundCloudInfo } from '../game/soundcloud';

export const data = new SlashCommandBuilder()
  .setName('lisää')
  .setDescription('Lisää biisi tai soittolista SoundCloudista')
  .addStringOption((o) =>
    o.setName('url').setDescription('SoundCloud-linkki biisiin tai settiin').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('artisti').setDescription('Pelin hyväksymä artistin nimi (valinnainen)').setRequired(false),
  )
  .addStringOption((o) =>
    o.setName('kappale').setDescription('Pelin hyväksymä kappaleen nimi (valinnainen)').setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const url = interaction.options.getString('url', true).trim();
  const manualArtist = interaction.options.getString('artisti')?.trim();
  const manualTitle = interaction.options.getString('kappale')?.trim();

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
      // Jos lisätään vain yksi biisi ja käyttäjä antoi nimet käsin, käytä niitä.
      // Jos lisätään soittolista, käytä SoundCloudin nimiä.
      const artist = (addedSongs.length === 1 && manualArtist) ? manualArtist : (s.artist || 'Tuntematon Artisti');
      const title = (addedSongs.length === 1 && manualTitle) ? manualTitle : (s.title || 'Tuntematon Biisi');

      state.songs.push({
        artist: artist.trim().toLowerCase(),
        title: title.trim().toLowerCase(),
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
