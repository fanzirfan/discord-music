const { SlashCommandBuilder } = require('discord.js');
const { canModifyPlayer } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback and clear the queue'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guildId);
        
        if (!player) {
            return interaction.reply({ content: 'There is no music playing.', flags: 64 });
        }
        
        if (!canModifyPlayer(interaction, player)) {
            return interaction.reply({ content: "❌ You don't have permission to do this! Only the song requester or Admins can.", flags: 64 });
        }
        
        player.destroy();
        return interaction.reply('⏹️ Music stopped.');
    }
};
