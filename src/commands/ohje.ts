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
        name: '🎮 1. Musavisa (Kilpailu)',
        value: [
          '`/lisää url` – Lisää biisi/lista visaan',
          '`/musavisa` – Aloita visa (30s per biisi)',
          '`/next` – Seuraava biisi',
          '`/stop` – Paljasta vastaus',
          '`/lopeta` – Lopeta visa ja katso tulokset',
        ].join('\n'),
      },
      {
        name: '🎧 2. Musiikin kuuntelu',
        value: [
          '`/liity` – Kutsu botti kanavalle kuuntelemaan',
          '`/jono url` – Lisää biisi/lista jonoon',
          '`/skip` – Seuraava biisi',
          '`/skip jono` – Tyhjennä koko jono',
          '`/pause` / `/play` – Pysäytä ja jatka',
          '`/poistu` – Lopeta ja poistu',
        ].join('\n'),
      },
      {
        name: '🏆 Pisteytys (Visassa)',
        value: 'Artisti + kappale = **2p** | Toinen oikein = **1p**\nNopeusbonus ⚡ = **+1p** ensimmäiselle oikein arvanneelle.',
      },
      {
        name: '💬 Arvaaminen',
        value: 'Kirjoita arvauksesi tekstiviestinä kanavalle. Botti hyväksyy pienet kirjoitusvirheet!',
      },
    )
    .setFooter({ text: 'Hauskaa pelailua! 🎶' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
