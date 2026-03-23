import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('poista')
  .setDescription('Poista biisi listalta (vain ylläpitäjä)')
  .addIntegerOption((o) =>
    o
      .setName('numero')
      .setDescription('Biisin numero listalla (katso /lista)')
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: '❌ Tarvitset **Manage Messages** -oikeuden!', ephemeral: true });
    return;
  }
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);
  const numero = interaction.options.getInteger('numero', true);

  if (numero > state.songs.length) {
    await interaction.reply({
      content: `❌ Listalla on vain **${state.songs.length}** biisiä.`,
      ephemeral: true,
    });
    return;
  }

  const [removed] = state.songs.splice(numero - 1, 1);
  await interaction.reply({
    content: `🗑️ Poistettu: **${removed.artist} – ${removed.title}**\n📋 Listalla nyt **${state.songs.length}** biisiä.`,
    ephemeral: true,
  });
}
