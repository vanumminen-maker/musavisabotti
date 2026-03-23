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
      
      // Tarkempi haku artistille
      const artist = track.publisher_metadata?.artist || 
                     track.user?.username || 
                     track.user?.full_name || 
                     track.permalink?.split('/')[3] || 
                     'SoundCloud Artist';

      console.log(`Haku onnistui: "${artist} - ${track.name}"`);
      if (artist === 'SoundCloud Artist') {
        console.log('VAROITUS: Artistia ei löytynyt, koko track-objekti:', JSON.stringify(track).substring(0, 1000));
      }
      
      return [{
        artist: artist,
        title: track.name || 'SoundCloud Track',
        url: track.url,
      }];
    } else if (result.type === 'playlist') {
      const playlist = result as any;
      console.log(`Haetaan soittolistan biisit (${playlist.name})...`);
      const tracks = await playlist.all_tracks();
      return tracks.map((t: any) => {
        const artist = t.publisher_metadata?.artist || 
                       t.user?.username || 
                       t.user?.full_name || 
                       'SoundCloud Artist';
        return {
          artist: artist,
          title: t.name || 'SoundCloud Track',
          url: t.url,
        };
      });
    }
  } catch (err: any) {
    console.error(`Virhe SoundCloud-tietojen haussa (${url}):`, err.message);
    throw new Error('SoundCloud-tietojen haku epäonnistui. Yritä myöhemmin uudelleen.');
  }

  throw new Error('Tuntematon SoundCloud-linkki.');
}
