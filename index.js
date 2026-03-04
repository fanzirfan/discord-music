require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { Connectors } = require("shoukaku");
const { Kazagumo } = require("kazagumo");
const Spotify = require("kazagumo-spotify");
const fs = require("fs");
const chalk = require("chalk");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

const playerStateFile = "./database/playerstate.json";
client.playerStateFile = playerStateFile;
client.playerState = {};
if (fs.existsSync(playerStateFile)) {
  try {
    client.playerState = JSON.parse(fs.readFileSync(playerStateFile, "utf-8"));
  } catch (e) {
    console.error("Failed to parse playerstate.json", e);
  }
}
client.savePlayerState = () => {
    fs.writeFileSync(client.playerStateFile, JSON.stringify(client.playerState, null, 2));
};

client.leaveTimeouts = new Map();

client.commands = new Collection();
const commands = [];

// Load commands
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

// Load events
const eventFiles = fs
  .readdirSync("./events")
  .filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.once("clientReady", async () => {
  console.log(chalk.green.bold(`\n✓ Logged in successfully as ${client.user.tag}`));
  
  if (process.env.STATUS) {
    client.user.setActivity(process.env.STATUS, { type: 2 }); // 2 = Listening
    console.log(chalk.cyan(`  → Status set to: Listening to ${process.env.STATUS}`));
  }

  // Register Slash Commands
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(chalk.yellow("⏳ Started refreshing application (/) commands..."));
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log(chalk.green("✓ Successfully reloaded application (/) commands.\n"));
  } catch (error) {
    console.error(chalk.red("✖ Error reloading commands:"), error);
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  // Bot disconnected from voice channel
  if (oldState.id === client.user.id && oldState.channelId && !newState.channelId) {
    try {
      if (oldState.channelId !== "null" && oldState.channelId !== null) {
          await client.rest.put(`/channels/${oldState.channelId}/voice-status`, {
            body: { status: "" }
          });
      }
    } catch (e) {
      console.error("Failed to clear voice status on disconnect:", e);
    }
    return;
  }

  // Handle empty channel logic
  const player = client.kazagumo.players.get(oldState.guild.id);
  if (!player || !oldState.guild.members.me.voice.channel) return;

  const botChannel = oldState.guild.members.me.voice.channel;
  
  if (botChannel.members.filter(m => !m.user.bot).size === 0) {
    const timeout = setTimeout(() => {
      const p = client.kazagumo.players.get(oldState.guild.id);
      if (p) p.destroy();
    }, 60000); // 1 minute
    client.leaveTimeouts.set(oldState.guild.id, timeout);
  } else {
    if (client.leaveTimeouts.has(oldState.guild.id)) {
      clearTimeout(client.leaveTimeouts.get(oldState.guild.id));
      client.leaveTimeouts.delete(oldState.guild.id);
    }
  }
});

const Nodes = [
  {
    name: "Primary",
    url: process.env.LAVALINK_HOST + ":" + process.env.LAVALINK_PORT,
    auth: process.env.LAVALINK_PASSWORD,
    secure: false,
  },
];

client.kazagumo = new Kazagumo(
  {
    defaultSearchEngine: "youtube",
    plugins: [
      new Spotify({
        clientId: process.env.SPOTIFY_CLIENT_ID || "",
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      }),
    ],
    send: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
  },
  new Connectors.DiscordJS(client),
  Nodes,
);

client.kazagumo.shoukaku.on("ready", (name) =>
  console.log(chalk.blue.bold(`🎵 Lavalink Node: ${name} is ready!`)),
);
client.kazagumo.shoukaku.on("error", (name, error) =>
  console.error(chalk.red.bold(`✖ Lavalink Node: ${name} has error:`), error),
);

