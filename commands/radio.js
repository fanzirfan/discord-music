const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const radioStations = require("../data/radio-stations.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("radio")
        .setDescription("Stream radio Indonesia secara live")
        .addStringOption((option) =>
            option
                .setName("station")
                .setDescription("Pilih stasiun radio")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = radioStations
            .filter(
                (s) =>
                    s.name.toLowerCase().includes(focusedValue) ||
                    s.city.toLowerCase().includes(focusedValue) ||
                    s.genre.toLowerCase().includes(focusedValue)
            )
            .slice(0, 25);

        await interaction
            .respond(
                filtered.map((s) => ({
                    name: `📻 ${s.name} — ${s.genre} (${s.city})`,
                    value: s.name,
                }))
            )
            .catch(() => {});
    },

    async execute(interaction, client) {
        const stationName = interaction.options.getString("station");
        const station = radioStations.find(
            (s) => s.name.toLowerCase() === stationName.toLowerCase()
        );

        if (!station) {
            return interaction.reply({
                content: "❌ Stasiun radio tidak ditemukan. Silakan pilih dari daftar autocomplete.",
                flags: 64,
            });
        }

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
            // Set radio metadata before playing
            const currentIndex = radioStations.findIndex(s => s.name === station.name);
            player.data.set("isRadio", true);
            player.data.set("radioIndex", currentIndex);
            player.data.set("radioName", station.name);

            res = await client.kazagumo.search(station.url, {
                requester: interaction.user,
            });

            if (!res.tracks.length) {
                return interaction.editReply(
                    "❌ Gagal memuat stream radio. Stasiun mungkin sedang offline."
                );
            }
        } catch (e) {
            console.error("Radio stream error:", e);
            return interaction.editReply(
                "❌ Terjadi error saat memuat stream radio."
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
            .setTitle("📻 Radio Live")
            .setDescription(`Sedang memutar **${station.name}**`)
            .setColor(embedColor)
            .addFields(
                { name: "🎵 Genre", value: station.genre, inline: true },
                { name: "📍 Kota", value: station.city, inline: true },
                { name: "🔴 Status", value: "Live Streaming", inline: true }
            )
            .setFooter({
                text: `Diminta oleh ${interaction.user.tag}`,
            });

        const msg = await interaction.editReply({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 10000);
    },
};
