import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/ad7b7e2d-3af6-4c2d-80f3-640aa79c62e6";

// ─── Types ────────────────────────────────────────────────────────────────────
type Theme = "dark" | "light";
type Section = "groups" | "contacts" | "settings" | "admin";

interface User {
  id: number;
  username: string;
  display_name: string;
  is_admin: boolean;
}

interface Group {
  id: number;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

interface Message {
  id: number;
  text: string;
  username: string;
  display_name: string;
  created_at: string;
}

interface Member {
  id: number;
  username: string;
  display_name: string;
  last_seen: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return res.json();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const COLORS = ["bg-blue-600","bg-emerald-600","bg-purple-600","bg-orange-500","bg-red-600","bg-pink-600","bg-indigo-600"];
function Av({ name, size = 40 }: { name: string; size?: number }) {
  const letters = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % COLORS.length;
  return (
    <div className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 text-white ${COLORS[idx]}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {letters || "?"}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full relative transition-colors ${value ? "bg-blue-600" : "bg-[hsl(var(--border))]"}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
const EMOJIS = [
  "😀","😂","😍","🥹","😎","🤔","😢","😡","🥳","🤩",
  "👍","👎","❤️","🔥","💯","🎉","🙌","👏","🫶","✅",
  "😅","🤣","😏","🥰","😘","😤","🤯","🤗","😌","😴",
  "🐶","🐱","🎮","🍕","🍔","☕","🚀","⚡","💎","🌟",
];

function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3 shadow-xl grid grid-cols-8 gap-1 w-64 animate-scale-in">
      {EMOJIS.map(em => (
        <button key={em} onClick={() => onPick(em)}
          className="w-7 h-7 flex items-center justify-center text-lg hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors">
          {em}
        </button>
      ))}
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ username: "", display_name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!form.username || !form.password) { setError("Заполните все поля"); return; }
    if (mode === "register" && !form.display_name) { setError("Введите имя"); return; }
    setLoading(true);
    const path = mode === "login" ? "/login" : "/register";
    const body = mode === "login"
      ? { username: form.username, password: form.password }
      : { username: form.username, display_name: form.display_name, password: form.password };
    const data = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    onLogin(data.user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <Icon name="Zap" size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">NightChat</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 text-sm">Твой защищённый мессенджер</p>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 shadow-xl">
          <div className="flex bg-[hsl(var(--secondary))] rounded-xl p-1 mb-6">
            {(["login","register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow" : "text-[hsl(var(--muted-foreground))]"}`}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === "register" && (
              <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Ваше имя (например: Алексей)"
                className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 transition-colors"
              />
            )}
            <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
              <span className="text-[hsl(var(--muted-foreground))] text-sm font-medium">@</span>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,"") }))}
                placeholder="никнейм"
                className="bg-transparent text-sm text-[hsl(var(--foreground))] outline-none flex-1 placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Пароль" onKeyDown={e => e.key === "Enter" && submit()}
              className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {error && <div className="mt-3 text-red-400 text-xs bg-red-500/10 rounded-xl px-3 py-2">{error}</div>}

          <button onClick={submit} disabled={loading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-3 font-semibold text-sm transition-colors">
            {loading ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </div>

        <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-4">
          Войдите или создайте аккаунт — данные сохраняются
        </p>
      </div>
    </div>
  );
}

// ─── Group Chat ───────────────────────────────────────────────────────────────
function GroupChat({ group, user, onBack }: { group: Group; user: User; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [foundUsers, setFoundUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    const data = await apiFetch(`/messages?group_id=${group.id}`);
    if (data.messages) setMessages(data.messages);
    setLoading(false);
  }, [group.id]);

  const loadMembers = useCallback(async () => {
    const data = await apiFetch(`/groups/members?group_id=${group.id}`);
    if (data.members) setMembers(data.members);
  }, [group.id]);

  useEffect(() => {
    loadMessages();
    loadMembers();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages, loadMembers]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim()) return;
    const t = text;
    setText("");
    await apiFetch("/messages", {
      method: "POST",
      body: JSON.stringify({ group_id: group.id, user_id: user.id, text: t }),
    });
    loadMessages();
  };

  const searchUsers = async (q: string) => {
    setSearchUser(q);
    if (!q) { setFoundUsers([]); return; }
    const data = await apiFetch(`/users?q=${encodeURIComponent(q)}`);
    if (data.users) setFoundUsers(data.users);
  };

  const addMember = async (uid: number) => {
    await apiFetch("/groups/join", {
      method: "POST",
      body: JSON.stringify({ group_id: group.id, user_id: uid }),
    });
    loadMembers();
    setSearchUser("");
    setFoundUsers([]);
  };

  const timeStr = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 hover:bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center transition-colors">
          <Icon name="ArrowLeft" size={18} className="text-[hsl(var(--muted-foreground))]" />
        </button>
        <Av name={group.name} size={38} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[hsl(var(--foreground))] truncate">{group.name}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">👥 {group.member_count} участников</div>
        </div>
        <button onClick={() => setShowMembers(!showMembers)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showMembers ? "bg-blue-600/20 text-blue-400" : "hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"}`}>
          <Icon name="Users" size={17} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {loading && <div className="text-center text-[hsl(var(--muted-foreground))] text-sm py-8">Загрузка...</div>}
            {!loading && messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💬</div>
                <div className="text-[hsl(var(--muted-foreground))] text-sm">Пока нет сообщений. Напишите первым!</div>
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = m.username === user.username;
              const showName = !isMe && (i === 0 || messages[i-1].username !== m.username);
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${isMe ? "" : "flex gap-2 items-end"}`}>
                    {!isMe && showName && <Av name={m.display_name} size={28} />}
                    {!isMe && !showName && <div className="w-7" />}
                    <div>
                      {showName && !isMe && (
                        <div className="text-xs font-medium text-blue-400 mb-1 ml-1">@{m.username}</div>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-bl-sm"
                      }`}>
                        {m.text}
                      </div>
                      <div className={`text-[10px] mt-1 text-[hsl(var(--muted-foreground))] ${isMe ? "text-right" : "text-left ml-1"}`}>
                        {timeStr(m.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[hsl(var(--border))] flex-shrink-0 relative">
            {showEmoji && (
              <div className="absolute bottom-16 left-3 z-20">
                <EmojiPicker onPick={em => { setText(t => t + em); setShowEmoji(false); }} />
              </div>
            )}
            <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] rounded-2xl px-1 py-1">
              <button onClick={() => setShowEmoji(!showEmoji)}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-[hsl(var(--border))] rounded-xl transition-colors">
                😊
              </button>
              <input
                value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Сообщение..."
                className="flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <button onClick={send} disabled={!text.trim()}
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors">
                <Icon name="Send" size={15} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Members panel */}
        {showMembers && (
          <div className="w-64 border-l border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--card))] flex-shrink-0 animate-slide-in-right">
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <div className="font-semibold text-[hsl(var(--foreground))] text-sm mb-3">Участники ({members.length})</div>
              <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] rounded-xl px-3 py-2 mb-2">
                <span className="text-[hsl(var(--muted-foreground))] text-sm">@</span>
                <input value={searchUser} onChange={e => searchUsers(e.target.value)}
                  placeholder="добавить по @нику"
                  className="flex-1 bg-transparent text-xs text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
              </div>
              {foundUsers.length > 0 && (
                <div className="space-y-1">
                  {foundUsers.map(u => (
                    <button key={u.id} onClick={() => addMember(u.id)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-[hsl(var(--secondary))] rounded-xl text-left transition-colors">
                      <Av name={u.display_name} size={28} />
                      <div>
                        <div className="text-xs font-medium text-[hsl(var(--foreground))]">{u.display_name}</div>
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))]">@{u.username}</div>
                      </div>
                      <Icon name="UserPlus" size={13} className="text-blue-400 ml-auto" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl">
                  <Av name={m.display_name} size={30} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{m.display_name}</div>
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))]">@{m.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Groups Section ───────────────────────────────────────────────────────────
function GroupsSection({ user }: { user: User }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await apiFetch(`/groups?user_id=${user.id}`);
    if (data.groups) setGroups(data.groups);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) return;
    const data = await apiFetch("/groups", {
      method: "POST",
      body: JSON.stringify({ name: form.name, description: form.description, user_id: user.id }),
    });
    if (data.group) {
      setCreating(false);
      setForm({ name: "", description: "" });
      load();
    }
  };

  const joinGroup = async (gid: number) => {
    await apiFetch("/groups/join", {
      method: "POST",
      body: JSON.stringify({ group_id: gid, user_id: user.id }),
    });
    load();
  };

  if (activeGroup) {
    return <GroupChat group={activeGroup} user={user} onBack={() => { setActiveGroup(null); load(); }} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
        <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Группы</h2>
        <button onClick={() => setCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors">
          <Icon name="Plus" size={14} /> Создать
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {creating && (
          <div className="bg-[hsl(var(--card))] border border-blue-500/40 rounded-2xl p-4 mb-4 animate-scale-in">
            <div className="font-semibold text-[hsl(var(--foreground))] mb-3 text-sm">Новая группа</div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Название группы"
              className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-3 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 mb-2 transition-colors" />
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Описание (необязательно)"
              className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-3 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 mb-3 transition-colors" />
            <div className="flex gap-2">
              <button onClick={create} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">Создать</button>
              <button onClick={() => setCreating(false)} className="bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-xl px-4 py-2 text-sm transition-colors">Отмена</button>
            </div>
          </div>
        )}

        {loading && <div className="text-center text-[hsl(var(--muted-foreground))] py-8 text-sm">Загрузка...</div>}

        {!loading && groups.length === 0 && !creating && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">👥</div>
            <div className="text-[hsl(var(--muted-foreground))] text-sm mb-4">У вас нет групп</div>
            <button onClick={() => setCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
              Создать первую группу
            </button>
          </div>
        )}

        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.id} onClick={() => setActiveGroup(g)}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-500/50 hover:bg-[hsl(var(--secondary))/50] transition-all active:scale-[0.99]">
              <Av name={g.name} size={50} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[hsl(var(--foreground))] truncate">{g.name}</div>
                {g.description && <div className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">{g.description}</div>}
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">👥 {g.member_count} участников</div>
              </div>
              <Icon name="ChevronRight" size={18} className="text-[hsl(var(--muted-foreground))] flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Contacts / Search ────────────────────────────────────────────────────────
function ContactsSection() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q: string) => {
    setSearch(q);
    if (!q) { setUsers([]); return; }
    setLoading(true);
    const data = await apiFetch(`/users?q=${encodeURIComponent(q.replace(/^@/,""))}`);
    if (data.users) setUsers(data.users);
    setLoading(false);
  };

  const timeAgo = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 2) return "В сети";
      if (min < 60) return `${min} мин назад`;
      const h = Math.floor(min / 60);
      if (h < 24) return `${h} ч назад`;
      return `${Math.floor(h / 24)} дн назад`;
    } catch { return ""; }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
        <h2 className="text-lg font-bold text-[hsl(var(--foreground))] mb-3">Поиск людей</h2>
        <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-3 py-2.5 focus-within:border-blue-500 transition-colors">
          <span className="text-[hsl(var(--muted-foreground))] font-medium text-sm">@</span>
          <input value={search} onChange={e => doSearch(e.target.value)}
            placeholder="введите никнейм для поиска"
            className="flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
          />
          {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!search && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <div className="text-[hsl(var(--muted-foreground))] text-sm">Введите @никнейм для поиска</div>
          </div>
        )}
        <div className="space-y-2">
          {users.map(u => {
            const online = timeAgo(u.last_seen) === "В сети";
            return (
              <div key={u.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/40 transition-all">
                <div className="relative">
                  <Av name={u.display_name} size={46} />
                  {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[hsl(var(--background))] rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[hsl(var(--foreground))]">{u.display_name}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">@{u.username}</div>
                  <div className={`text-xs mt-0.5 ${online ? "text-emerald-400" : "text-[hsl(var(--muted-foreground))]"}`}>{timeAgo(u.last_seen)}</div>
                </div>
              </div>
            );
          })}
          {search && users.length === 0 && !loading && (
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">Никто не найден</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsSection({ user, theme, setTheme, onLogout }: {
  user: User; theme: Theme; setTheme: (t: Theme) => void; onLogout: () => void;
}) {
  const [notif, setNotif] = useState(true);
  const [sounds, setSounds] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h2 className="text-lg font-bold text-[hsl(var(--foreground))] mb-4">Настройки</h2>
      <div className="space-y-3 max-w-lg">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <Av name={user.display_name} size={56} />
            <div>
              <div className="font-bold text-[hsl(var(--foreground))]">{user.display_name}</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">@{user.username}</div>
              {user.is_admin && <div className="text-xs text-red-400 font-medium mt-1">🛡️ Администратор</div>}
            </div>
          </div>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="font-semibold mb-4 text-[hsl(var(--foreground))] text-sm">🎨 Тема</div>
          <div className="flex gap-2">
            {(["dark","light"] as Theme[]).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${theme === t ? "border-blue-500 bg-blue-600/20 text-blue-400" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-blue-500/40"}`}>
                {t === "dark" ? "🌙 Тёмная" : "☀️ Светлая"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="font-semibold mb-4 text-[hsl(var(--foreground))] text-sm">🔔 Уведомления</div>
          <div className="space-y-3">
            {[{ label: "Push-уведомления", val: notif, set: setNotif }, { label: "Звуки сообщений", val: sounds, set: setSounds }].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm text-[hsl(var(--foreground))]">{item.label}</span>
                <Toggle value={item.val} onChange={item.set} />
              </div>
            ))}
          </div>
        </div>

        <button onClick={onLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl p-4 font-medium text-sm transition-colors flex items-center justify-center gap-2">
          <Icon name="LogOut" size={16} /> Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

// ─── Admin Section ────────────────────────────────────────────────────────────
function AdminSection() {
  const [data, setData] = useState<{ messages: (Message & { group_name: string; group_id: number })[]; users: (User & { last_seen: string })[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"msgs" | "users">("msgs");

  useEffect(() => {
    apiFetch("/admin/chats").then(d => { setData(d); setLoading(false); });
  }, []);

  const timeStr = (iso: string) => {
    try { return new Date(iso).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
            <Icon name="ShieldAlert" size={17} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-[hsl(var(--foreground))]">Панель администратора</h2>
            <div className="text-xs text-red-400">Доступ только для администраторов</div>
          </div>
        </div>
        <div className="flex gap-2">
          {(["msgs","users"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${tab === t ? "bg-blue-600 text-white" : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"}`}>
              {t === "msgs" ? "💬 Сообщения" : "👥 Пользователи"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="text-center text-[hsl(var(--muted-foreground))] py-8 text-sm">Загрузка...</div>}
        {!loading && data && tab === "msgs" && (
          <div className="space-y-2">
            {data.messages.map(m => (
              <div key={m.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 flex gap-3">
                <Av name={m.display_name} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[hsl(var(--foreground))]">@{m.username}</span>
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 rounded-lg px-2 py-0.5 truncate">{m.group_name}</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-auto flex-shrink-0">{timeStr(m.created_at)}</span>
                  </div>
                  <div className="text-sm text-[hsl(var(--foreground))] break-words">{m.text}</div>
                </div>
              </div>
            ))}
            {data.messages.length === 0 && <div className="text-center text-[hsl(var(--muted-foreground))] py-8 text-sm">Сообщений нет</div>}
          </div>
        )}
        {!loading && data && tab === "users" && (
          <div className="space-y-2">
            {data.users.map(u => (
              <div key={u.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 flex items-center gap-3">
                <Av name={u.display_name} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[hsl(var(--foreground))]">{u.display_name}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">@{u.username}</div>
                </div>
                {u.is_admin && <span className="text-[10px] text-red-400 bg-red-500/10 rounded-lg px-2 py-1">Admin</span>}
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{timeStr(u.last_seen)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; }
  });
  const [section, setSection] = useState<Section>("groups");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminErr, setAdminErr] = useState(false);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const login = (u: User) => {
    localStorage.setItem("nc_user", JSON.stringify(u));
    setUser(u);
    if (u.is_admin) setSection("admin");
    else setSection("groups");
  };

  const logout = () => {
    localStorage.removeItem("nc_user");
    setUser(null);
  };

  if (!user) return <AuthScreen onLogin={login} />;

  type NavItem = { id: Section; icon: "Users2" | "Users" | "Settings" | "ShieldAlert"; label: string; adminOnly?: boolean };
  const NAV: NavItem[] = [
    { id: "groups", icon: "Users2", label: "Группы" },
    { id: "contacts", icon: "Users", label: "Контакты" },
    { id: "settings", icon: "Settings", label: "Настройки" },
  ];

  const handleAdminClick = () => {
    if (user.is_admin) { setSection("admin"); return; }
    setShowAdminLogin(true);
    setAdminErr(false);
    setAdminPwd("");
  };

  const tryAdminLogin = () => {
    const stored = localStorage.getItem("admin_password") || "1806timosa";
    if (adminPwd === stored) {
      setShowAdminLogin(false);
      setSection("admin");
    } else {
      setAdminErr(true);
    }
  };

  return (
    <div className={`h-screen flex flex-col font-golos ${theme}`} style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in" onClick={() => setShowAdminLogin(false)}>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 w-72 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <Icon name="ShieldAlert" size={18} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-[hsl(var(--foreground))]">Пароль администратора</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Введите для входа в панель</div>
              </div>
            </div>
            <input type="password" value={adminPwd} onChange={e => { setAdminPwd(e.target.value); setAdminErr(false); }}
              onKeyDown={e => e.key === "Enter" && tryAdminLogin()}
              placeholder="Пароль" autoFocus
              className={`w-full bg-[hsl(var(--secondary))] border ${adminErr ? "border-red-500" : "border-[hsl(var(--border))]"} rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 transition-colors mb-2`}
            />
            {adminErr && <div className="text-red-400 text-xs mb-2">Неверный пароль</div>}
            <button onClick={tryAdminLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors">Войти</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] flex-shrink-0" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Icon name="Zap" size={15} className="text-white" />
          </div>
          <span className="font-bold text-[hsl(var(--foreground))] tracking-tight">NightChat</span>
        </div>

        <nav className="flex items-center gap-0.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${section === n.id ? "bg-blue-600 text-white" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"}`}>
              <Icon name={n.icon} size={15} />
              <span className="hidden sm:inline">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 hover:bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center transition-colors text-[hsl(var(--muted-foreground))]">
            <Icon name={theme === "dark" ? "Sun" : "Moon"} size={15} />
          </button>
          <button onClick={handleAdminClick} title="Админ-панель"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${section === "admin" ? "bg-red-600 text-white" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"}`}>
            <Icon name="ShieldAlert" size={15} />
          </button>
          <div className="w-8 h-8 ml-1 cursor-pointer" onClick={() => setSection("settings")}>
            <Av name={user.display_name} size={32} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        {section === "groups" && <GroupsSection user={user} />}
        {section === "contacts" && <ContactsSection />}
        {section === "settings" && <SettingsSection user={user} theme={theme} setTheme={setTheme} onLogout={logout} />}
        {section === "admin" && <AdminSection />}
      </main>
    </div>
  );
}
