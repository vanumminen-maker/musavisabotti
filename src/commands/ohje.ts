import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ohje')
  .setDescription('Näytä musavisabotin käyttöohjeet');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('🎵 Musavisabotti – Käyttöohjeet')
    .setColor(0x5865f2)
    .setDescription(
      'Musiikkitietovisa Discord-äänikanavalla! Botti soittaa **SoundCloud-biisejä** ja pelaajat arvaavat artistin ja/tai kappaleen nimen.',
    )
    .addFields(
      {
        name: '📋 Valmistelu (ylläpitäjä)',
        value: [
          '`/lisää url` – Lisää biisi tai soittolista SoundCloudista',
          '`/lista` – Näytä lisätyt biiset',
          '`/poista numero` – Poista biisi listalta',
        ].join('\n'),
      },
      {
        name: '🎮 Pelin kulku (ylläpitäjä)',
        value: [
          '`/musavisa` – Aloita peli (liity ensin äänikanavalle!)',
          '`/next` – Seuraava biisi',
          '`/stop` – Keskeytä biisi ja paljasta vastaus',
          '`/lopeta` – Lopeta peli ja julkaise tulokset',
        ].join('\n'),
      },
      {
        name: '🏆 Pisteytysjärjestelmä',
        value: [
          '**2 pistettä** – Artisti ja kappale oikein',
          '**1 piste** – Jompikumpi oikein',
          '**+1 bonuspiste** ⚡ – Ensimmäinen oikea vastaus',
          'Botti hyväksyy pienet kirjoitusvirheet automaattisesti.',
        ].join('\n'),
      },
      {
        name: '💬 Arvaaminen',
        value: 'Kirjoita arvauksesi normaalina viestinä tälle kanavalle – ei huutomerkkejä tai komentoja!',
      },
      {
        name: '📊 Muut komennot',
        value: '`/leaderboard` – Katso pisteet kesken pelin',
      },
    )
    .setFooter({ text: 'Hauskaa pelailua! 🎶' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
