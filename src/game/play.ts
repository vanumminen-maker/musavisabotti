import { createAudioResource, StreamType, AudioPlayerStatus, createAudioPlayer } from '@discordjs/voice';
import { Client, TextChannel, Message } from 'discord.js';
import play from 'play-dl';
import { checkGuess } from './fuzzy';
import { getState, stopCurrentSong } from './state';

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

  if (state.currentQuizSongs.length === 0) {
    return { success: false, error: 'Visalistan biisit loppuivat!' };
  }

  const index = Math.floor(Math.random() * state.currentQuizSongs.length);
  const song = state.currentQuizSongs.splice(index, 1)[0];
  state.currentSong = song;
  state.firstCorrectUser = null;
  state.solvedArtistBy = new Set();
  state.solvedTitleBy = new Set();

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
    
    // Check if both were already solved by everyone (or just revealed)
    // Actually, at the end of 30s we always show the answer if it's not the end of the game.
    stopCurrentSong(guildId);

    const channel = client.channels.cache.get(textChannelId) as TextChannel | null;
    await channel?.send(
      `⏰ **Aika loppui!** Biisi oli: **${revealedSong.artist} – ${revealedSong.title}**\n` +
        `Käytä \`/next\` seuraavaan biisiin tai \`/valmista\` lopettaaksesi pelin.`,
    );
  }, ROUND_DURATION_MS);

  return { success: true };
}

export interface GuessResult {
  points: number;
  bonus: number;
  partStr: string;
  isNewSolve: boolean;
  songInfo: { artist: string; title: string };
}

/**
 * Prosessoi arvauksen ja palauttaa tulokset.
 * Shared by message listener and /arvaa command.
 */
export function processGuess(guildId: string, userId: string, content: string): GuessResult | null {
  const state = getState(guildId);
  if (!state.isActive || !state.currentSong) return null;

  const { artistMatch, titleMatch } = checkGuess(
    content,
    state.currentSong.artist,
    state.currentSong.title,
  );

  if (!artistMatch && !titleMatch) return null;

  const alreadySolvedArtist = state.solvedArtistBy.has(userId);
  const alreadySolvedTitle = state.solvedTitleBy.has(userId);

  let points = 0;
  let partStr = '';
  let newSolvedArtist = false;
  let newSolvedTitle = false;

  if (artistMatch && !alreadySolvedArtist) {
    state.solvedArtistBy.add(userId);
    points += 1;
    newSolvedArtist = true;
    partStr = 'artisti';
  }
  if (titleMatch && !alreadySolvedTitle) {
    state.solvedTitleBy.add(userId);
    points += 1;
    newSolvedTitle = true;
    partStr = partStr ? 'artisti & kappale' : 'kappale';
  }

  if (points === 0) return null;

  // Nopeusbonus vain, jos käyttäjä arvaa MOLEMMAT oikein yhdellä kertaa ekan kerran tälle biisille
  let bonus = 0;
  const isFullMatch = artistMatch && titleMatch;
  if (isFullMatch && !state.firstCorrectUser) {
    state.firstCorrectUser = userId;
    bonus = 1;
  }

  const currentScore = state.scores.get(userId) ?? 0;
  state.scores.set(userId, currentScore + points + bonus);

  return {
    points,
    bonus,
    partStr,
    isNewSolve: true,
    songInfo: { 
      artist: state.currentSong.artist, 
      title: state.currentSong.title 
    }
  };
}

export async function handleGuess(message: Message, client: Client): Promise<void> {
  if (!message.guildId) return;
  
  const result = processGuess(message.guildId, message.author.id, message.content);
  if (!result) return;

  // Jos viesti sisältää oikean vastauksen, poistetaan se heti
  await message.delete().catch(() => {});

  const name = message.member?.displayName ?? message.author.username;
  const bonusStr = result.bonus ? ' + ⚡ **nopeusbonus**' : '';

  await (message.channel as TextChannel).send(
    `🎉 **${name}** arvasi oikein! (${result.partStr}) → **${result.points + result.bonus} pistettä**${bonusStr}\n` +
      `🎵 Vastaus: ||${result.songInfo.artist} – ${result.songInfo.title}||`,
  );
}
