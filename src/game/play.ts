import { createAudioResource, StreamType } from '@discordjs/voice';
import { Client, TextChannel } from 'discord.js';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { checkGuess } from './fuzzy';
import { getState, stopCurrentSong } from './state';
import type { Message } from 'discord.js';

const ROUND_DURATION_MS = 30_000;

/**
 * Extracts a direct playback URL using yt-dlp with cookie support.
 */
async function extractWithYtDlp(url: string, cookieInput?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = [
      url,
      '--dump-single-json',
      '--no-playlist',
      '--format', 'bestaudio/best',
      '--no-check-certificates',
      '--force-ipv4',
    ];

    // If cookies are provided, write them to a temp file for yt-dlp
    let cookieFile = '';
    if (cookieInput) {
      try {
        cookieFile = path.join('/tmp', `cookies_${Date.now()}.txt`);
        
        // yt-dlp handles raw cookie strings best if they are in a specific header 
        // OR as a standard Netscape file. We'll try to write it as a simple file.
        // If it's JSON, we could convert it, but let's assume raw string for now 
        // as requested in the latest instructions.
        fs.writeFileSync(cookieFile, cookieInput);
        args.push('--cookies', cookieFile);
        console.log(`Using cookie file: ${cookieFile}`);
      } catch (e) {
        console.error('Virhe evästetiedoston luomisessa:', e);
      }
    }

    console.log(`Executing: yt-dlp ${args.map(a => a === cookieFile ? '[COOKIE_FILE]' : a).join(' ')}`);
    const child = spawn('yt-dlp', args);
    
    let stdoutData = '';
    let stderrData = '';

    const timeout = setTimeout(() => {
      child.kill();
      if (cookieFile && fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
      reject(new Error('YouTube-haku aikakatkaistiin (30s).'));
    }, 30000);

    child.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderrData += chunk.toString(); });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (cookieFile && fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);

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
      if (cookieFile && fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
      reject(err);
    });
  });
}

/**
 * Picks a random song from the list and starts the game round.
 */
export async function startNextSong(
  guildId: string,
  client: Client,
): Promise<{ success: boolean; error?: string }> {
  const state = getState(guildId);
  stopCurrentSong(guildId);

  if (state.songs.length === 0) {
    return { success: false, error: 'Biisilista on tyhjä!' };
  }

  const song = state.songs[Math.floor(Math.random() * state.songs.length)];
  state.currentSong = song;
  state.firstCorrectUser = null;

  try {
    const cookieInput = process.env.YOUTUBE_COOKIES;
    const info = await extractWithYtDlp(song.url, cookieInput);

    if (!info || !info.url) {
      throw new Error('yt-dlp ei löytänyt suoraa soitto-osoitetta.');
    }

    console.log(`URL extracted successfully via yt-dlp.`);

    const resource = createAudioResource(info.url, { 
      inputType: StreamType.Arbitrary,
      inlineVolume: true 
    });
    
    state.player!.play(resource);
  } catch (err: any) {
    console.error('Virhe äänivirran luomisessa:', err);
    state.currentSong = null;
    return { success: false, error: err.message || 'Virhe biisin lataamisessa.' };
  }

  const textChannelId = state.textChannelId!;
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
