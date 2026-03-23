import play from 'play-dl';

export interface SoundCloudTrack {
  artist: string;
  title: string;
  url: string;
}

export async function getSoundCloudInfo(url: string): Promise<SoundCloudTrack[]> {
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

  throw new Error('Tuntematon SoundCloud-linkki.');
}
