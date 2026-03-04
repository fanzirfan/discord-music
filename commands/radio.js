const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("radio")
        .setDescription("Stream radio secara live menggunakan URL custom")
        .addStringOption((option) =>
            option
                .setName("url")
                .setDescription("Masukkan URL / Link live streaming radio")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const streamUrl = interaction.options.getString("url");
        const channel = interaction.member.voice.channel;
        
        if (!channel) {
            return interaction.reply({
                content: "❌ Kamu harus berada di voice channel!",
                flags: 64,
            });
        }

        await interaction.deferReply();

        let player = client.kazagumo.players.get(interaction.guildId);

        if (!player) {
            player = await client.kazagumo.createPlayer({
                guildId: interaction.guildId,
                textId: interaction.channelId,
                voiceId: channel.id,
                deaf: true,
            });
        }

        let res;
        try {
            // Set radio metadata
            player.data.set("isRadio", true);
            player.data.set("radioName", "Custom URL Radio");

            res = await client.kazagumo.search(streamUrl, {
                requester: interaction.user,
            });

            if (!res.tracks.length) {
                return interaction.editReply(
                    "❌ Gagal memuat stream radio. URL mungkin sedang offline, diblokir, atau menggunakan ekstensi yang tidak didukung Lavalink."
                );
            }
        } catch (e) {
            console.error("Radio stream error:", e);
            return interaction.editReply(
                "❌ Terjadi error saat menghubungkan ke link tersebut."
            );
        }

        // Clear existing queue and stop current track for radio switch
        if (player.queue.length > 0) {
            player.queue.clear();
        }

        const track = res.tracks[0];
        player.queue.add(track);

        if (player.playing || player.paused) {
            player.skip();
        } else {
            player.play();
        }

        const embedColor = process.env.EMBED_COLOR
            ? process.env.EMBED_COLOR.trim()
            : "#2b2d31";

        const embed = new EmbedBuilder()
            .setTitle("📻 Custom Radio Live")
            .setDescription(`Sedang memutar stream dari URL:\n${streamUrl.substring(0, 100)}...`)
            .setColor(embedColor)
            .addFields(
                { name: "🔴 Status", value: "Live Streaming", inline: true }
            )
            .setFooter({
                text: `Diminta oleh ${interaction.user.tag}`,
            });

        const msg = await interaction.editReply({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 10000);
    },
};
