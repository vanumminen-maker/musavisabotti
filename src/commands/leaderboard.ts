import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Client,
} from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Näytä pisteet kesken pelin');

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

  const sorted = [...state.scores.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    await interaction.reply({ content: '📊 Ei vielä pisteitä.', ephemeral: true });
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = await Promise.all(
    sorted.map(async ([userId, score], i) => {
      const medal = medals[i] ?? `**${i + 1}.**`;
      const user = await client.users.fetch(userId).catch(() => null);
      const name = user?.username ?? userId;
      return `${medal} **${name}** – ${score} pistettä`;
    }),
  );

  const embed = new EmbedBuilder()
    .setTitle('📊 Pisteet')
    .setDescription(lines.join('\n'))
    .setColor(0x5865f2);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
