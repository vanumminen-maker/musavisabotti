import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, Client } from 'discord.js';
import { getState } from '../game/state';
import { startNextSong } from '../game/play';

export const data = new SlashCommandBuilder()
  .setName('next')
  .setDescription('Siirry seuraavaan biisiin (vain ylläpitäjä)');

export async function execute(
  interaction: ChatInputCommandInteraction,
  client: Client,
): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: '❌ Tarvitset **Manage Messages** -oikeuden!', ephemeral: true });
    return;
  }
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);

  if (!state.isActive) {
    await interaction.reply({
      content: '🎮 Ei aktiivista peliä. Aloita `/musavisa`-komennolla.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const result = await startNextSong(interaction.guildId, client);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  await interaction.editReply(
    '🎵 **Seuraava biisi alkaa!** Arvaa artisti ja/tai kappaleen nimi! ⏰ 30 sekuntia aikaa!',
  );
}
