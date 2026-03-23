import { createAudioResource, StreamType } from '@discordjs/voice';
import { Client, TextChannel } from 'discord.js';
import { create as createYtdl } from 'youtube-dl-exec';
const ytdlexec = createYtdl('yt-dlp');
import { checkGuess } from './fuzzy';
import { getState, stopCurrentSong } from './state';
import type { Message } from 'discord.js';

const ROUND_DURATION_MS = 30_000;

/**
 * Picks a random song from the list, streams it via play-dl,
 * and starts the 30-second countdown timer.
 * Assumes state.player and state.connection are already set up.
 */
export async function startNextSong(
  guildId: string,
  client: Client,
): Promise<{ success: boolean; error?: string }> {
  const state = getState(guildId);

  // Clear current song/timer without touching the connection/player
  stopCurrentSong(guildId);

  if (state.songs.length === 0) {
    return { success: false, error: 'Biisilista on tyhjä!' };
  }

  // Pick a random song
  const song = state.songs[Math.floor(Math.random() * state.songs.length)];
  state.currentSong = song;
  state.firstCorrectUser = null;

  // Stream audio via youtube-dl-exec (yt-dlp) Direct extraction
  try {
    const startFetch = Date.now();
    const process = ytdlexec(song.url, {
      dumpSingleJson: true,
      noPlaylist: true,
      format: 'bestaudio/best',
      // OAuth2 is the "gold standard" to bypass all bot detection and DRM issues.
      username: 'oauth2',
      jsRuntimes: 'node',
      noCheckCertificates: true,
      forceIpv4: true,
    } as any) as any;

    if (process.subprocess && process.subprocess.stderr) {
      process.subprocess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        // Look for the code: "and enter the code XXX-XXX-XXX"
        const match = output.match(/enter the code ([A-Z0-9-]{8,})/);
        if (match && match[1]) {
          const code = match[1];
          const channel = client.channels.cache.get(state.textChannelId!) as TextChannel | null;
          channel?.send(
            `🔑 **YouTube-tunnistautuminen vaaditaan!**\n\n` +
              `1️⃣ Mene osoitteeseen: **https://www.google.com/device**\n` +
              `2️⃣ Syötä koodi: \`${code}\`\n\n` +
              `*Tämä on tehtävä n. kerran päivässä, jotta YouTube sallii botin soittaa musiikkia.*`,
          ).catch(console.error);
        }
        console.log(`[yt-dlp stderr] ${output}`);
      });
    }

    const info = await process;

    if (!info || !info.url) {
      console.error('yt-dlp info object summary:', info ? 'Object returned but no URL' : 'Null info');
      throw new Error('yt-dlp failed to extract a direct playback URL.');
    }

    console.log(`URL extracted in ${Date.now() - startFetch}ms`);

    // Use FFmpeg (Arbitrary) to read the remote URL directly natively. Extremely stable.
    const resource = createAudioResource(info.url, { inputType: StreamType.Arbitrary });
    state.player!.play(resource);
  } catch (err) {
    console.error('Virhe äänivirran luomisessa:', err);
    state.currentSong = null;
    return { success: false, error: `Virhe biisin lataamisessa. Tarkista URL: ${song.url}` };
  }

  const textChannelId = state.textChannelId!;

  // 30-second auto-reveal timer
  state.timer = setTimeout(async () => {
    const s = getState(guildId);
    if (!s.currentSong || !s.isActive) return;
    const revealedSong = s.currentSong;
    stopCurrentSong(guildId);

    const channel = client.channels.cache.get(textChannelId) as TextChannel | null;
    await channel?.send(
      `⏰ **Aika loppui!** Biisi oli: **${revealedSong.artist} – ${revealedSong.title}**\n` +
        `Käytä \`/next\` seuraavaan biisiin tai \`/lopeta\` lopettaaksesi pelin.`,
    );
  }, ROUND_DURATION_MS);

  return { success: true };
}

/**
 * Called on every messageCreate event.
 * Checks if the message is a valid guess and awards points.
 */
export async function handleGuess(message: Message, client: Client): Promise<void> {
  const guildId = message.guildId!;
  const state = getState(guildId);

  if (!state.isActive || !state.currentSong) return;
  if (message.channelId !== state.textChannelId) return;

  const { artistMatch, titleMatch } = checkGuess(
    message.content,
    state.currentSong.artist,
    state.currentSong.title,
  );

  if (!artistMatch && !titleMatch) return;

  const userId = message.author.id;
  const currentScore = state.scores.get(userId) ?? 0;

  const points = artistMatch && titleMatch ? 2 : 1;
  let bonus = 0;
  if (!state.firstCorrectUser) {
    state.firstCorrectUser = userId;
    bonus = 1;
  }

  state.scores.set(userId, currentScore + points + bonus);

  const songInfo = state.currentSong;
  stopCurrentSong(guildId);

  const name = message.member?.displayName ?? message.author.username;
  const partStr = artistMatch && titleMatch ? 'artisti & kappale' : artistMatch ? 'artisti' : 'kappale';
  const bonusStr = bonus ? ' + ⚡ **nopeusbonus**' : '';

  await message.reply(
    `🎉 **${name}** arvasi oikein! (${partStr}) → **${points + bonus} pistettä**${bonusStr}\n` +
      `🎵 Biisi oli: **${songInfo.artist} – ${songInfo.title}**\n` +
      `Käytä \`/next\` seuraavaan biisiin tai \`/lopeta\` lopettaaksesi pelin.`,
  );
}
