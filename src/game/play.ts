import { createAudioResource, StreamType, AudioPlayerStatus, createAudioPlayer } from '@discordjs/voice';
import { Client, TextChannel } from 'discord.js';
import play from 'play-dl';
import { checkGuess } from './fuzzy';
import { getState, stopCurrentSong } from './state';
import type { Message } from 'discord.js';

const ROUND_DURATION_MS = 30_000;

// SoundCloud-valtuutus streamingia varten
let soundcloudAuthorized = false;
async function ensureSoundCloudAuthorized() {
  if (soundcloudAuthorized) return;
  try {
    const clientId = await play.getFreeClientID();
    await play.setToken({ soundcloud: { client_id: clientId } });
    soundcloudAuthorized = true;
    console.log('SoundCloud streaming authorized.');
  } catch (err) {
    console.error('SoundCloud streaming authorization failed:', err);
  }
}

/**
 * Varmistaa että soitin on olemassa ja kuuntelee Idle-tilaa (musiikkia varten).
 */
export function ensurePlayer(guildId: string, client: Client) {
  const state = getState(guildId);
  if (state.player) return state.player;

  const player = createAudioPlayer();
  
  player.on(AudioPlayerStatus.Idle, async () => {
    const s = getState(guildId);
    if (s.mode === 'MUSIC' && s.musicQueue.length > 0) {
      console.log('Biisi loppui, soitetaan seuraava jonosta...');
      await playNextInQueue(guildId, client);
    }
  });

  player.on('error', (error) => {
    console.error('Audio player error:', error);
  });

  state.player = player;
  return player;
}

/**
 * Soittaa seuraavan biisin musiikkijonosta (Full length).
 */
export async function playNextInQueue(guildId: string, client: Client): Promise<void> {
  const state = getState(guildId);
  state.mode = 'MUSIC';

  if (state.musicQueue.length === 0) {
    state.currentSong = null;
    return;
  }

  const song = state.musicQueue.shift()!;
  state.currentSong = song;

  try {
    await ensureSoundCloudAuthorized();
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, { 
      inputType: stream.type,
      inlineVolume: true 
    });
    
    ensurePlayer(guildId, client).play(resource);
    
    // Ilmoita kanavalle
    if (state.textChannelId) {
      const channel = client.channels.cache.get(state.textChannelId) as TextChannel;
      await channel?.send(`🎶 Nyt toistetaan: **${song.artist} - ${song.title}**`);
    }
  } catch (err) {
    console.error('Virhe musiikkijonon toistossa:', err);
  }
}

/**
 * Picks a random song from the list and starts the game round (Quiz mode).
 */
export async function startNextSong(
  guildId: string,
  client: Client,
): Promise<{ success: boolean; error?: string }> {
  const state = getState(guildId);
  state.mode = 'QUIZ';
  stopCurrentSong(guildId);

  if (state.songs.length === 0) {
    return { success: false, error: 'Biisilista on tyhjä!' };
  }

  const song = state.songs[Math.floor(Math.random() * state.songs.length)];
  state.currentSong = song;
  state.firstCorrectUser = null;

  try {
    console.log(`Toistetaan SoundCloud-biisi (Visa): ${song.url}`);
    
    // Varmista valtuutus
    await ensureSoundCloudAuthorized();
    
    // Toista SoundCloud-biisi play-dl:n avulla
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, { 
      inputType: stream.type,
      inlineVolume: true 
    });
    
    ensurePlayer(guildId, client).play(resource);
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
