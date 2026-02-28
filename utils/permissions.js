const { PermissionFlagsBits } = require('discord.js');

function canModifyPlayer(interaction, player) {
    if (!player) return false;
    
    // Admin or Manage Channels bypass
    if (interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) || 
        interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    // Require current playing song requester to match
    if (player.queue.current && player.queue.current.requester) {
        if (player.queue.current.requester.id === interaction.user.id) {
            return true;
        }
    }
    
    return false;
}

module.exports = { canModifyPlayer };
