import { createAudioResource, StreamType } from '@discordjs/voice';
import { Client, TextChannel } from 'discord.js';
import { spawn } from 'child_process';
import { checkGuess } from './fuzzy';
import { getState, stopCurrentSong } from './state';
import type { Message } from 'discord.js';

const ROUND_DURATION_MS = 30_000;

/**
 * Picks a random song from the list, streams it via yt-dlp,
 * and starts the 30-second countdown timer.
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

  try {
    const startFetch = Date.now();

    // Use native spawn for better control over unbuffered stderr (required for OAuth2)
    const info = await new Promise<any>((resolve, reject) => {
      const args = [
        song.url,
        '--dump-single-json',
        '--no-playlist',
        '--format', 'bestaudio/best',
        '--username', 'oauth2',
        '--password', '',
        '--js-runtimes', 'node',
        '--no-check-certificates',
        '--force-ipv4',
      ];

      console.log(`Executing: yt-dlp ${args.join(' ')}`);
      const child = spawn('yt-dlp', args);
      
      let stdoutData = '';
      let stderrData = '';

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('YouTube-haku aikakatkaistiin (60s). Olethan nopea koodin syöttämisessä!'));
      }, 60000);

      child.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
      child.stderr.on('data', (chunk) => {
        const msg = chunk.toString();
        stderrData += msg;
        console.log(`[yt-dlp stderr] ${msg}`);

        // Look for the OAuth2 code: "and enter the code XXX-XXX-XXX"
        const match = msg.match(/enter the code ([A-Z0-9-]{8,})/);
        if (match && match[1]) {
          const code = match[1];
          const channel = client.channels.cache.get(state.textChannelId!) as TextChannel | null;
          channel?.send(
            `🔑 **Botti tarvitsee YouTuben vahvistuksen!**\n\n` +
              `1️⃣ Klikkaa tätä linkkiä: **https://www.google.com/device**\n` +
              `2️⃣ Kirjaudu sisään Google-tililläsi (tarvittaessa).\n` +
              `3️⃣ Syötä tämä koodi aukeavaan ikkunaan: **\`${code}\`**\n\n` +
              `*Tämä vahvistaa YouTubelle, ettet ole robotti ja sallii musiikin soittamisen.*`,
          ).catch(console.error);
        }
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          try {
            resolve(JSON.parse(stdoutData));
          } catch (e) {
            reject(new Error('Virhe YouTuben vastauksen lukemisessa (JSON parse failure).'));
          }
        } else {
          const lastError = stderrData.split('\n').filter(l => l.includes('ERROR:')).pop() || 'Tuntematon virhe';
          reject(new Error(`yt-dlp virhe: ${lastError}`));
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    if (!info || !info.url) {
      throw new Error('yt-dlp failed to extract a direct playback URL.');
    }

    console.log(`URL extracted in ${Date.now() - startFetch}ms`);

    // Use FFmpeg (Arbitrary) to read the remote URL directly natively.
    const resource = createAudioResource(info.url, { inputType: StreamType.Arbitrary });
    state.player!.play(resource);
  } catch (err: any) {
    console.error('Virhe äänivirran luomisessa:', err);
    state.currentSong = null;
    return { success: false, error: err.message || `Virhe biisin lataamisessa: ${song.url}` };
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