client.kazagumo.on("playerStart", async (player, track) => {
  if (client.leaveTimeouts.has(player.guildId)) {
    clearTimeout(client.leaveTimeouts.get(player.guildId));
    client.leaveTimeouts.delete(player.guildId);
  }

  const channel = client.channels.cache.get(player.textId);
  if (!channel) return;
  
  const isRadio = player.data.get("isRadio");
  const radioName = player.data.get("radioName");

  const title = isRadio ? radioName : track.title;
  const author = isRadio ? "Live Radio" : (track.author || "Unknown");

  try {
    const statusText = `🎵 ${title}`;
    await client.rest.put(`/channels/${player.voiceId}/voice-status`, {
      body: { status: statusText.substring(0, 500) }
    });
  } catch (e) {
    console.error("Failed to set voice status:", e);
  }

  const embedColor = process.env.EMBED_COLOR ? process.env.EMBED_COLOR.trim() : "#2b2d31";
  
  const embed = new EmbedBuilder()
    .setTitle("🎵")
    .setDescription(`**[${title}](${track.uri})**`)
    .setColor(embedColor)
    .setThumbnail(track.thumbnail || null)
    .addFields(
      { name: "👤 Artist", value: author, inline: true },
      { name: "⏱️ Duration", value: track.isStream ? "🔴 Live" : (track.length ? new Date(track.length).toISOString().substr(11, 8).replace(/^00:/, '') : "Unknown"), inline: true },
      { name: "🎭 Platform", value: track.sourceName === "youtube" ? "🔴 YouTube" : `${track.sourceName}`, inline: true },
      { name: "⚙️ Status", value: "▶️ Playing ⏳", inline: false }
    )
    .setFooter({ text: `Requested by ${track.requester?.tag || "Unknown"}` });

  let components = [];

  if (isRadio) {
    const radioRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("Stop")
        .setEmoji("⏹️")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("volume")
        .setLabel("Volume")
        .setEmoji("🔊")
        .setStyle(ButtonStyle.Secondary)
    );
    components = [radioRow];
  } else {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("pause_resume")
        .setLabel("Pause")
        .setEmoji("⏸️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("skip")
        .setLabel("Skip")
        .setEmoji("⏭️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("Stop")
        .setEmoji("⏹️")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("queue")
        .setLabel("Queue")
        .setEmoji("📋")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("shuffle")
        .setLabel("Shuffle")
        .setEmoji("🔀")
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("volume")
        .setLabel("Volume")
        .setEmoji("🔊")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("loop")
        .setLabel("Loop: Off")
        .setEmoji("🔁")
        .setStyle(ButtonStyle.Secondary)
    );
    components = [row1, row2];
  }

  let sent = false;
  const oldMsgId = client.playerState[player.guildId];
  if (oldMsgId) {
    try {
      const msg = await channel.messages.fetch(oldMsgId);
      if (msg) {
        await msg.edit({ embeds: [embed], components: components });
        sent = true;
      }
    } catch (e) {
      // Message might have been deleted, proceed to send a new one
    }
  }

  if (!sent) {
    const newMsg = await channel.send({ embeds: [embed], components: components });
    client.playerState[player.guildId] = newMsg.id;
    client.savePlayerState();
  }
});

async function disablePlayerButtons(player) {
  const oldMsgId = client.playerState[player.guildId];
  if (oldMsgId) {
    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;
    try {
      const msg = await channel.messages.fetch(oldMsgId);
      if (msg && msg.components) {
        const newComponents = msg.components.map(actionRow => {
            const newRow = new ActionRowBuilder();
            actionRow.components.forEach(component => {
                const newButton = ButtonBuilder.from(component).setDisabled(true);
                newRow.addComponents(newButton);
            });
            return newRow;
        });
        await msg.edit({ components: newComponents });
      }
    } catch (e) {
      // Ignore
    }
    
    // Cleanup state
    delete client.playerState[player.guildId];
    client.savePlayerState();
  }
}

client.kazagumo.on("playerDestroy", async (player) => {
  try {
    if (player.voiceId && player.voiceId !== "null") {
        await client.rest.put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: "" }
        });
    }
  } catch (e) {
    console.error("Failed to clear voice status:", e);
  }
  await disablePlayerButtons(player);
});

client.kazagumo.on("playerEmpty", async (player) => {
  try {
    if (player.voiceId && player.voiceId !== "null") {
        await client.rest.put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: "" }
        });
    }
  } catch (e) {
    console.error("Failed to clear voice status:", e);
  }
  await disablePlayerButtons(player);

  const timeout = setTimeout(() => {
    const p = client.kazagumo.players.get(player.guildId);
    if (p && p.queue.length === 0 && !p.playing) {
      p.destroy();
    }
  }, 60000); // destroy after 60s inactivity
  client.leaveTimeouts.set(player.guildId, timeout);
});

client.login(process.env.DISCORD_TOKEN);
