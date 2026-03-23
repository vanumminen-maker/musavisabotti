import { SlashCommandBuilder, ChatInputCommandInteraction, Client } from 'discord.js';
import { getState } from '../game/state';
import { getSoundCloudInfo } from '../game/soundcloud';
import { playNextInQueue } from '../game/play';

export const data = new SlashCommandBuilder()
  .setName('jono')
  .setDescription('Lisää biisi tai soittolista musiikkijonoon')
  .addStringOption(o => o.setName('url').setDescription('SoundCloud-linkki').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  if (!interaction.guildId) return;

  const url = interaction.options.getString('url', true).trim();
  await interaction.deferReply();

  try {
    const state = getState(interaction.guildId);
    const added = await getSoundCloudInfo(url);

    if (added.length === 0) {
      await interaction.editReply('❌ Biisejä ei löytynyt.');
      return;
    }

    for (const s of added) {
      state.musicQueue.push({
        artist: s.artist,
        title: s.title,
        url: s.url,
        addedBy: interaction.user.id
      });
    }

    await interaction.editReply(`✅ Lisätty **${added.length}** biisiä jonoon.`);

    // Jos olemme musiikkitilassa ja mitään ei soideta, aloita heti
    if (state.mode === 'MUSIC' && !state.currentSong && state.connection) {
      await playNextInQueue(interaction.guildId, client);
    }
  } catch (error: any) {
    await interaction.editReply(`❌ Virhe: ${error.message}`);
  }
}
