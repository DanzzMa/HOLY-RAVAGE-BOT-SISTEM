import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Settings, 
  Shield, 
  MessageSquare, 
  UserPlus, 
  ChevronRight, 
  ExternalLink,
  LogOut,
  LayoutDashboard,
  Save,
  CheckCircle2,
  Menu,
  X,
  Trophy,
  ShieldAlert,
  RefreshCw,
  Activity,
  Send,
  Plus,
  Trash2,
  User,
  Clock
} from 'lucide-react';
import axios from 'axios';
import { cn } from './lib/utils';

interface User {
  id: string;
  username: string;
}

interface Guild {
  id: string;
  name: string;
  icon: string;
  botIn: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [ddRoles, setDdRoles] = useState<{ id: string, name: string, label: string }[]>([]);
  const [ddChannel, setDdChannel] = useState("");
  const [ddTitle, setDdTitle] = useState("");
  const [ddDesc, setDdDesc] = useState("Please select your roles from the menu below.");
  const [ddImage, setDdImage] = useState("");
  const [leaderboard, setLeaderboard] = useState<{ user_id: string, xp: number, level: number }[]>([]);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [customCommands, setCustomCommands] = useState<any[]>([]);
  const [newCommand, setNewCommand] = useState({ name: '', response: '', is_embed: false });

  // Custom Embed States
  const [ceChannel, setCeChannel] = useState("");
  const [ceTitle, setCeTitle] = useState("");
  const [ceDesc, setCeDesc] = useState("");
  const [ceColor, setCeColor] = useState("#5865F2");
  const [ceImage, setCeImage] = useState("");
  const [ceThumb, setCeThumb] = useState("");
  const [ceFooter, setCeFooter] = useState("");
  const [ceAuthor, setCeAuthor] = useState({ name: "", icon: "", url: "" });
  const [ceFields, setCeFields] = useState<{ name: string, value: string, inline: boolean }[]>([]);
  const [ceTimestamp, setCeTimestamp] = useState(false);

  // Message Console States
  const [messages, setMessages] = useState<any[]>([]);
  const [mcChannel, setMcChannel] = useState("");
  const [mcReply, setMcReply] = useState("");
  const [mcReplyingTo, setMcReplyingTo] = useState<any>(null);
  const [fetchingMessages, setFetchingMessages] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchBotStatus();
    const statusInterval = setInterval(fetchBotStatus, 30000);

