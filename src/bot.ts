import { Client, GatewayIntentBits, EmbedBuilder, Events } from 'discord.js';
import db from './db.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on(Events.ClientReady, () => {
  console.log(`Bot logged in as ${client.user?.tag}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  const guildData: any = db.prepare('SELECT * FROM guilds WHERE id = ?').get(member.guild.id);
  
  if (guildData?.welcome_enabled && guildData.welcome_channel_id) {
    const channel: any = member.guild.channels.cache.get(guildData.welcome_channel_id);
    if (channel) {
      const msg = (guildData.welcome_message || 'Welcome {user}!')
        .replace('{user}', `<@${member.id}>`)
        .replace('{server}', member.guild.name)
        .replace('{tag}', member.user.tag);
      
      const embed = new EmbedBuilder()
        .setTitle(guildData.welcome_embed_title || 'Welcome!')
        .setDescription(msg)
        .setColor(guildData.welcome_embed_color || '#5865F2')
        .setThumbnail(member.user.displayAvatarURL());
      
      if (guildData.welcome_image_url) {
        embed.setImage(guildData.welcome_image_url);
      }
      
      channel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
  }

  if (guildData?.auto_role_enabled && guildData.auto_role_id) {
    const role = member.guild.roles.cache.get(guildData.auto_role_id);
    if (role) {
      member.roles.add(role).catch(console.error);
    }
  }
});

async function logModAction(guild: any, action: string, target: any, moderator: any, reason: string) {
  const guildData: any = db.prepare('SELECT mod_log_channel_id FROM guilds WHERE id = ?').get(guild.id);
  if (guildData?.mod_log_channel_id) {
    const channel = guild.channels.cache.get(guildData.mod_log_channel_id);
    if (channel && channel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle(`Mod Action: ${action}`)
        .addFields(
          { name: 'Target', value: target.tag || target.user?.tag || target.id, inline: true },
          { name: 'Moderator', value: moderator.user.tag, inline: true },
          { name: 'Reason', value: reason || 'No reason provided' }
        )
        .setColor(action === 'Ban' ? '#ED4245' : action === 'Kick' ? '#FEE75C' : '#5865F2')
        .setTimestamp();
      (channel as any).send({ embeds: [embed] }).catch(console.error);
    }
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildData: any = db.prepare('SELECT * FROM guilds WHERE id = ?').get(message.guild.id);
  const prefix = guildData?.prefix || '!';

  // 1. AutoMod
  if (guildData?.automod_enabled) {
    const badWords = ['anjing', 'bangsat', 'memek', 'kontol', 'asu']; // Example Indonesian list
    if (badWords.some(word => message.content.toLowerCase().includes(word))) {
      await message.delete().catch(() => {});
      const warning = await message.channel.send(`<@${message.author.id}>, pesan kamu dihapus karena mengandung kata terlarang.`);
      setTimeout(() => warning.delete().catch(() => {}), 3000);
      logModAction(message.guild, 'AutoMod Filter', message.author, client.user, `Kata terlarang: ${message.content}`);
      return;
    }
  }

  // 2. Leveling
  if (guildData?.leveling_enabled) {
    const now = Date.now();
    const user: any = db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?').get(message.guild.id, message.author.id);
    
    if (!user) {
      db.prepare('INSERT INTO users (guild_id, user_id, xp, level, last_xp_gain) VALUES (?, ?, ?, ?, ?)').run(
        message.guild.id, message.author.id, 10, 0, now
      );
    } else if (now - user.last_xp_gain > 60000) { // 1 min cooldown
      const xpGain = Math.floor(Math.random() * 10) + 10;
      const newXp = user.xp + xpGain;
      const newLevel = Math.floor(0.1 * Math.sqrt(newXp));
      
      db.prepare('UPDATE users SET xp = ?, level = ?, last_xp_gain = ? WHERE guild_id = ? AND user_id = ?').run(
        newXp, newLevel, now, message.guild.id, message.author.id
      );

      if (newLevel > user.level) {
        message.channel.send(`GG <@${message.author.id}>! Kamu naik ke **Level ${newLevel}**! 🎉`);
      }
    }
  }

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === 'rank') {
    const user: any = db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?').get(message.guild.id, message.author.id);
    if (!user) return message.reply("Kamu belum punya XP!");
    
    const embed = new EmbedBuilder()
      .setTitle(`Rank ${message.author.username}`)
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: 'Level', value: user.level.toString(), inline: true },
        { name: 'Total XP', value: user.xp.toString(), inline: true }
      )
      .setColor('#5865F2');
    
    message.reply({ embeds: [embed] });
  }

  if (command === 'leaderboard' || command === 'lb') {
    const top = db.prepare('SELECT user_id, xp, level FROM users WHERE guild_id = ? ORDER BY xp DESC LIMIT 10').all(message.guild.id) as any[];
    if (top.length === 0) return message.reply("Leaderboard masih kosong!");

    const desc = top.map((u, i) => `**${i + 1}.** <@${u.user_id}> - Level ${u.level} (${u.xp} XP)`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${message.guild.name} Leaderboard`)
      .setDescription(desc)
      .setColor('#FEE75C');
    
    message.reply({ embeds: [embed] });
  }

  if (command === 'ping') {
    message.reply('Pong!');
  }

  if (command === 'ban' || command === 'kick') {
    if (!message.member?.permissions.has(command === 'ban' ? 'BanMembers' : 'KickMembers')) {
      return message.reply(`You don't have permission to ${command} users.`);
    }

    const target = message.mentions.members?.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply(`Please mention a user or provide an ID to ${command}.`);
    if (!target.manageable) return message.reply(`I cannot ${command} this user.`);

    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    try {
      if (command === 'ban') await target.ban({ reason });
      else await target.kick(reason);

      message.reply(`Successfully ${command === 'ban' ? 'banned' : 'kicked'} **${target.user.tag}**.`);
      logModAction(message.guild, command.charAt(0).toUpperCase() + command.slice(1), target, message.member, reason);
    } catch (err) {
      console.error(err);
      message.reply(`Failed to ${command} user.`);
    }
  }

  if (command === 'mute') {
    if (!message.member?.permissions.has('ModerateMembers')) {
      return message.reply("You don't have permission to mute users.");
    }

    const target = message.mentions.members?.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply('Please mention a user or provide an ID to mute.');

    const guildData: any = db.prepare('SELECT mute_role_id FROM guilds WHERE id = ?').get(message.guild.id);
    if (!guildData?.mute_role_id) return message.reply('Mute role not configured in dashboard.');

    const muteRole = message.guild.roles.cache.get(guildData.mute_role_id);
    if (!muteRole) return message.reply('Mute role not found in server.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      if (target.roles.cache.has(muteRole.id)) {
        await target.roles.remove(muteRole);
        message.reply(`Successfully unmuted **${target.user.tag}**.`);
        logModAction(message.guild, 'Unmute', target, message.member, 'Unmuted via command');
      } else {
        await target.roles.add(muteRole);
        message.reply(`Successfully muted **${target.user.tag}**.`);
        logModAction(message.guild, 'Mute', target, message.member, reason);
      }
    } catch (err) {
      console.error(err);
      message.reply('Failed to modify user roles.');
    }
  }

  if (command === 'setup') {
    if (!message.member?.permissions.has('Administrator')) {
      return message.reply('You need Administrator permissions to use this command.');
    }
    // Basic setup logic could go here or refer to the dashboard
    message.reply(`Visit the dashboard to configure me: ${process.env.APP_URL}`);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === 'dropdown_roles') {
    const roleId = interaction.values[0];
    const role = interaction.guild?.roles.cache.get(roleId);
    
    if (role) {
      const member = interaction.member as any;
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `Removed role **${role.name}**`, ephemeral: true });
      } else {
        await member.roles.add(role);
        await interaction.reply({ content: `Added role **${role.name}**`, ephemeral: true });
      }
    }
  }
});

export async function startBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.warn('⚠️ DISCORD_TOKEN not found. Bot will skip login.');
    return;
  }
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error('❌ Failed to login to Discord:', err instanceof Error ? err.message : err);
    console.log('Ensure "Message Content Intent" and "Server Members Intent" are enabled in Discord Developer Portal.');
  }
}

export { client };
