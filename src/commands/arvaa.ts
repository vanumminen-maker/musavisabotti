import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { processGuess } from '../game/play';

export const data = new SlashCommandBuilder()
  .setName('arvaa')
  .setDescription('Arvaa biisin artisti ja/tai kappale (Piilotettu vastaus)')
  .addStringOption((o) =>
    o.setName('vastaus').setDescription('Arvaamasi teksti').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;

  const content = interaction.options.getString('vastaus', true);
  const result = processGuess(interaction.guildId, interaction.user.id, content);

  if (!result) {
    await interaction.reply({
      content: '❌ Väärin! Yritä uudelleen.',
      ephemeral: true,
    });
    return;
  }

  const bonusStr = result.bonus ? ' + ⚡ **nopeusbonus**' : '';

  // Yksityinen vastaus arvaajalle (sisältää oikean nimen)
  await interaction.reply({
    content: `✅ **Oikein!** (${result.partStr}) → **${result.points + result.bonus} pistettä**${bonusStr}\n` +
      `🎵 Vastaus oli: ||${result.songInfo.artist} – ${result.songInfo.title}||`,
    ephemeral: true,
  });

  // Julkinen ilmoitus kanavalle (ilman oikeaa vastausta)
  if (interaction.channel && interaction.channel.isTextBased()) {
    await (interaction.channel as TextChannel).send(
      `🎉 **${interaction.user.username}** sai pisteitä! (${result.partStr})${bonusStr}`,
    );
  }
}
