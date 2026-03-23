function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) dp[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] =
        b[i - 1] === a[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[b.length][a.length];
}

function isClose(input: string, target: string, threshold = 0.3): boolean {
  if (target.length === 0) return input.length === 0;
  const maxDist = Math.max(1, Math.floor(target.length * threshold));
  return levenshtein(input, target) <= maxDist;
}

export interface GuessResult {
  artistMatch: boolean;
  titleMatch: boolean;
}

/**
 * Checks if a guess matches the artist and/or title.
 * Checks both the full guess and individual words (≥3 chars) against
 * the artist/title and their individual words.
 */
export function checkGuess(guess: string, artist: string, title: string): GuessResult {
  const g = guess.toLowerCase().trim();
  const a = artist.toLowerCase().trim();
  const t = title.toLowerCase().trim();

  let artistMatch = false;
  let titleMatch = false;

  // Full-string match
  if (isClose(g, a)) artistMatch = true;
  if (isClose(g, t)) titleMatch = true;

  // Word-by-word match
  const words = g.split(/\s+/).filter((w) => w.length >= 3);
  const artistWords = a.split(/\s+/).filter((w) => w.length >= 3);
  const titleWords = t.split(/\s+/).filter((w) => w.length >= 3);

  for (const word of words) {
    if (isClose(word, a)) artistMatch = true;
    if (isClose(word, t)) titleMatch = true;
    for (const aw of artistWords) if (isClose(word, aw)) artistMatch = true;
    for (const tw of titleWords) if (isClose(word, tw)) titleMatch = true;
  }

  return { artistMatch, titleMatch };
}
