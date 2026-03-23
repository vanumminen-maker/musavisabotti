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

  const song = state.currentQuizSongs[Math.floor(Math.random() * state.currentQuizSongs.length)];
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

  // Jos viesti sisältää oikean vastauksen, poistetaan se heti jotta muut eivät näe sitä
  await message.delete().catch(() => {});

  const userId = message.author.id;
  const alreadySolvedArtist = state.solvedArtistBy.has(userId);
  const alreadySolvedTitle = state.solvedTitleBy.has(userId);

  let points = 0;
  let partStr = '';

  if (artistMatch && !alreadySolvedArtist) {
    state.solvedArtistBy.add(userId);
    points += 1;
    partStr = 'artisti';
  }
  if (titleMatch && !alreadySolvedTitle) {
    state.solvedTitleBy.add(userId);
    points += 1;
    partStr = partStr ? 'artisti & kappale' : 'kappale';
  }

  // Jos käyttäjä ei saanut uusia pisteitä (arvasi jo aiemmin saman), ei vastata mitään
  if (points === 0) return;

  const currentScore = state.scores.get(userId) ?? 0;
  let bonus = 0;
  if (!state.firstCorrectUser) {
    state.firstCorrectUser = userId;
    bonus = 1;
  }

  state.scores.set(userId, currentScore + points + bonus);
  const songInfo = state.currentSong;
  const name = message.member?.displayName ?? message.author.username;
  const bonusStr = bonus ? ' + ⚡ **nopeusbonus**' : '';

  await (message.channel as TextChannel).send(
    `🎉 **${name}** arvasi oikein! (${partStr}) → **${points + bonus} pistettä**${bonusStr}\n` +
      `🎵 Vastaus: ||${songInfo.artist} – ${songInfo.title}||`,
  );
}
