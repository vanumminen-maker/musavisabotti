import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  Client,
} from 'discord.js';
import { createAudioPlayer, joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { getState } from '../game/state';
import { startNextSong, ensurePlayer } from '../game/play';

export const data = new SlashCommandBuilder()
  .setName('musavisa')
  .setDescription('Aloita musiikkitietovisa! Liity ensin äänikanavalle.');

export async function execute(
  interaction: ChatInputCommandInteraction,
  client: Client,
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) return;

  const state = getState(interaction.guildId);

  if (state.isActive) {
    await interaction.reply({
      content: '🎮 Peli on jo käynnissä! Käytä `/next` tai `/valmista`.',
      ephemeral: true,
    });
    return;
  }

  // Filter songs for this user
  const mySongs = state.songs.filter((s) => s.addedBy === interaction.user.id);

  if (mySongs.length === 0) {
    await interaction.reply({
      content: '📭 Sinulla ei ole vielä biisejä visalistallasi! Lisää niitä `/lisää`-komennolla.',
      ephemeral: true,
    });
    return;
  }

  // Fetch member to get voice channel (may not be cached)
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const voiceChannel = member?.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({ content: '🔈 Liity ensin äänikanavalle!', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  // Initialise game state
  state.isActive = true;
  state.textChannelId = interaction.channelId;
  state.scores = new Map();
  state.hostId = interaction.user.id;
  state.currentQuizSongs = [...mySongs];

  // Join voice
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  connection.on('stateChange', (oldState, newState) => {
    console.log(`Voice connection state: ${oldState.status} -> ${newState.status}`);
  });

  connection.on('error', (error) => {
    console.error('Voice connection error:', error);
  });

  const player = ensurePlayer(interaction.guildId, client);
  connection.subscribe(player);
  state.connection = connection;

  try {
    // Wait up to 15 seconds for the connection to become ready
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (error) {
    console.error('Botti ei pystynyt yhdistämään äänikanavalle ajoissa:', error);
    connection.destroy();
    state.isActive = false;
    state.connection = null;
    state.player = null;
    await interaction.editReply('❌ Botti ei voinut muodostaa yhteyttä (verkko-ongelma). Kokeile myöhemmin uudelleen!');
    return;
  }

  // Play first song
  const result = await startNextSong(interaction.guildId, client);

  if (!result.success) {
    state.isActive = false;
    try { connection.destroy(); } catch { /* ignore */ }
    state.connection = null;
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎵 Musavisa alkaa!')
    .setDescription(
      `Botti liittyi äänikanavalle **${voiceChannel.name}**.\n\n` +
        `Vetäjä: **${interaction.user.username}**\n` +
        `Arvaa artisti ja/tai kappaleen nimi kirjoittamalla tähän kanavalle.\n\n` +
        `⏰ **30 sekuntia** per biisi!`,
    )
    .setColor(0x5865f2)
    .addFields({
      name: '🏆 Pisteytysjärjestelmä',
      value: 'Artisti + kappale = **2p** | Toinen = **1p** | Nopeusbonus ⚡ = **+1p**',
    })
    .setFooter({ text: `Biisejä visassa: ${state.currentQuizSongs.length}` });

  await interaction.editReply({ embeds: [embed] });
}
