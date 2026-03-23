import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getState } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('poista')
  .setDescription('Poista biisi omalta listaltasi')
  .addIntegerOption((o) =>
    o
      .setName('numero')
      .setDescription('Biisin numero listalla (katso /lista)')
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const state = getState(interaction.guildId);
  const numero = interaction.options.getInteger('numero', true);
  const mySongs = state.songs.filter(s => s.addedBy === interaction.user.id);

  if (numero > mySongs.length) {
    await interaction.reply({
      content: `❌ Sinulla on listallasi vain **${mySongs.length}** biisiä.`,
      ephemeral: true,
    });
    return;
  }

  const targetSong = mySongs[numero - 1];
  const globalIndex = state.songs.indexOf(targetSong);
  
  if (globalIndex > -1) {
    state.songs.splice(globalIndex, 1);
  }

  const remainingMySongs = state.songs.filter(s => s.addedBy === interaction.user.id);

  await interaction.reply({
    content: `🗑️ Poistettu: **${targetSong.artist} – ${targetSong.title}**\n📋 Sinulla on enää **${remainingMySongs.length}** biisiä.`,
    ephemeral: true,
  });
}
