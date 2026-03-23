import { createAudioResource, StreamType } from '@discordjs/voice';
import { Client, TextChannel } from 'discord.js';
import ytdl from '@distube/ytdl-core';
import { checkGuess } from './fuzzy';
import { getState, stopCurrentSong } from './state';
import type { Message } from 'discord.js';

const ROUND_DURATION_MS = 30_000;

/**
 * Picks a random song from the list, extracts a direct URL via ytdl-core,
 * and starts the 30-second countdown timer.
 */
export async function startNextSong(
  guildId: string,
  client: Client,
): Promise<{ success: boolean; error?: string }> {
  const state = getState(guildId);

  // Clear current song/timer
  stopCurrentSong(guildId);

  if (state.songs.length === 0) {
    return { success: false, error: 'Biisilista on tyhjä!' };
  }

  const song = state.songs[Math.floor(Math.random() * state.songs.length)];
  state.currentSong = song;
  state.firstCorrectUser = null;

  try {
    console.log(`Extracting URL for: ${song.url}`);
    
    // Check for optional cookies in environment variables
    const cookieString = process.env.YOUTUBE_COOKIES;
    let agent;
    if (cookieString) {
      try {
        const cookies = JSON.parse(cookieString);
        agent = ytdl.createAgent(cookies);
        console.log('Using YOUTUBE_COOKIES agent for extraction.');
      } catch (e) {
        console.error('Virhe YOUTUBE_COOKIES luku yrityksessä (odotettiin JSON-taulukkoa).');
      }
    }

    const info = await ytdl.getInfo(song.url, agent ? { agent } : undefined);
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio', 
      filter: 'audioonly' 
    });

    if (!format || !format.url) {
      throw new Error('Ytdl-core ei löytänyt sopivaa ääniformaattia.');
    }

    console.log(`Direct URL extracted successfully.`);

    // Use FFmpeg (Arbitrary) to read the remote URL directly.
    const resource = createAudioResource(format.url, { 
      inputType: StreamType.Arbitrary,
      inlineVolume: true 
    });
    
    state.player!.play(resource);
  } catch (err: any) {
    console.error('Virhe äänivirran luomisessa:', err);
    state.currentSong = null;

    let errorMsg = 'Virhe biisin lataamisessa.';
    if (err.message?.includes('403')) {
      errorMsg = 'YouTube estää latauksen (403). Railwayn IP-osoite on todennäköisesti väliaikaisesti estetty.';
    } else if (err.message?.includes('Sign in')) {
      errorMsg = 'YouTube vaatii kirjautumista tämän videon katsomiseen (Sign-in required).';
    }

    return { success: false, error: errorMsg };
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
