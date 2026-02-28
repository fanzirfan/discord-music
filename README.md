# 🎵 DJ Ohim - Discord Music Bot

A feature-rich Discord Music Bot built with [Discord.js v14](https://discord.js.org/) and [Kazagumo](https://github.com/Takiyo0/Kazagumo) (Lavalink client). Enjoy high-quality music playback from various sources like YouTube, Spotify, and SoundCloud right in your Discord server.

## ✨ Features

- 🎶 **Multiple Sources:** Play music from YouTube, Spotify, and SoundCloud.
- 🎛️ **Interactive Play Panel:** Control playback via interactive buttons (Pause/Resume, Skip, Stop, Queue, Shuffle, Volume, and Loop).
- 🔐 **Permission Controls:** Only the song requester or Admins can manipulate playback.
- 🚪 **Auto-Leave:** Automatically disconnects after 60 seconds of inactivity (empty queue or empty voice channel).
- 📊 **Status Metrics:** Real-time monitoring of bot uptime, API ping, and server count via the `/help` command.
- 🎨 **Customizable:** Easily configure the embed color and bot status via `.env`.

## 🚀 Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/fanzirfan/discord-music.git
   cd discord-music
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure the Environment:**
   - Copy `.env.example` and rename it to `.env`.
   - Fill in your Discord Bot Token, Lavalink Node details, and (optionally) Spotify Client credentials.

4. **Run the Bot:**
   ```bash
   npm start
   ```

## 🛠️ Requirements

- Node.js `v16.9.0` or higher
- A running Lavalink node (v4 recommended)
- A Discord Bot Token (from the Discord Developer Portal)

## 📝 Commands

- `/play <query>` - Play a song from YouTube, SoundCloud, or Spotify
- `/pause` - Pause the currently playing song
- `/resume` - Resume the paused song
- `/skip` - Skip the currently playing song
- `/stop` - Stop the music and clear the queue
- `/help` - Shows the list of available commands and bot metrics

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/fanzirfan/discord-music/issues).
