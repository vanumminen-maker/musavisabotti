import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  Client,
} from 'discord.js';
import { createAudioPlayer, joinVoiceChannel } from '@discordjs/voice';
import { getState } from '../game/state';
import { startNextSong } from '../game/play';

export const data = new SlashCommandBuilder()
  .setName('musavisa')
  .setDescription('Aloita musiikkitietovisa! Liity ensin äänikanavalle.');

export async function execute(
  interaction: ChatInputCommandInteraction,
  client: Client,
): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: '❌ Tarvitset **Manage Messages** -oikeuden!', ephemeral: true });
    return;
  }
  if (!interaction.guildId || !interaction.guild) return;

  const state = getState(interaction.guildId);

  if (state.isActive) {
    await interaction.reply({
      content: '🎮 Peli on jo käynnissä! Käytä `/next` tai `/lopeta`.',
      ephemeral: true,
    });
    return;
  }

  if (state.songs.length === 0) {
    await interaction.reply({
      content: '📭 Biisilista on tyhjä! Lisää biisejä `/lisää`-komennolla.',
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

  // Join voice
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer();
  connection.subscribe(player);
  state.player = player;
  state.connection = connection;

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
        `Arvaa artisti ja/tai kappaleen nimi kirjoittamalla tähän kanavalle.\n\n` +
        `⏰ **30 sekuntia** per biisi!`,
    )
    .setColor(0x5865f2)
    .addFields({
      name: '🏆 Pisteytysjärjestelmä',
      value: 'Artisti + kappale = **2p** | Toinen = **1p** | Nopeusbonus ⚡ = **+1p**',
    })
    .setFooter({ text: `Biisejä listalla: ${state.songs.length}` });

  await interaction.editReply({ embeds: [embed] });
}
