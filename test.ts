import { exec } from 'youtube-dl-exec';

async function test() {
  try {
    const subprocess = exec('https://www.youtube.com/watch?v=rP6Wi4K60hI', {
      output: '-',
      format: 'bestaudio',
      limitRate: '1M',
      quiet: true,
    }, { stdio: ['ignore', 'pipe', 'ignore'] });

    if (!subprocess.stdout) {
      console.error('No stdout');
      process.exit(1);
    }

    subprocess.stdout.once('data', (d) => {
      console.log('Got data from yt-dlp:', d.length);
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Timeout');
      process.exit(1);
    }, 10000);
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

test();
