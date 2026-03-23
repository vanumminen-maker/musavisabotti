import { SlashCommandBuilder, ChatInputCommandInteraction, Client } from 'discord.js';
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { getState, stopCurrentSong } from '../game/state';
import { ensurePlayer, playNextInQueue } from '../game/play';

export const data = new SlashCommandBuilder()
  .setName('liity')
  .setDescription('Kutsu botti kanavalle kuuntelemaan musiikkia');

export async function execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  if (!interaction.guildId || !interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({ content: '🔈 Liity ensin äänikanavalle!', ephemeral: true });
    return;
  }

  await interaction.deferReply();
  const state = getState(interaction.guildId);
  
  // Pysäytä mahdollinen musavisa tai aiempi toisto
  stopCurrentSong(interaction.guildId);
  state.mode = 'MUSIC';
  state.textChannelId = interaction.channelId;

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = ensurePlayer(interaction.guildId, client);
  connection.subscribe(player);
  state.connection = connection;

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    await interaction.editReply('🎧 Luurit päässä ja valmiina soittamaan! Lisää biisejä `/jono` -komennolla.');
    
    // Jos jonossa on jo tavaraa ja mitään ei soideta, aloita
    if (state.musicQueue.length > 0 && !state.currentSong) {
      await playNextInQueue(interaction.guildId, client);
    }
  } catch (error) {
    console.error('Connection error:', error);
    connection.destroy();
    state.connection = null;
    await interaction.editReply('❌ Yhteys epäonnistui.');
  }
}