    // Listen for OAuth success message from popup
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    if (mcChannel && selectedGuild) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [mcChannel, selectedGuild?.guildData.id]);

  const fetchMessages = async () => {
    if (!selectedGuild || !mcChannel) return;
    setFetchingMessages(true);
    try {
      const res = await axios.get(`/api/guilds/${selectedGuild.guildData.id}/channels/${mcChannel}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingMessages(false);
    }
  };

  const sendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedGuild || !mcChannel || !mcReply) return;
    setSaving(true);
    try {
      await axios.post(`/api/guilds/${selectedGuild.guildData.id}/channels/${mcChannel}/reply`, {
        messageId: mcReplyingTo?.id,
        content: mcReply
      });
      showNotification('Message sent!');
      setMcReply("");
      setMcReplyingTo(null);
      fetchMessages();
    } catch (err) {
      console.error(err);
      showNotification('Failed to send message', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fetchBotStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await axios.get('/api/bot/status');
      setBotStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch bot status:', err);
    } finally {
      setTimeout(() => setStatusLoading(false), 500);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/me');
      setUser(res.data);
      setTimeout(fetchGuilds, 500);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await axios.get('/api/auth/logout');
      setUser(null);
      setGuilds([]);
      setSelectedGuild(null);
      showNotification('Logged out successfully');
    } catch (err) {
      console.error('Logout failed:', err);
      showNotification('Logout failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await axios.get('/api/auth/login');
      const { url } = response.data;
      
      const width = 500;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        'discord_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        alert('Please allow popups to login with Discord.');
      }
    } catch (err) {
      console.error('Failed to initiate login:', err);
    }
  };

  const handleLocalLogin = async () => {
    try {
      setLoading(true);
      await axios.post('/api/auth/local');
      await fetchUser();
      showNotification('Logged in as local admin');
    } catch (err) {
      console.error('Local login failed:', err);
      showNotification('Local login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGuilds = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/guilds');
      if (Array.isArray(res.data)) {
        setGuilds(res.data);
      } else {
        setGuilds([]);
      }
    } catch (err) {
      console.error('Failed to fetch guilds:', err);
      setGuilds([]);
      showNotification('Failed to sync servers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectGuild = async (id: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/guilds/${id}`);
      setSelectedGuild(res.data);
      setSettings(res.data.guildData);
      
      // Fetch leaderboard
      const lbRes = await axios.get(`/api/guilds/${id}/leaderboard`);
      setLeaderboard(lbRes.data);

      // Fetch custom commands
      const cmdRes = await axios.get(`/api/guilds/${id}/commands`);
      setCustomCommands(cmdRes.data);
    } catch (err: any) {
      console.error('Select guild error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load server data';
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedGuild) return;
    setSaving(true);
    try {
      await axios.post(`/api/guilds/${selectedGuild.guildData.id}`, settings);
      showNotification('Settings saved successfully!');
    } catch (err: any) {
      console.error('Save settings error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to save settings. Please try again.';
      showNotification(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    if (ceFields.length >= 25) return;
    setCeFields([...ceFields, { name: "", value: "", inline: false }]);
  };

  const removeField = (index: number) => {
    setCeFields(ceFields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...ceFields];
    (newFields[index] as any)[key] = value;
    setCeFields(newFields);
  };

  const sendCustomEmbed = async () => {
    if (!selectedGuild || !ceChannel || (!ceTitle && !ceDesc && ceFields.length === 0)) {
       showNotification('Please provide a channel and some content (Title, Desc, or Fields)', 'error');
       return;
    }
    setSaving(true);
    try {
      await axios.post(`/api/guilds/${selectedGuild.guildData.id}/embed`, {
        channel_id: ceChannel,
        title: ceTitle,
        description: ceDesc,
        color: ceColor,
        image: ceImage,
        thumbnail: ceThumb,
        footer: ceFooter,
        author: ceAuthor,
        fields: ceFields.filter(f => f.name && f.value),
        timestamp: ceTimestamp
      });
      showNotification('Embed sent successfully!');
      setCeTitle("");
      setCeDesc("");
      setCeImage("");
      setCeThumb("");
      setCeFooter("");
      setCeAuthor({ name: "", icon: "", url: "" });
      setCeFields([]);
      setCeTimestamp(false);
    } catch (err: any) {
      console.error('Send embed error:', err);
      showNotification(err.response?.data?.error || 'Failed to send embed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addCustomCommand = async () => {
    if (!selectedGuild || !newCommand.name || !newCommand.response) return;
    setSaving(true);
    try {
      await axios.post(`/api/guilds/${selectedGuild.guildData.id}/commands`, {
        command_name: newCommand.name,
        response: newCommand.response,
        is_embed: newCommand.is_embed
      });
      const res = await axios.get(`/api/guilds/${selectedGuild.guildData.id}/commands`);
      setCustomCommands(res.data);
      setNewCommand({ name: '', response: '', is_embed: false });
      showNotification('Command added successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to add command', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomCommand = async (commandId: number) => {
    if (!selectedGuild) return;
    setSaving(true);
    try {
      await axios.delete(`/api/guilds/${selectedGuild.guildData.id}/commands/${commandId}`);
      setCustomCommands(customCommands.filter(c => c.id !== commandId));
      showNotification('Command deleted');
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete command', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 border-4 border-discord-blurple border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} onLocalLogin={handleLocalLogin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-discord-blurple rounded-xl">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">HOLY RAVAGE</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => { setSelectedGuild(null); fetchGuilds(); }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              !selectedGuild ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </button>
          
          <div className="mt-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest px-4">
            Your Servers
          </div>
          
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[50vh]">
            {guilds.map((guild) => (
              <button
                key={guild.id}
                onClick={() => selectGuild(guild.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-left",
                  selectedGuild?.guildData.id === guild.id ? "bg-discord-blurple/10 text-discord-blurple" : "text-zinc-400 hover:bg-zinc-800/50"
                )}
              >
                {guild.icon ? (
                  <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} className="h-6 w-6 rounded-full" alt="" />
                ) : (
                  <div className="h-6 w-6 bg-zinc-800 rounded-full flex items-center justify-center text-[10px]">
                    {guild.name.charAt(0)}
                  </div>
                )}
                <span className="truncate flex-1">{guild.name}</span>
                {!guild.botIn && <span className="text-[8px] bg-zinc-800 py-0.5 px-2 rounded-full">Invite</span>}
              </button>
            ))}
          </div>
        </nav>

        {botStatus && (
          <div className="px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Status</span>
                <button 
                  onClick={fetchBotStatus}
                  disabled={statusLoading}
                  className="hover:text-zinc-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-2.5 w-2.5 text-zinc-500", statusLoading && "animate-spin")} />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  botStatus.status === 'online' ? "bg-green-500 animate-pulse" : "bg-red-500"
                )} />
                <span className={cn(
                  "text-[10px] font-bold capitalize",
                  botStatus.status === 'online' ? "text-green-500" : "text-red-500"
                )}>
                  {botStatus.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800/50 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-20">
                  <Activity className="h-3 w-3" />
                </div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Ping</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xs font-bold text-zinc-200">{botStatus.ping}ms</p>
                  <div className={cn(
                    "h-1 w-1 rounded-full",
                    botStatus.ping < 50 ? "bg-green-500" : botStatus.ping < 150 ? "bg-yellow-500" : "bg-red-500"
                  )} />
                </div>
              </div>
              <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 mb-0.5">Shards</p>
                <p className="text-xs font-bold text-zinc-200">1 / 1</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-zinc-500">Uptime</span>
              <span className="text-[10px] font-mono text-zinc-400">
                {botStatus.uptime ? `${Math.floor(botStatus.uptime / 3600000)}h ${Math.floor((botStatus.uptime % 3600000) / 60000)}m` : 'N/A'}
              </span>
            </div>
          </div>
        )}

        <div className="mt-auto space-y-4">
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "mx-4 px-4 py-2 rounded-lg text-xs font-medium border",
                  notification.type === 'success' 
                    ? "bg-green-500/10 border-green-500/20 text-green-500" 
                    : "bg-red-500/10 border-red-500/20 text-red-500"
                )}
              >
                {notification.text}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex-1">
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-zinc-500">Administrator</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-zinc-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {botStatus?.inviteUrl && (
            <div className="px-4 pb-4">
              <a 
                href={botStatus.inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-discord-blurple/10 hover:bg-discord-blurple/20 text-discord-blurple rounded-xl text-xs font-bold transition-all border border-discord-blurple/20 group w-full"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Invite Bot
                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          )}
        </div>
      </div>
    </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!selectedGuild ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-3xl font-bold mb-2">Welcome back, {user.username}!</h2>
              <p className="text-zinc-400 mb-12">Select a server from the sidebar to start configuring HOLY RAVAGE.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50">
                  <UserPlus className="h-8 w-8 text-discord-blurple mb-4" />
                  <h3 className="text-xl font-bold mb-2">Welcome System</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Automate your server greetings and role assignments for new members instantly.
                  </p>
                </div>
                <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50">
                  <Shield className="h-8 w-8 text-red-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Moderation</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Protect your community with advanced moderation tools and audit logging.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={selectedGuild.guildData.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold">{selectedGuild.guildData.name}</h2>
                  <p className="text-zinc-400">Configure your bot instance</p>
                </div>
                <button 
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-discord-blurple hover:bg-indigo-600 px-6 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>

              <div className="space-y-8">
                {/* General */}
                <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                  <div className="flex items-center gap-3 mb-6">
                    <Settings className="h-5 w-5 text-zinc-400" />
                    <h3 className="text-xl font-bold">General Settings</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Command Prefix</label>
                      <input 
                        type="text" 
                        value={settings.prefix}
                        onChange={(e) => setSettings({...settings, prefix: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 transition-all"
                      />
                    </div>
                  </div>
                </section>

                {/* Welcome */}
                <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <UserPlus className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-xl font-bold">Welcome Messages</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.welcome_enabled === 1}
                        onChange={(e) => setSettings({...settings, welcome_enabled: e.target.checked ? 1 : 0})}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-blurple"></div>
                    </label>
                  </div>
                  
                  <div className={cn("space-y-6 transition-all", settings.welcome_enabled !== 1 && "opacity-50 pointer-events-none")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Channel</label>
                        <select 
                          value={settings.welcome_channel_id || ''}
                          onChange={(e) => setSettings({...settings, welcome_channel_id: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        >
                          <option value="">Select a channel</option>
                          {selectedGuild.channels.map((c: any) => (
                            <option key={c.id} value={c.id}>#{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Auto Role</label>
                        <select 
                          value={settings.auto_role_id || ''}
                          onChange={(e) => setSettings({...settings, auto_role_id: e.target.value, auto_role_enabled: e.target.value ? 1 : 0})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        >
                          <option value="">No Auto Role</option>
                          {selectedGuild.roles.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Message Template</label>
                      <textarea 
                        rows={3}
                        value={settings.welcome_message}
                        onChange={(e) => setSettings({...settings, welcome_message: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        placeholder="Welcome {user} to {server}!"
                      />
                      <p className="text-[10px] text-zinc-500 mt-2 px-1">Use {'{user}'} for mention, {'{server}'} for server name, and {'{tag}'} for user tag.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Embed Title</label>
                        <input 
                          type="text" 
                          value={settings.welcome_embed_title || ''}
                          onChange={(e) => setSettings({...settings, welcome_embed_title: e.target.value})}
                          placeholder="Welcome!"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Embed Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={settings.welcome_embed_color || '#5865F2'}
                            onChange={(e) => setSettings({...settings, welcome_embed_color: e.target.value})}
                            className="h-10 w-10 bg-zinc-950 border border-zinc-800 rounded-lg p-1"
                          />
                          <input 
                            type="text" 
                            value={settings.welcome_embed_color || ''}
                            onChange={(e) => setSettings({...settings, welcome_embed_color: e.target.value})}
                            placeholder="#5865F2"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Welcome Image URL (Background)</label>
                      <input 
                        type="url" 
                        value={settings.welcome_image_url || ''}
                        onChange={(e) => setSettings({...settings, welcome_image_url: e.target.value})}
                        placeholder="https://example.com/welcome.png"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                      />
                      {settings.welcome_image_url && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800 max-h-32">
                          <img src={settings.welcome_image_url} alt="Preview" className="w-full h-full object-cover opacity-50" />
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Leave Messages */}
                <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <LogOut className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-xl font-bold">Leave Messages</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.leave_enabled === 1}
                        onChange={(e) => setSettings({...settings, leave_enabled: e.target.checked ? 1 : 0})}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-blurple"></div>
                    </label>
                  </div>
                  
                  <div className={cn("space-y-6 transition-all", settings.leave_enabled !== 1 && "opacity-50 pointer-events-none")}>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Channel</label>
                      <select 
                        value={settings.leave_channel_id || ''}
                        onChange={(e) => setSettings({...settings, leave_channel_id: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                      >
                        <option value="">Select a channel</option>
                        {selectedGuild.channels.map((c: any) => (
                          <option key={c.id} value={c.id}>#{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Message Template</label>
                      <textarea 
                        rows={2}
                        value={settings.leave_message}
                        onChange={(e) => setSettings({...settings, leave_message: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        placeholder="{user} has left the server."
                      />
                      <p className="text-[10px] text-zinc-500 mt-2 px-1">Use {'{user}'} for mention, {'{server}'} for server name, and {'{tag}'} for user tag.</p>
                    </div>
                  </div>
                </section>

                {/* Moderation */}
                <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                  <div className="flex items-center gap-3 mb-6">
                    <Shield className="h-5 w-5 text-zinc-400" />
                    <h3 className="text-xl font-bold">Moderation Settings</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Audit Log Channel</label>
                        <select 
                          value={settings.mod_log_channel_id || ''}
                          onChange={(e) => setSettings({...settings, mod_log_channel_id: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        >
                          <option value="">No Logging</option>
                          {selectedGuild.channels.map((c: any) => (
                            <option key={c.id} value={c.id}>#{c.name}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-zinc-500 mt-2 px-1">Channel where moderation actions (ban, kick, mute) are logged.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Mute Role</label>
                        <select 
                          value={settings.mute_role_id || ''}
                          onChange={(e) => setSettings({...settings, mute_role_id: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        >
                          <option value="">No Mute Role</option>
                          {selectedGuild.roles.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-zinc-500 mt-2 px-1">Role added/removed when using {settings.prefix}mute.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="text-sm font-bold mb-2">Available Mod Commands</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="flex flex-col gap-1">
                          <code className="text-discord-blurple font-mono">{settings.prefix}ban @user [reason]</code>
                          <span className="text-zinc-500">Bans a member permanently.</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <code className="text-discord-blurple font-mono">{settings.prefix}kick @user [reason]</code>
                          <span className="text-zinc-500">Kicks a member from the server.</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <code className="text-discord-blurple font-mono">{settings.prefix}mute @user [reason]</code>
                          <span className="text-zinc-500">Toggles the mute role for a user.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Leveling & AutoMod */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-zinc-400" />
                        <h3 className="text-xl font-bold">Leveling System</h3>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings.leveling_enabled === 1}
                          onChange={(e) => setSettings({...settings, leveling_enabled: e.target.checked ? 1 : 0})}
                        />
                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-blurple"></div>
                      </label>
                    </div>
                    <p className="text-sm text-zinc-400 mb-6">Users earn XP by chatting. Unlocks commands: <code className="text-discord-blurple">{settings.prefix}rank</code>, <code className="text-discord-blurple">{settings.prefix}lb</code>.</p>
                    
                    {settings.leveling_enabled === 1 && (
                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold">Current Leaderboard</h4>
                          <button className="text-xs text-discord-blurple hover:underline">View All</button>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-xs text-zinc-500 border-b border-zinc-900 pb-2">
                            <span className="w-6">#</span>
                            <span className="flex-1">User ID</span>
                            <span className="w-12 text-right">Lvl</span>
                            <span className="w-16 text-right">XP</span>
                          </div>
                          {leaderboard.length > 0 ? (
                            leaderboard.map((u, i) => (
                              <div key={u.user_id} className="flex items-center gap-3 text-xs">
                                <span className={cn(
                                  "w-6 font-bold",
                                  i === 0 ? "text-yellow-500" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-zinc-500"
                                )}>{i + 1}</span>
                                <span className="flex-1 font-mono text-zinc-400 truncate">{u.user_id}</span>
                                <span className="w-12 text-right text-zinc-300">{u.level}</span>
                                <span className="w-16 text-right text-discord-blurple font-bold">{u.xp}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-zinc-600 text-xs italic">
                              Leaderboard data will appear once users start chatting.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={cn("mt-6 space-y-4", settings.leveling_enabled !== 1 && "opacity-50 pointer-events-none")}>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">XP Per Message</label>
                        <input 
                          type="number" 
                          value={settings.xp_per_message || 10}
                          onChange={(e) => setSettings({...settings, xp_per_message: parseInt(e.target.value) || 0})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                          min="0"
                          max="1000"
                        />
                        <p className="text-[10px] text-zinc-500 mt-2 px-1">XP gained per message (1 minute cooldown).</p>
                      </div>
                    </div>
                  </section>

                  <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="h-5 w-5 text-zinc-400" />
                        <h3 className="text-xl font-bold">Auto-Mod</h3>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings.automod_enabled === 1}
                          onChange={(e) => setSettings({...settings, automod_enabled: e.target.checked ? 1 : 0})}
                        />
                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-blurple"></div>
                      </label>
                    </div>
                    <p className="text-sm text-zinc-400 mb-6">Automatically removes messages with offensive language and logs them to the audit channel.</p>
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="text-sm font-bold mb-2">Filtered Phrases</h4>
                      <p className="text-xs text-zinc-500">Currently filtering common offensive Indonesian words. Custom word lists coming soon.</p>
                    </div>
                  </section>
                </div>

                {/* Dropdown Roles */}
                <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                  <div className="flex items-center gap-3 mb-6">
                    <Menu className="h-5 w-5 text-zinc-400" />
                    <h3 className="text-xl font-bold">Dropdown Roles</h3>
                  </div>
                  
                  <p className="text-sm text-zinc-400 mb-6">Create a message in a channel where users can pick their roles from a dropdown menu.</p>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Target Channel</label>
                        <select 
                          value={ddChannel}
                          onChange={(e) => setDdChannel(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        >
                          <option value="">Select a channel</option>
                          {selectedGuild.channels.map((c: any) => (
                            <option key={c.id} value={c.id}>#{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Embed Title</label>
                        <input 
                          type="text" 
                          placeholder="Get Your Roles" 
                          value={ddTitle}
                          onChange={(e) => setDdTitle(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Embed Description</label>
                      <textarea 
                        rows={2}
                        value={ddDesc}
                        onChange={(e) => setDdDesc(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Embed Image URL</label>
                      <input 
                        type="url" 
                        value={ddImage}
                        onChange={(e) => setDdImage(e.target.value)}
                        placeholder="https://example.com/image.png"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-zinc-400 px-1">Selected Roles ({ddRoles.length}/25)</label>
                      <div className="space-y-2">
                        {ddRoles.map((role, idx) => (
                          <div key={role.id} className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                            <span className="text-zinc-500 font-mono text-xs w-4">{idx + 1}.</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{role.name}</p>
                              <input 
                                type="text"
                                value={role.label}
                                onChange={(e) => {
                                  const newRoles = [...ddRoles];
                                  newRoles[idx].label = e.target.value;
                                  setDdRoles(newRoles);
                                }}
                                className="bg-transparent text-xs text-zinc-400 border-none p-0 focus:ring-0 w-full"
                                placeholder="Button label..."
                              />
                            </div>
                            <button 
                              onClick={() => setDdRoles(ddRoles.filter(r => r.id !== role.id))}
                              className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <select 
                          id="role-adder"
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                        >
                          <option value="">Add a role...</option>
                          {selectedGuild.roles
                            .filter((r: any) => !ddRoles.some(dr => dr.id === r.id) && r.name !== "@everyone")
                            .map((r: any) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <button 
                          onClick={() => {
                            const select = document.getElementById('role-adder') as HTMLSelectElement;
                            const roleId = select.value;
                            if (!roleId) return;
                            const role = selectedGuild.roles.find((r: any) => r.id === roleId);
                            setDdRoles([...ddRoles, { id: role.id, name: role.name, label: role.name }]);
                            select.value = "";
                          }}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-sm font-medium transition-all"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        if (!ddChannel) return showNotification('Please select a target channel', 'error');
                        if (ddRoles.length === 0) return showNotification('Please add at least one role', 'error');
                        
                        setSaving(true);
                        try {
                          await axios.post(`/api/guilds/${selectedGuild.guildData.id}/dropdowns`, {
                            channel_id: ddChannel,
                            title: ddTitle || 'Role Selection',
                            description: ddDesc,
                            image_url: ddImage,
                            roles: JSON.stringify(ddRoles.map(r => ({ label: r.label, value: r.id })))
                          });
                          showNotification('Dropdown roles created in Discord!');
                          setDdRoles([]);
                        } catch (err: any) {
                          console.error('Create dropdown error:', err);
                          const errorMsg = err.response?.data?.error || 'Failed to create dropdown message. Check permissions.';
                          showNotification(errorMsg, 'error');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || !ddChannel || ddRoles.length === 0}
                      className="w-full py-4 bg-discord-blurple hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Creating...
                        </>
                      ) : 'Create Dropdown Message'}
                    </button>
                  </div>
                </section>

                {/* Custom Embed Builder */}
                <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                  <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="h-5 w-5 text-zinc-400" />
                    <h3 className="text-xl font-bold">Custom Embed Builder</h3>
                  </div>
                  
                  <p className="text-sm text-zinc-400 mb-6">Send a customized announcement or information box to your server.</p>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Target Channel</label>
                          <select 
                            value={ceChannel}
                            onChange={(e) => setCeChannel(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                          >
                            <option value="">Select a channel</option>
                            {selectedGuild.channels.map((c: any) => (
                              <option key={c.id} value={c.id}>#{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Embed Color</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={ceColor}
                              onChange={(e) => setCeColor(e.target.value)}
                              className="h-10 w-10 bg-zinc-950 border border-zinc-800 rounded-lg p-1"
                            />
                            <input 
                              type="text" 
                              value={ceColor}
                              onChange={(e) => setCeColor(e.target.value)}
                              placeholder="#5865F2"
                              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Author Section */}
                      <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <User className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Author Info</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <input 
                            type="text" 
                            value={ceAuthor.name}
                            onChange={(e) => setCeAuthor({...ceAuthor, name: e.target.value})}
                            placeholder="Author Name" 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-discord-blurple text-sm" 
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input 
                              type="text" 
                              value={ceAuthor.icon}
                              onChange={(e) => setCeAuthor({...ceAuthor, icon: e.target.value})}
                              placeholder="Icon URL" 
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-discord-blurple text-sm" 
                            />
                            <input 
                              type="text" 
                              value={ceAuthor.url}
                              onChange={(e) => setCeAuthor({...ceAuthor, url: e.target.value})}
                              placeholder="Author Link URL" 
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-discord-blurple text-sm" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Embed Title</label>
                          <input 
                            type="text" 
                            value={ceTitle}
                            onChange={(e) => setCeTitle(e.target.value)}
                            placeholder="Title..." 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Footer Text</label>
                          <input 
                            type="text" 
                            value={ceFooter}
                            onChange={(e) => setCeFooter(e.target.value)}
                            placeholder="Optional footer..." 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5 px-1">Description / Message Content</label>
                        <textarea 
                          rows={4}
                          value={ceDesc}
                          onChange={(e) => setCeDesc(e.target.value)}
                          placeholder="Write your message here..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                        />
                      </div>

                      {/* Fields Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-zinc-400 px-1">Embed Fields</label>
                          <button 
                            onClick={addField}
                            className="text-[10px] bg-discord-blurple/20 hover:bg-discord-blurple/30 text-discord-blurple px-2 py-1 rounded flex items-center gap-1 font-bold transition-all"
                          >
                            <Plus className="h-3 w-3" /> ADD FIELD
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {ceFields.map((field, idx) => (
                            <div key={idx} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3 relative group">
                              <button 
                                onClick={() => removeField(idx)}
                                className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input 
                                  type="text" 
                                  value={field.name}
                                  onChange={(e) => updateField(idx, 'name', e.target.value)}
                                  placeholder="Field Name" 
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-discord-blurple text-xs font-bold" 
                                />
                                <div className="flex items-center gap-3">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={field.inline}
                                      onChange={(e) => updateField(idx, 'inline', e.target.checked)}
                                      className="sr-only peer" 
                                    />
                                    <div className="w-7 h-4 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-discord-blurple"></div>
                                  </label>
                                  <span className="text-[10px] text-zinc-500">Inline</span>
                                </div>
                              </div>
                              <textarea 
                                rows={1}
                                value={field.value}
                                onChange={(e) => updateField(idx, 'value', e.target.value)}
                                placeholder="Field Value" 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-discord-blurple text-xs" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 py-2 px-1">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={ceTimestamp}
                              onChange={(e) => setCeTimestamp(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-blurple"></div>
                          </label>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-400">Include Timestamp</span>
                            <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Show current time</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-zinc-400 px-1">Image URL</label>
                          <input 
                            type="text" 
                            value={ceImage}
                            onChange={(e) => setCeImage(e.target.value)}
                            placeholder="Large image bottom..." 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-zinc-400 px-1">Thumbnail URL</label>
                          <input 
                            type="text" 
                            value={ceThumb}
                            onChange={(e) => setCeThumb(e.target.value)}
                            placeholder="Small image top right..." 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50" 
                          />
                        </div>
                      </div>

                      <button 
                        onClick={sendCustomEmbed}
                        disabled={saving || !ceChannel || (!ceTitle && !ceDesc && ceFields.length === 0)}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : <Send className="h-4 w-4" />}
                        Send Custom Embed
                      </button>
                    </div>

                    {/* Preview Area */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-zinc-500 mb-3 px-1 uppercase tracking-widest text-[10px]">Live Preview</label>
                      <div className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-800 p-6 min-h-[400px]">
                        <div className="flex gap-4">
                          <div className="h-10 w-10 rounded-full bg-discord-blurple flex items-center justify-center flex-shrink-0">
                            <Bot className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-sm text-[#5865F2] hover:underline cursor-pointer">{selectedGuild.guildData.name} Bot</span>
                              <span className="bg-[#5865F2] text-[10px] text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold"><CheckCircle2 className="h-2 w-2" /> BOT</span>
                              <span className="text-zinc-500 text-[10px]">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            
                            {/* The actual Embed UI in Preview */}
                            <div 
                              className="border-l-4 rounded-md bg-[#2B2D31] p-4 max-w-[432px] overflow-hidden"
                              style={{ borderColor: ceColor }}
                            >
                              {/* Author Preview */}
                              {ceAuthor.name && (
                                <div className="flex items-center gap-2 mb-2">
                                  {ceAuthor.icon && <img src={ceAuthor.icon} className="h-6 w-6 rounded-full object-cover" alt="" />}
                                  <span className={cn("text-xs font-bold text-white", ceAuthor.url && "text-discord-blurple hover:underline cursor-pointer")}>
                                    {ceAuthor.name}
                                  </span>
                                </div>
                              )}

                              <div className="flex justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {ceTitle && <h4 className="font-bold text-zinc-100 mb-1 break-words">{ceTitle}</h4>}
                                  {ceDesc && <p className="text-sm text-zinc-300 break-words whitespace-pre-wrap">{ceDesc}</p>}
                                </div>
                                {ceThumb && (
                                  <div className="h-20 w-20 rounded overflow-hidden flex-shrink-0">
                                    <img src={ceThumb} alt="" className="w-full h-full object-cover" />
                                  </div>
                                )}
                              </div>

                              {/* Fields Preview */}
                              {ceFields.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4">
                                  {ceFields.map((f, idx) => (
                                    <div key={idx} className={cn("min-w-0", f.inline ? "col-span-1" : "col-span-3")}>
                                      <div className="text-xs font-bold text-white mb-1 break-words">{f.name || 'Field Title'}</div>
                                      <div className="text-xs text-zinc-300 break-words whitespace-pre-wrap">{f.value || 'Field Value'}</div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {ceImage && (
                                <div className="mt-4 rounded-md overflow-hidden">
                                  <img src={ceImage} alt="" className="w-full h-auto max-h-80 object-cover" />
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-3 flex-wrap">
                                {ceFooter && <div className="text-[10px] text-zinc-400 font-medium">{ceFooter}</div>}
                                {ceTimestamp && (
                                  <>
                                    {ceFooter && <span className="text-zinc-600 text-[10px]">•</span>}
                                    <div className="text-[10px] text-zinc-400 font-medium">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                    {/* Custom Commands */}
                    <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                      <div className="flex items-center gap-3 mb-6">
                        <MessageSquare className="h-5 w-5 text-zinc-400" />
                        <h3 className="text-xl font-bold">Custom Bot Commands</h3>
                      </div>
                      
                      <p className="text-sm text-zinc-400 mb-6">Create your own bot commands with custom responses.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
                            <h4 className="text-sm font-bold">New Command</h4>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1 px-1">Command Name</label>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500 font-mono">{settings.prefix}</span>
                                <input 
                                  type="text" 
                                  value={newCommand.name}
                                  onChange={(e) => setNewCommand({...newCommand, name: e.target.value})}
                                  placeholder="hello" 
                                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-discord-blurple" 
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1 px-1">Response</label>
                              <textarea 
                                rows={3}
                                value={newCommand.response}
                                onChange={(e) => setNewCommand({...newCommand, response: e.target.value})}
                                placeholder="What should the bot say?" 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-discord-blurple" 
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={newCommand.is_embed}
                                  onChange={(e) => setNewCommand({...newCommand, is_embed: e.target.checked})}
                                  className="sr-only peer" 
                                />
                                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-discord-blurple"></div>
                              </label>
                              <span className="text-xs text-zinc-400">Send as Embed</span>
                            </div>
                            <button 
                              onClick={addCustomCommand}
                              disabled={saving || !newCommand.name || !newCommand.response}
                              className="w-full py-2.5 bg-discord-blurple hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                            >
                              Add Command
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1 px-1">Existing Commands</label>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {customCommands.length > 0 ? (
                              customCommands.map((cmd) => (
                                <div key={cmd.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between group">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-discord-blurple font-bold text-sm">{settings.prefix}{cmd.command_name}</span>
                                      {cmd.is_embed === 1 && <span className="text-[8px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 uppercase">Embed</span>}
                                    </div>
                                    <p className="text-xs text-zinc-500 line-clamp-1">{cmd.response}</p>
                                  </div>
                                  <button 
                                    onClick={() => deleteCustomCommand(cmd.id)}
                                    className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 bg-zinc-950 border border-zinc-800 border-dashed rounded-xl text-zinc-600 text-xs italic">
                                No custom commands added yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Message Console */}
                    <section className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-5 w-5 text-zinc-400" />
                          <h3 className="text-xl font-bold">Message Console</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <select 
                            value={mcChannel}
                            onChange={(e) => setMcChannel(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 focus:outline-none text-xs"
                          >
                            <option value="">Select Channel</option>
                            {selectedGuild.channels.map((c: any) => (
                              <option key={c.id} value={c.id}>#{c.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={fetchMessages}
                            disabled={fetchingMessages || !mcChannel}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={cn("h-4 w-4", fetchingMessages && "animate-spin")} />
                          </button>
                        </div>
                      </div>

                      {!mcChannel ? (
                        <div className="py-12 flex flex-col items-center justify-center text-zinc-600 border border-zinc-800 border-dashed rounded-2xl">
                          <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                          <p className="text-sm">Select a channel to view live messages and reply.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col h-[500px]">
                          <div className="flex-1 overflow-y-auto space-y-4 px-2 mb-4 scrollbar-thin scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-700">
                            {messages.length === 0 && !fetchingMessages && (
                              <div className="text-center py-20 text-zinc-500 italic text-sm">No recent messages found.</div>
                            )}
                            {[...messages].reverse().map((msg) => (
                              <div key={msg.id} className="group relative flex gap-3 hover:bg-zinc-900/50 p-2 rounded-xl transition-all">
                                <img src={msg.author.avatar} alt="" className="h-8 w-8 rounded-full flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-sm text-zinc-200">{msg.author.username}</span>
                                    <span className="text-[10px] text-zinc-500 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-sm text-zinc-400 break-words">{msg.content}</p>
                                  {msg.attachments.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {msg.attachments.map((a: any, i: number) => (
                                        <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-[10px] text-discord-blurple hover:underline flex items-center gap-1">
                                           📎 {a.name}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button 
                                  onClick={() => {
                                    setMcReplyingTo(msg);
                                    document.getElementById('mc-input')?.focus();
                                  }}
                                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all"
                                  title="Reply"
                                >
                                  <Send className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="mt-auto space-y-2">
                            {mcReplyingTo && (
                              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800/50 rounded-t-lg border-x border-t border-zinc-800 text-[10px]">
                                <span className="text-zinc-500">
                                  Replying to <span className="font-bold text-zinc-300">@{mcReplyingTo.author.username}</span>
                                </span>
                                <button onClick={() => setMcReplyingTo(null)} className="text-zinc-500 hover:text-red-400">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            <form onSubmit={sendReply} className="relative">
                              <input 
                                id="mc-input"
                                type="text"
                                value={mcReply}
                                onChange={(e) => setMcReply(e.target.value)}
                                placeholder={mcReplyingTo ? `Reply to ${mcReplyingTo.author.username}...` : `Send a message to #${selectedGuild.channels.find((c: any) => c.id === mcChannel)?.name}...`}
                                className={cn(
                                  "w-full bg-zinc-950 border border-zinc-800 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 transition-all",
                                  mcReplyingTo ? "rounded-b-xl" : "rounded-xl"
                                )}
                              />
                              <button 
                                type="submit"
                                disabled={saving || !mcReply}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-discord-blurple hover:text-indigo-400 disabled:opacity-50 transition-colors"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function LandingPage({ onLogin, onLocalLogin }: { onLogin: () => void, onLocalLogin: () => void }) {
  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-discord-blurple/20 via-zinc-950 to-zinc-950">
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-discord-blurple blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center max-w-2xl"
      >
        <div className="inline-flex p-3 bg-discord-blurple rounded-3xl mb-8 shadow-[0_0_40px_-10px_rgba(88,101,242,0.5)]">
          <Bot className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
          NEXUS
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed font-light">
          The all-in-one Discord powerhouse. Welcome systems, advanced moderation, 
          and role management—all controlled from one beautiful interface.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onLogin}
            className="w-full sm:w-auto px-8 py-4 bg-discord-blurple hover:bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            Login with Discord
            <ChevronRight className="h-5 w-5" />
          </button>
          <button 
            onClick={onLocalLogin}
            className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all backdrop-blur-sm"
          >
            Login Local
            <LayoutDashboard className="h-5 w-5 opacity-50" />
          </button>
        </div>
        
        <div className="mt-6">
          <button 
            onClick={() => {
              const clientId = process.env.DISCORD_CLIENT_ID || '';
              if (!clientId) return alert('Silakan masukkan DISCORD_CLIENT_ID di Secrets terlebih dahulu.');
              window.open(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`, '_blank');
            }}
            className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-2 transition-all mx-auto"
          >
            <ExternalLink className="h-4 w-4" />
            Invite Bot to Server
          </button>
        </div>
      </motion.div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {[
          { icon: <MessageSquare className="text-sky-400" />, title: "Custom Commands", desc: "Create flexible prefixes and response templates." },
          { icon: <Shield className="text-red-400" />, title: "Auto Mod", desc: "Keep your community safe with rule enforcement." },
          { icon: <UserPlus className="text-emerald-400" />, title: "Live Dashboard", desc: "Instant updates without touching a line of code." }
        ].map((feat, i) => (
          <motion.div 
            key={feat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i + 0.5 }}
            className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm"
          >
            <div className="p-3 bg-white/5 rounded-2xl w-fit mb-4">
              {React.cloneElement(feat.icon as React.ReactElement, { className: "h-6 w-6" })}
            </div>
            <h3 className="font-bold mb-2">{feat.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
