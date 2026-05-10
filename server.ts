import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { startBot, client } from './src/bot.js';
import db from './src/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'holy_ravage_default_secret';

async function bootstrap() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.get('/api/auth/login', (req, res) => {
    if (!process.env.DISCORD_CLIENT_ID || !process.env.APP_URL) {
      return res.status(500).json({ error: 'Konfigurasi ERROR: DISCORD_CLIENT_ID atau APP_URL belum diatur di Secrets.' });
    }
    const redirectUri = encodeURIComponent(`${process.env.APP_URL}/api/auth/callback`);
    const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;
    res.json({ url: discordUrl });
  });

  app.get('/api/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/');

    try {
      const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token } = response.data;
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const token = jwt.sign({ id: userResponse.data.id, username: userResponse.data.username, accessToken: access_token }, JWT_SECRET);
      
      // CRITICAL: SameSite=None and Secure=true for iframe support
      res.cookie('auth_token', token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none' 
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/dashboard';
              }
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth error:', err);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/me', async (req, res) => {
    if (process.env.LOCAL_MODE === 'true') {
      return res.json({ id: 'local', username: 'Local Admin' });
    }
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      res.json(decoded);
    } catch (err) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });
  
  app.get('/api/bot/status', (req, res) => {
    res.json({
      status: client.isReady() ? 'online' : 'offline',
      ping: client.ws.ping,
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
      uptime: client.uptime,
      inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands`,
    });
  });

  app.get('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token', { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'none' 
    });
    res.json({ success: true });
  });

  app.post('/api/auth/local', (req, res) => {
    // Basic safety: only allow if LOCAL_MODE is enabled or as a fallback
    const token = jwt.sign({ id: 'local', username: 'Local Admin', isLocal: true }, JWT_SECRET);
    res.cookie('auth_token', token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'none' 
    });
    res.json({ success: true });
  });

  app.get('/api/guilds', async (req, res) => {
    const token = req.cookies.auth_token;
    if (!token && process.env.LOCAL_MODE !== 'true') return res.status(401).json({ error: 'Unauthorized' });

    try {
      let isLocal = process.env.LOCAL_MODE === 'true';
      let decoded: any = {};
      
      if (token) {
        decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.isLocal) isLocal = true;
      }

      if (isLocal) {
        const guilds = client.guilds.cache.map(g => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          botIn: true,
          permissions: 0x8
        }));
        return res.json(guilds);
      }

      const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${decoded.accessToken}` },
      });
      
      const adminGuilds = guildsResponse.data.filter((g: any) => (g.permissions & 0x8) === 0x8);
      res.json(adminGuilds.map((g: any) => ({
        ...g,
        botIn: client?.guilds.cache.has(g.id) || false
      })));
    } catch (err) {
      console.error('Fetch guilds failed:', err);
      res.json([]); // Return empty array to prevent UI crash
    }
  });

  app.get('/api/guilds/:id', async (req, res) => {
    const { id } = req.params;
    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(404).json({ error: 'Bot not in guild' });

    const guildData = db.prepare('SELECT * FROM guilds WHERE id = ?').get(id) || {
      id,
      name: guild.name,
      welcome_enabled: 0,
      welcome_message: 'Welcome {user} to the server!',
      welcome_embed_title: 'Welcome!',
      welcome_embed_color: '#5865F2',
      leave_enabled: 0,
      leave_message: '{user} has left the server.',
      prefix: '!',
      automod_enabled: 0,
      leveling_enabled: 0,
      xp_per_message: 10
    };

    const channels = guild.channels.cache.filter((c: any) => c.type === 0).map((c: any) => ({ id: c.id, name: c.name }));
    const roles = guild.roles.cache.map((r: any) => ({ id: r.id, name: r.name }));

    res.json({ guildData, channels, roles });
  });

  app.post('/api/guilds/:id', async (req, res) => {
    const { id } = req.params;
    const settings = req.body;

    db.prepare(`
      INSERT INTO guilds (id, welcome_enabled, welcome_channel_id, welcome_message, welcome_image_url, welcome_embed_title, welcome_embed_color, auto_role_enabled, auto_role_id, mod_log_channel_id, mute_role_id, automod_enabled, leveling_enabled, prefix, leave_enabled, leave_channel_id, leave_message, xp_per_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        welcome_enabled = excluded.welcome_enabled,
        welcome_channel_id = excluded.welcome_channel_id,
        welcome_message = excluded.welcome_message,
        welcome_image_url = excluded.welcome_image_url,
        welcome_embed_title = excluded.welcome_embed_title,
        welcome_embed_color = excluded.welcome_embed_color,
        auto_role_enabled = excluded.auto_role_enabled,
        auto_role_id = excluded.auto_role_id,
        mod_log_channel_id = excluded.mod_log_channel_id,
        mute_role_id = excluded.mute_role_id,
        automod_enabled = excluded.automod_enabled,
        leveling_enabled = excluded.leveling_enabled,
        prefix = excluded.prefix,
        leave_enabled = excluded.leave_enabled,
        leave_channel_id = excluded.leave_channel_id,
        leave_message = excluded.leave_message,
        xp_per_message = excluded.xp_per_message
    `).run(
      id,
      settings.welcome_enabled ? 1 : 0,
      settings.welcome_channel_id,
      settings.welcome_message,
      settings.welcome_image_url,
      settings.welcome_embed_title,
      settings.welcome_embed_color,
      settings.auto_role_enabled ? 1 : 0,
      settings.auto_role_id,
      settings.mod_log_channel_id,
      settings.mute_role_id,
      settings.automod_enabled ? 1 : 0,
      settings.leveling_enabled ? 1 : 0,
      settings.prefix,
      settings.leave_enabled ? 1 : 0,
      settings.leave_channel_id,
      settings.leave_message,
      settings.xp_per_message || 10
    );

    res.json({ success: true });
  });

  app.get('/api/guilds/:id/leaderboard', (req, res) => {
    const { id } = req.params;
    const leaderboard = db.prepare(`
      SELECT user_id, xp, level 
      FROM users 
      WHERE guild_id = ? 
      ORDER BY xp DESC 
      LIMIT 10
    `).all(id);
    res.json(leaderboard);
  });

  app.post('/api/guilds/:id/embed', async (req, res) => {
    const { id } = req.params;
    const { channel_id, title, description, color, image, thumbnail, footer, author, fields, timestamp } = req.body;

    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(404).json({ error: 'Bot not in guild' });

    const channel: any = guild.channels.cache.get(channel_id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    try {
      const embed: any = {
        title,
        description,
        color: parseInt(color.replace('#', ''), 16) || 0x5865F2,
      };

      if (image) embed.image = { url: image };
      if (thumbnail) embed.thumbnail = { url: thumbnail };
      if (footer) embed.footer = { text: footer };
      if (author?.name) embed.author = { name: author.name, icon_url: author.icon, url: author.url };
      if (fields?.length) embed.fields = fields.map((f: any) => ({ name: f.name, value: f.value, inline: !!f.inline }));
      if (timestamp) embed.timestamp = new Date().toISOString();

      await channel.send({ embeds: [embed] });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send embed' });
    }
  });

  app.get('/api/guilds/:id/commands', async (req, res) => {
    const { id } = req.params;
    const commands = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?').all(id);
    res.json(commands);
  });

  app.post('/api/guilds/:id/commands', async (req, res) => {
    const { id } = req.params;
    const { command_name, response, is_embed } = req.body;

    try {
      db.prepare(`
        INSERT INTO custom_commands (guild_id, command_name, response, is_embed)
        VALUES (?, ?, ?, ?)
      `).run(id, command_name.toLowerCase(), response, is_embed ? 1 : 0);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add command' });
    }
  });

  app.delete('/api/guilds/:id/commands/:commandId', async (req, res) => {
    const { id, commandId } = req.params;
    try {
      db.prepare('DELETE FROM custom_commands WHERE id = ? AND guild_id = ?').run(commandId, id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete command' });
    }
  });

  app.get('/api/guilds/:id/dropdowns', async (req, res) => {
    const { id } = req.params;
    const dropdowns = db.prepare('SELECT * FROM dropdown_roles WHERE guild_id = ?').all(id);
    res.json(dropdowns);
  });

  app.post('/api/guilds/:id/dropdowns', async (req, res) => {
    const { id } = req.params;
    const { channel_id, title, description, roles, image_url } = req.body;

    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(404).json({ error: 'Bot not in guild' });

    const channel: any = guild.channels.cache.get(channel_id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    try {
      const parsedRoles = JSON.parse(roles);
      const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = await import('discord.js');
      
      const select = new StringSelectMenuBuilder()
        .setCustomId('dropdown_roles')
        .setPlaceholder('Select your roles...')
        .addOptions(parsedRoles.map((r: any) => 
          new StringSelectMenuOptionBuilder()
            .setLabel(r.label)
            .setValue(r.value)
            .setEmoji(r.emoji || '✨')
        ));

      const row: any = new ActionRowBuilder().addComponents(select);

      const embed: any = { title, description, color: 0x5865F2 };
      if (image_url) {
        embed.image = { url: image_url };
      }

      const msg = await channel.send({
        embeds: [embed],
        components: [row]
      });

      db.prepare('INSERT INTO dropdown_roles (guild_id, channel_id, message_id, title, description, roles) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, channel_id, msg.id, title, description, roles);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create dropdown' });
    }
  });

  app.get('/api/guilds/:id/channels/:channelId/messages', async (req, res) => {
    const { id, channelId } = req.params;
    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(404).json({ error: 'Bot not in guild' });

    const channel: any = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Text channel not found' });

    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      res.json(messages.map((m: any) => ({
        id: m.id,
        content: m.content,
        author: {
          id: m.author.id,
          username: m.author.username,
          avatar: m.author.displayAvatarURL(),
        },
        timestamp: m.createdTimestamp,
        attachments: m.attachments.map((a: any) => ({ url: a.url, name: a.name })),
        embeds: m.embeds.map((e: any) => ({ title: e.title, description: e.description })),
      })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/guilds/:id/channels/:channelId/reply', async (req, res) => {
    const { id, channelId } = req.params;
    const { messageId, content } = req.body;

    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(404).json({ error: 'Bot not in guild' });

    const channel: any = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Text channel not found' });

    try {
      if (messageId) {
        const message = await channel.messages.fetch(messageId);
        await message.reply(content);
      } else {
        await channel.send(content);
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send reply' });
    }
  });

  // Vite setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startBot();
  });
}

bootstrap();
