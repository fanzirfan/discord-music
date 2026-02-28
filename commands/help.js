const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows the list of available commands and bot info'),
        
    async execute(interaction, client) {
        const embedColor = process.env.EMBED_COLOR ? process.env.EMBED_COLOR.trim() : '#FF6B6B';
        const supportServer = process.env.SUPPORT_SERVER || 'https://discord.gg/Y7XWyjHR';
        const website = process.env.WEBSITE || 'https://youtube.com';

        let totalSeconds = (client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        const embed = new EmbedBuilder()
            .setTitle('🤖 DJ Ohim Bot Help')
            .setDescription('Here are the available commands and information about this bot.')
            .setColor(embedColor)
            .addFields(
                { name: '📊 Status Information', value: `
**⏱️ Uptime:** \`${uptimeString}\`
**📡 API Ping:** \`${client.ws.ping}ms\`
**🌍 Servers:** \`${client.guilds.cache.size}\`
                `},
                { name: '🎵 Music Commands', value: `
\`/play <query>\` - Play a song from YouTube, SoundCloud, or Spotify
\`/pause\` - Pause the currently playing song
\`/resume\` - Resume the paused song
\`/skip\` - Skip the currently playing song
\`/stop\` - Stop the music and clear the queue
                ` },
                { name: '🌐 Links', value: `[Support Server](${supportServer}) | [Website](${website})` }
            )
            .setFooter({ text: 'DJ Ohim Music System' });

        await interaction.reply({ embeds: [embed] });
    }
};
