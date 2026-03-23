import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { fullReset } from '../game/state';

export const data = new SlashCommandBuilder()
  .setName('poistu')
  .setDescription('Lopeta kaikki ja poistu äänikanavalta');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return;
  
  fullReset(interaction.guildId);
  await interaction.reply('🤘 Kiitos jameista ja palataan! PS. Tykitellään');
}
