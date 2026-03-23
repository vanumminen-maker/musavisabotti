import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
} from 'discord.js';
import { getState, fullReset } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('valmista')
  .setDescription('Lopeta musiikkitietovisa ja julkaise tulokset (vain visan vetäjä)');

export async function execute(
  interaction: ChatInputCommandInteraction,
  client: Client,
): Promise<void> {
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);

  if (!state.isActive) {
    await interaction.reply({ content: '🎮 Ei aktiivista peliä.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== state.hostId) {
    await interaction.reply({ content: '❌ Vain visan vetäjä voi lopettaa pelin!', ephemeral: true });
    return;
  }

  // Build leaderboard before resetting
  const sorted = [...state.scores.entries()].sort((a, b) => b[1] - a[1]);

  let description = '👻 **Kukaan ei saanut pisteitä tällä kertaa!**';

  if (sorted.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const lines = await Promise.all(
      sorted.map(async ([userId, score], i) => {
        const medal = medals[i] ?? `**${i + 1}.**`;
        const user = await client.users.fetch(userId).catch(() => null);
        const name = user?.username ?? userId;
        return `${medal} **${name}** – ${score} pistettä`;
      }),
    );
    description = lines.join('\n');
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 Musavisa päättyi – Lopputulokset!')
    .setDescription(description)
    .setColor(0xffd700)
    .setFooter({ text: 'Kiitos pelaamisesta!' });

  // Full reset (disconnects voice, clears all data)
  fullReset(interaction.guildId);

  await interaction.reply({ embeds: [embed] });
}
