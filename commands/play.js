const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube/SoundCloud')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('Song title or URL')
                .setRequired(true)
                .setAutocomplete(true)),
                
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        if (!focusedValue) return interaction.respond([]).catch(() => {});
        
        try {
            const res = await client.kazagumo.search(focusedValue).catch(() => null);
            let choices = [];
            
            if (res && res.tracks && res.tracks.length > 0) {
                choices = res.tracks.slice(0, 5).map(track => {
                    const name = `${track.title} - ${track.author}`;
                    return {
                        name: name.length > 100 ? name.substring(0, 97) + '...' : name,
                        value: track.uri.length > 100 ? track.uri.substring(0, 100) : track.uri
                    };
                });
            }
            
            await interaction.respond(choices).catch(() => {});
        } catch (e) {
            console.error(e);
            await interaction.respond([]).catch(() => {});
        }
    },
    
    async execute(interaction, client) {
        const query = interaction.options.getString('query');
        const channel = interaction.member.voice.channel;
        
        if (!channel) {
            return interaction.reply({ content: 'You must be in a voice channel!', flags: 64 });
        }
        
        // Defer early to prevent "Unknown Interaction" timeout (takes 3s+)
        await interaction.deferReply();
        
        let player = client.kazagumo.players.get(interaction.guildId);
        
        if (!player) {
            player = await client.kazagumo.createPlayer({
                guildId: interaction.guildId,
                textId: interaction.channelId,
                voiceId: channel.id,
                deaf: true
            });
        }
        
        let res;
        try {
            player.data.delete("isRadio");
            res = await client.kazagumo.search(query, { requester: interaction.user });
            if (!res.tracks.length) return interaction.editReply("Song not found!");
        } catch (e) {
            console.error(e);
            return interaction.editReply("An error occurred while searching for the song...");
        }
        
        if (res.type === "PLAYLIST") {
            for (let track of res.tracks) player.queue.add(track);
            const msg = await interaction.editReply(`✅ Added ${res.tracks.length} songs from playlist **${res.playlistName}** to the queue.`);
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        } else {
            player.queue.add(res.tracks[0]);
            const msg = await interaction.editReply(`✅ Added **${res.tracks[0].title}** to the queue.`);
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        }
        
        if (!player.playing && !player.paused) player.play();
    }
};
