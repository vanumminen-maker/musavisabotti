import { AudioPlayer, VoiceConnection } from '@discordjs/voice';

export interface Song {
  artist: string;
  title: string;
  url: string;
}

export interface GameState {
  songs: Song[];
  currentSong: Song | null;
  scores: Map<string, number>;
  firstCorrectUser: string | null;
  player: AudioPlayer | null;
  connection: VoiceConnection | null;
  timer: ReturnType<typeof setTimeout> | null;
  textChannelId: string | null;
  isActive: boolean;
}

const states = new Map<string, GameState>();

function createEmptyState(): GameState {
  return {
    songs: [],
    currentSong: null,
    scores: new Map(),
    firstCorrectUser: null,
    player: null,
    connection: null,
    timer: null,
    textChannelId: null,
    isActive: false,
  };
}

export function getState(guildId: string): GameState {
  if (!states.has(guildId)) {
    states.set(guildId, createEmptyState());
  }
  return states.get(guildId)!;
}

/** Stops the current song/timer without ending the game session. */
export function stopCurrentSong(guildId: string): void {
  const state = getState(guildId);
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  if (state.player) state.player.stop();
  state.currentSong = null;
  state.firstCorrectUser = null;
}

/** Full reset: ends the game and clears everything (songs, scores, connections). */
export function fullReset(guildId: string): void {
  const state = getState(guildId);
  if (state.timer) clearTimeout(state.timer);
  if (state.player) state.player.stop();
  if (state.connection) {
    try { state.connection.destroy(); } catch { /* ignore */ }
  }
  states.set(guildId, createEmptyState());
}
