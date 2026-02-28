const { ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { canModifyPlayer } = require("../utils/permissions");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            flags: 64,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: 64,
          });
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.autocomplete(interaction, client);
      } catch (error) {
        console.error(error);
      }
    } else if (interaction.isButton()) {
      const player = client.kazagumo.players.get(interaction.guildId);
      if (!player) {
        return interaction.reply({
          content: "There is no music playing.",
          flags: 64,
        });
      }

      if (interaction.customId !== 'queue' && !canModifyPlayer(interaction, player)) {
          return interaction.reply({ 
              content: "❌ You don't have permission to use this! Only the song requester or Admins can.", 
              flags: 64 
          });
      }

      switch (interaction.customId) {
        case "pause_resume":
          player.pause(!player.paused);
          await interaction.reply({
            content: player.paused
              ? "⏸️ Successfully paused."
              : "▶️ Successfully resumed.",
            flags: 64,
          });
          
          const oldMsgId = client.playerState[player.guildId];
          if (oldMsgId) {
              try {
                  const msg = await interaction.channel.messages.fetch(oldMsgId);
                  if (msg && msg.components) {
                      const newComponents = msg.components.map(actionRow => {
                          const newRow = new ActionRowBuilder();
                          actionRow.components.forEach(component => {
                              if (component.customId === 'pause_resume') {
                                  const newButton = ButtonBuilder.from(component)
                                      .setLabel(player.paused ? "Resume" : "Pause")
                                      .setEmoji(player.paused ? "▶️" : "⏸️");
                                  newRow.addComponents(newButton);
                              } else {
                                  newRow.addComponents(ButtonBuilder.from(component));
                              }
                          });
                          return newRow;
                      });
                      await msg.edit({ components: newComponents });
                  }
              } catch (e) {
                  // Ignore missing message
              }
          }
          break;
        case "skip":
          player.skip();
          await interaction.reply({
            content: "⏭️ Successfully skipped.",
            flags: 64,
          });
          break;
        case "stop":
          player.destroy();
          await interaction.reply({
            content: "⏹️ Music stopped and bot left.",
            flags: 64,
          });
          break;
        case "queue":
          if (player.queue.length === 0) {
              await interaction.reply({ content: "The queue is empty.", flags: 64 });
          } else {
              const queueItems = player.queue.slice(0, 10).map((t, i) => `${i + 1}. **${t.title}**`);
              const remaining = player.queue.length > 10 ? player.queue.length - 10 : 0;
              
              let message = `🎵 **Current Queue:**\n${queueItems.join('\n')}`;
              if (remaining > 0) {
                  message += `\n\n...and ${remaining} more songs.`;
              }
              
              await interaction.reply({ content: message, flags: 64 });
          }
          break;
        case "shuffle":
          if (player.queue.length > 0) {
              player.queue.shuffle();
              await interaction.reply({ content: "🔀 Successfully shuffled the queue.", flags: 64 });
          } else {
              await interaction.reply({ content: "The queue is empty.", flags: 64 });
          }
          break;
        case "volume":
          const modal = new ModalBuilder()
            .setCustomId("volume_modal")
            .setTitle("Adjust Volume");

          const volumeInput = new TextInputBuilder()
            .setCustomId("volume_input")
            .setLabel("Volume Percentage (1-200)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("100")
            .setRequired(true);

          const firstActionRow = new ActionRowBuilder().addComponents(volumeInput);
          modal.addComponents(firstActionRow);

          await interaction.showModal(modal);
          break;
        case "loop":
          const currentLoop = player.loop === "none" ? "track" : "none";
          player.setLoop(currentLoop);
          await interaction.reply({ content: `🔁 Loop set to ${currentLoop}.`, flags: 64 });
          
          const loopMsgId = client.playerState[player.guildId];
          if (loopMsgId) {
              try {
                  const msg = await interaction.channel.messages.fetch(loopMsgId);
                  if (msg && msg.components) {
                      const newComponents = msg.components.map(actionRow => {
                          const newRow = new ActionRowBuilder();
                          actionRow.components.forEach(component => {
                              if (component.customId === 'loop') {
                                  const newButton = ButtonBuilder.from(component)
                                      .setLabel(`Loop: ${currentLoop === 'none' ? 'Off' : 'Track'}`)
                                      .setEmoji("🔁");
                                  newRow.addComponents(newButton);
                              } else {
                                  newRow.addComponents(ButtonBuilder.from(component));
                              }
                          });
                          return newRow;
                      });
                      await msg.edit({ components: newComponents });
                  }
              } catch (e) {}
          }
          break;
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === "volume_modal") {
        const player = client.kazagumo.players.get(interaction.guildId);
        if (!player) {
           return interaction.reply({ content: "There is no music playing.", flags: 64 });
        }

        const rawVolume = interaction.fields.getTextInputValue("volume_input");
        const volume = parseInt(rawVolume, 10);

        if (isNaN(volume) || volume < 1 || volume > 200) {
          return interaction.reply({ content: "Please enter a valid number between 1 and 200.", flags: 64 });
        }

        player.setVolume(volume);
        await interaction.reply({ content: `🔊 Volume set to **${volume}%**.`, flags: 64 });
      }
    }
  }
};
