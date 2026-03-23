import play from 'play-dl';

// Alusta SoundCloud-yhteys tarvittaessa
let isAuthorized = false;

async function ensureAuthorized() {
  if (isAuthorized) return;
  try {
    // play-dl yrittää hakea Client ID:n automaattisesti, mutta voimme auttaa
    const clientId = await play.getFreeClientID();
    await play.setToken({
      soundcloud: {
        client_id: clientId
      }
    });
    isAuthorized = true;
    console.log('SoundCloud-valtuutus tehty onnistuneesti.');
  } catch (err) {
    console.error('SoundCloud-valtuutus epäonnistui:', err);
  }
}

export interface SoundCloudTrack {
  artist: string;
  title: string;
  url: string;
}

export async function getSoundCloudInfo(url: string): Promise<SoundCloudTrack[]> {
  await ensureAuthorized();
  
  try {
    const result = await play.soundcloud(url);

    if (result.type === 'track') {
      const track = result as any;
      return [{
        artist: track.user.username,
        title: track.name,
        url: track.url,
      }];
    } else if (result.type === 'playlist') {
      const playlist = result as any;
      const tracks = await playlist.all_tracks();
      return tracks.map((t: any) => ({
        artist: t.user.username,
        title: t.name,
        url: t.url,
      }));
    }
  } catch (err: any) {
    console.error(`Virhe SoundCloud-tietojen haussa (${url}):`, err.message);
    throw new Error('SoundCloud-tietojen haku epäonnistui. Yritä myöhemmin uudelleen.');
  }

  throw new Error('Tuntematon SoundCloud-linkki.');
}
