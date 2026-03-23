// Käytetään globaalia fetchiä (Node 18+)

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID tai SPOTIFY_CLIENT_SECRET puuttuu Railwaysta!');
  }

  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Spotify-kirjautuminen epäonnistui. Tarkista Client ID ja Secret.');
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000; // Vähennetään minuutti varmuuden vuoksi

  return accessToken;
}

export interface SpotifyTrack {
  artist: string;
  title: string;
  previewUrl: string | null;
  id: string;
}

export async function getTrackInfo(trackId: string): Promise<SpotifyTrack> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Biisiä ei löytynyt Spotifysta.');

  const data = (await response.json()) as any;
  return {
    artist: data.artists[0].name,
    title: data.name,
    previewUrl: data.preview_url,
    id: data.id,
  };
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Soittolistaa ei löytynyt Spotifysta.');

  const data = (await response.json()) as any;
  return data.items
    .map((item: any) => ({
      artist: item.track.artists[0].name,
      title: item.track.name,
      previewUrl: item.track.preview_url,
      id: item.track.id,
    }))
    .filter((track: any) => track.previewUrl !== null);
}

export async function getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Albumia ei löytynyt Spotifysta.');

  const data = (await response.json()) as any;
  return data.items
    .map((item: any) => ({
      artist: item.artists[0].name,
      title: item.name,
      previewUrl: item.preview_url,
      id: item.id,
    }))
    .filter((track: any) => track.previewUrl !== null);
}
