import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ────────────────────────────────────────────────────────────────────
type Theme = "dark" | "light";
type Section = "chats" | "groups" | "contacts" | "bots" | "settings" | "editor" | "admin";

interface Message {
  id: number;
  text: string;
  out: boolean;
  time: string;
  reactions?: string[];
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  messages: Message[];
  pinned?: boolean;
  muted?: boolean;
}

interface Group {
  id: number;
  name: string;
  avatar: string;
  members: number;
  lastMsg: string;
  time: string;
  description: string;
}

interface Bot {
  id: number;
  name: string;
  token: string;
  code: string;
  active: boolean;
  description: string;
}

interface Contact {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  online: boolean;
  status: string;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INIT_CHATS: Chat[] = [
  {
    id: 1, name: "Алексей Петров", avatar: "АП", lastMsg: "Окей, увидимся завтра!", time: "14:32",
    unread: 3, online: true, pinned: true,
    messages: [
      { id: 1, text: "Привет! Как дела?", out: false, time: "14:20" },
      { id: 2, text: "Всё отлично, спасибо! Ты когда будешь?", out: true, time: "14:25" },
      { id: 3, text: "Окей, увидимся завтра!", out: false, time: "14:32" },
    ]
  },
  {
    id: 2, name: "Мария Смирнова", avatar: "МС", lastMsg: "Отправила файлы на почту", time: "12:10",
    unread: 0, online: false, muted: true,
    messages: [
      { id: 1, text: "Отправила файлы на почту", out: false, time: "12:10" },
    ]
  },
  {
    id: 3, name: "Дмитрий Козлов", avatar: "ДК", lastMsg: "👍", time: "Вчера",
    unread: 1, online: true,
    messages: [
      { id: 1, text: "Проект готов?", out: true, time: "Вчера" },
      { id: 2, text: "👍", out: false, time: "Вчера" },
    ]
  },
];

const INIT_GROUPS: Group[] = [
  { id: 1, name: "Команда разработки", avatar: "КР", members: 12, lastMsg: "Деплой прошёл успешно!", time: "15:00", description: "Обсуждение проектов и задач" },
  { id: 2, name: "Маркетинг 2026", avatar: "М2", members: 8, lastMsg: "Новая кампания запущена", time: "11:45", description: "Стратегия и продвижение" },
  { id: 3, name: "Общий чат", avatar: "ОЧ", members: 34, lastMsg: "Всем привет! 👋", time: "09:20", description: "Общение всей команды" },
];

const INIT_BOTS: Bot[] = [
  {
    id: 1, name: "NotifyBot", token: "7891234567:AAHxxxxxxxx", active: true,
    description: "Отправляет уведомления",
    code: `import os
import requests

BOT_TOKEN = os.environ['BOT_TOKEN']
CHAT_ID = os.environ['CHAT_ID']

def send_message(text: str):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    data = {"chat_id": CHAT_ID, "text": text}
    response = requests.post(url, json=data)
    return response.json()

def handler(event: dict, context) -> dict:
    """Бот уведомлений"""
    body = event.get('body', '{}')
    import json
    payload = json.loads(body)
    result = send_message(payload.get('message', 'Тест'))
    return {"statusCode": 200, "body": json.dumps(result)}
`
  },
];

const INIT_CONTACTS: Contact[] = [
  { id: 1, name: "Алексей Петров", phone: "+7 999 111-22-33", avatar: "АП", online: true, status: "В сети" },
  { id: 2, name: "Мария Смирнова", phone: "+7 999 444-55-66", avatar: "МС", online: false, status: "Была час назад" },
  { id: 3, name: "Дмитрий Козлов", phone: "+7 999 777-88-99", avatar: "ДК", online: true, status: "В сети" },
  { id: 4, name: "Елена Новикова", phone: "+7 999 000-11-22", avatar: "ЕН", online: false, status: "Была вчера" },
];

// ─── Helper Components ────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-orange-500", "bg-red-600",
];

function AvatarEl({ initials, size = 40 }: { initials: string; size?: number }) {
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-white ${AVATAR_COLORS[idx]}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  if (!online) return null;
  return <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[hsl(var(--background))] rounded-full" />;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full relative transition-colors ${value ? "bg-blue-600" : "bg-[hsl(var(--border))]"}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${value ? "translate-x-7" : "translate-x-1"}`} />
    </button>
  );
}

// ─── Admin Login Modal ────────────────────────────────────────────────────────
function AdminLoginModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);

  const getStoredPwd = () => localStorage.getItem("admin_password") || "1806timosa";

  const handle = () => {
    if (pwd === getStoredPwd()) { setError(false); onSuccess(); }
    else { setError(true); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in" onClick={onClose}>
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 w-80 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
            <Icon name="ShieldAlert" size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-[hsl(var(--foreground))]">Админ-панель</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Введите пароль для входа</div>
          </div>
        </div>
        <input
          type="password" placeholder="Пароль" value={pwd}
          onChange={e => { setPwd(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && handle()}
          className={`w-full bg-[hsl(var(--input))] border ${error ? "border-red-500" : "border-[hsl(var(--border))]"} rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 transition-colors mb-3`}
          autoFocus
        />
        {error && <div className="text-red-500 text-xs mb-3">Неверный пароль</div>}
        <button onClick={handle} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors">
          Войти
        </button>
        <button onClick={onClose} className="w-full mt-2 text-[hsl(var(--muted-foreground))] text-sm hover:text-[hsl(var(--foreground))] transition-colors py-2">
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Call Modal ───────────────────────────────────────────────────────────────
function CallModal({ name, avatar, onClose }: { name: string; avatar: string; onClose: () => void }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
      <div className="bg-gradient-to-b from-[hsl(222,20%,12%)] to-[hsl(222,20%,8%)] rounded-3xl p-8 w-72 text-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          {[1, 2, 3].map(i => (
            <div key={i} className="absolute border-2 border-blue-400 rounded-full pulse-ring"
              style={{ width: i * 80, height: i * 80, animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="mx-auto mb-4 inline-block"><AvatarEl initials={avatar} size={80} /></div>
          <div className="text-xl font-bold text-white mb-1">{name}</div>
          <div className="text-blue-300 text-sm mb-8">{fmt(sec)}</div>
          <div className="flex justify-center gap-4">
            <button onClick={onClose} className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors">
              <Icon name="PhoneOff" size={22} className="text-white" />
            </button>
            <button className="w-14 h-14 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] rounded-full flex items-center justify-center transition-colors">
              <Icon name="Mic" size={22} className="text-[hsl(var(--foreground))]" />
            </button>
            <button className="w-14 h-14 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] rounded-full flex items-center justify-center transition-colors">
              <Icon name="Video" size={22} className="text-[hsl(var(--foreground))]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chats ────────────────────────────────────────────────────────────────────
const EMOJIS = ["❤️", "👍", "😂", "😮", "👎", "🔥"];

function ChatsSection({ chats, setChats }: { chats: Chat[]; setChats: (c: Chat[]) => void }) {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [calling, setCalling] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const pinned = filtered.filter(c => c.pinned);
  const regular = filtered.filter(c => !c.pinned);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages.length]);

  const sendMsg = () => {
    if (!msg.trim() || !activeChat) return;
    const newMsg: Message = {
      id: Date.now(), text: msg, out: true,
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })
    };
    const updated = chats.map(c => c.id === activeChat.id ? { ...c, messages: [...c.messages, newMsg], lastMsg: msg } : c);
    setChats(updated);
    setActiveChat(updated.find(c => c.id === activeChat.id)!);
    setMsg("");
  };

  const addReaction = (chatId: number, msgId: number, emoji: string) => {
    const updated = chats.map(c => c.id === chatId
      ? { ...c, messages: c.messages.map(m => m.id === msgId ? { ...m, reactions: [...(m.reactions || []), emoji] } : m) }
      : c);
    setChats(updated);
    setActiveChat(updated.find(c => c.id === chatId)!);
    setReactionMsgId(null);
  };

  const openChat = (chat: Chat) => {
    setActiveChat(chat);
    setChats(chats.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
  };

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-[hsl(var(--border))] flex flex-col flex-shrink-0">
        <div className="p-3">
          <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] rounded-xl px-3 py-2">
            <Icon name="Search" size={16} className="text-[hsl(var(--muted-foreground))]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
              className="bg-transparent text-sm outline-none w-full text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {pinned.length > 0 && <div className="px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] font-medium">📌 Закреплённые</div>}
          {[...pinned, ...regular].map(chat => (
            <div key={chat.id} onClick={() => openChat(chat)}
              className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[hsl(var(--secondary))] transition-colors rounded-xl mb-1 ${activeChat?.id === chat.id ? "bg-[hsl(var(--secondary))]" : ""}`}>
              <div className="relative flex-shrink-0"><AvatarEl initials={chat.avatar} size={46} /><OnlineDot online={chat.online} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-[hsl(var(--foreground))] truncate">{chat.name}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] flex-shrink-0 ml-1">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">{chat.muted ? "🔕 " : ""}{chat.lastMsg}</span>
                  {chat.unread > 0 && <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{chat.unread}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors">
            <Icon name="Plus" size={16} /> Новый чат
          </button>
        </div>
      </div>

      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
            <div className="relative"><AvatarEl initials={activeChat.avatar} size={38} /><OnlineDot online={activeChat.online} /></div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-[hsl(var(--foreground))]">{activeChat.name}</div>
              <div className={`text-xs ${activeChat.online ? "text-emerald-400" : "text-[hsl(var(--muted-foreground))]"}`}>{activeChat.online ? "в сети" : "не в сети"}</div>
            </div>
            <div className="flex items-center gap-1">
              {(["Phone", "Video", "MoreVertical"] as const).map(icon => (
                <button key={icon} onClick={() => icon !== "MoreVertical" && setCalling(true)}
                  className="w-9 h-9 hover:bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center transition-colors">
                  <Icon name={icon} size={17} className="text-[hsl(var(--muted-foreground))]" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2" onClick={() => setReactionMsgId(null)}>
            {activeChat.messages.map(m => (
              <div key={m.id} className={`flex ${m.out ? "justify-end" : "justify-start"}`}>
                <div className="relative max-w-xs lg:max-w-sm">
                  <div
                    className={`px-4 py-2 text-sm cursor-pointer ${m.out ? "bg-blue-600 text-white msg-bubble-out" : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] msg-bubble-in border border-[hsl(var(--border))]"}`}
                    onDoubleClick={() => setReactionMsgId(m.id)}
                  >
                    {m.text}
                    <span className={`text-[10px] ml-2 ${m.out ? "text-blue-200" : "text-[hsl(var(--muted-foreground))]"}`}>{m.time}</span>
                  </div>
                  {m.reactions && m.reactions.length > 0 && (
                    <div className={`flex gap-1 mt-1 flex-wrap ${m.out ? "justify-end" : "justify-start"}`}>
                      {m.reactions.map((r, i) => <span key={i} className="text-xs bg-[hsl(var(--secondary))] rounded-full px-1.5 py-0.5">{r}</span>)}
                    </div>
                  )}
                  {reactionMsgId === m.id && (
                    <div className="absolute bottom-full mb-2 left-0 bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-2xl p-2 flex gap-2 shadow-xl z-20 animate-scale-in"
                      onClick={e => e.stopPropagation()}>
                      {EMOJIS.map(e => (
                        <button key={e} onClick={() => addReaction(activeChat.id, m.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-[hsl(var(--border))]">
            <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] rounded-2xl px-4 py-2">
              <button className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"><Icon name="Paperclip" size={18} /></button>
              <input value={msg} onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
                placeholder="Сообщение..."
                className="flex-1 bg-transparent text-sm outline-none text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" />
              <button className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"><Icon name="Smile" size={18} /></button>
              <button onClick={sendMsg} disabled={!msg.trim()}
                className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-full flex items-center justify-center transition-colors ml-1">
                <Icon name="Send" size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center"><div className="text-6xl mb-4">💬</div><div className="text-[hsl(var(--muted-foreground))] text-sm">Выберите чат для начала общения</div></div>
        </div>
      )}
      {calling && activeChat && <CallModal name={activeChat.name} avatar={activeChat.avatar} onClose={() => setCalling(false)} />}
    </div>
  );
}

// ─── Groups ───────────────────────────────────────────────────────────────────
function GroupsSection({ groups, setGroups }: { groups: Group[]; setGroups: (g: Group[]) => void }) {
  const [editing, setEditing] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const openCreate = () => { setCreating(true); setEditing(null); setForm({ name: "", description: "" }); };
  const openEdit = (g: Group) => { setEditing(g); setCreating(true); setForm({ name: g.name, description: g.description }); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setGroups(groups.map(g => g.id === editing.id ? { ...g, ...form } : g));
    } else {
      setGroups([...groups, { id: Date.now(), avatar: form.name.slice(0, 2).toUpperCase(), members: 1, lastMsg: "Группа создана", time: "Сейчас", ...form }]);
    }
    setCreating(false); setEditing(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Группы</h2>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors">
          <Icon name="Plus" size={16} /> Создать
        </button>
      </div>

      {creating && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 mb-4 animate-scale-in">
          <div className="font-semibold mb-3 text-[hsl(var(--foreground))]">{editing ? "Редактировать" : "Новая группа"}</div>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Название"
            className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 mb-3 transition-colors" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Описание" rows={2}
            className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 mb-3 resize-none transition-colors" />
          <div className="flex gap-2">
            <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">{editing ? "Сохранить" : "Создать"}</button>
            <button onClick={() => { setCreating(false); setEditing(null); }} className="bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl px-4 py-2 text-sm transition-colors">Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/40 transition-all">
            <AvatarEl initials={g.avatar} size={50} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[hsl(var(--foreground))]">{g.name}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{g.description}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">👥 {g.members} участников</div>
            </div>
            <button onClick={() => openEdit(g)} className="w-9 h-9 hover:bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center transition-colors">
              <Icon name="Pencil" size={15} className="text-[hsl(var(--muted-foreground))]" />
            </button>
            <button onClick={() => setGroups(groups.filter(x => x.id !== g.id))} className="w-9 h-9 hover:bg-red-500/20 rounded-xl flex items-center justify-center transition-colors">
              <Icon name="Trash2" size={15} className="text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
function ContactsSection({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Контакты</h2>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">{contacts.length} контактов</span>
      </div>
      <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] rounded-xl px-3 py-2 mb-4">
        <Icon name="Search" size={16} className="text-[hsl(var(--muted-foreground))]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
          className="bg-transparent text-sm outline-none w-full text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" />
      </div>
      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/40 transition-all">
            <div className="relative"><AvatarEl initials={c.avatar} size={46} /><OnlineDot online={c.online} /></div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-[hsl(var(--foreground))]">{c.name}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{c.phone}</div>
              <div className={`text-xs mt-0.5 ${c.online ? "text-emerald-400" : "text-[hsl(var(--muted-foreground))]"}`}>{c.status}</div>
            </div>
            <button className="w-9 h-9 hover:bg-blue-600/20 rounded-xl flex items-center justify-center transition-colors">
              <Icon name="MessageSquare" size={16} className="text-blue-400" />
            </button>
            <button className="w-9 h-9 hover:bg-emerald-600/20 rounded-xl flex items-center justify-center transition-colors">
              <Icon name="Phone" size={16} className="text-emerald-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bots ─────────────────────────────────────────────────────────────────────
const DEFAULT_BOT_CODE = `import os
import json
import requests

def handler(event: dict, context) -> dict:
    """Мой бот"""
    body = json.loads(event.get('body', '{}'))
    
    message = body.get('message', {})
    text = message.get('text', '')
    chat_id = message.get('chat', {}).get('id')
    
    if text == '/start':
        requests.post(
            f"https://api.telegram.org/bot{os.environ['BOT_TOKEN']}/sendMessage",
            json={"chat_id": chat_id, "text": "Привет! Я бот 🤖"}
        )
    
    return {"statusCode": 200, "body": json.dumps({"ok": True})}
`;

function BotsSection({ bots, setBots }: { bots: Bot[]; setBots: (b: Bot[]) => void }) {
  const [activeBot, setActiveBot] = useState<Bot | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", token: "" });
  const [editCode, setEditCode] = useState("");

  const save = () => {
    if (!form.name.trim()) return;
    setBots([...bots, { id: Date.now(), active: false, code: DEFAULT_BOT_CODE, ...form }]);
    setCreating(false);
    setForm({ name: "", description: "", token: "" });
  };

  const saveCode = () => {
    if (!activeBot) return;
    setBots(bots.map(b => b.id === activeBot.id ? { ...b, code: editCode } : b));
    setActiveBot({ ...activeBot, code: editCode });
  };

  const openBot = (b: Bot) => { setActiveBot(b); setEditCode(b.code); setCreating(false); };

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-[hsl(var(--border))] flex flex-col p-3">
        <div className="font-bold text-[hsl(var(--foreground))] mb-3 px-1">Боты</div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {bots.map(b => (
            <div key={b.id} onClick={() => openBot(b)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-[hsl(var(--secondary))] transition-colors ${activeBot?.id === b.id && !creating ? "bg-[hsl(var(--secondary))]" : ""}`}>
              <div className="w-10 h-10 bg-purple-700 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🤖</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[hsl(var(--foreground))] truncate">{b.name}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">{b.description}</div>
              </div>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.active ? "bg-emerald-400" : "bg-[hsl(var(--border))]"}`} />
            </div>
          ))}
        </div>
        <button onClick={() => { setCreating(true); setActiveBot(null); }}
          className="w-full bg-purple-700 hover:bg-purple-800 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors mt-2">
          <Icon name="Plus" size={16} /> Создать бота
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {creating && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="text-lg font-bold mb-5 text-[hsl(var(--foreground))]">🤖 Новый бот</div>
            <div className="space-y-3 max-w-md">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Название бота"
                className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-purple-500 transition-colors" />
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Описание"
                className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-purple-500 transition-colors" />
              <input value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} placeholder="Telegram Bot Token"
                className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-purple-500 transition-colors font-mono" />
              <div className="flex gap-2 pt-1">
                <button onClick={save} className="bg-purple-700 hover:bg-purple-800 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors">Создать</button>
                <button onClick={() => setCreating(false)} className="bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl px-4 py-2 text-sm transition-colors">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {activeBot && !creating && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[hsl(var(--border))]">
              <div className="w-10 h-10 bg-purple-700 rounded-xl flex items-center justify-center text-xl">🤖</div>
              <div className="flex-1">
                <div className="font-bold text-[hsl(var(--foreground))]">{activeBot.name}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{activeBot.description}</div>
              </div>
              <button onClick={() => { setBots(bots.map(b => b.id === activeBot.id ? { ...b, active: !b.active } : b)); setActiveBot({ ...activeBot, active: !activeBot.active }); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeBot.active ? "bg-emerald-600 text-white" : "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"}`}>
                {activeBot.active ? "🟢 Активен" : "Запустить"}
              </button>
              <button onClick={() => { setBots(bots.filter(b => b.id !== activeBot.id)); setActiveBot(null); }}
                className="w-8 h-8 hover:bg-red-500/20 rounded-lg flex items-center justify-center transition-colors">
                <Icon name="Trash2" size={14} className="text-red-400" />
              </button>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-[hsl(var(--muted-foreground))] font-medium">Код бота (Python 3.11)</div>
                <button onClick={saveCode} className="text-xs bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded-lg transition-colors">Сохранить</button>
              </div>
              <textarea
                value={editCode}
                onChange={e => setEditCode(e.target.value)}
                className="flex-1 bg-[hsl(222,22%,6%)] border border-[hsl(var(--border))] rounded-xl p-4 font-mono text-xs text-emerald-300 leading-relaxed resize-none outline-none focus:border-purple-500 transition-colors"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {!activeBot && !creating && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center"><div className="text-5xl mb-3">🤖</div><div className="text-[hsl(var(--muted-foreground))] text-sm">Выберите бота или создайте нового</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsSection({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [notif, setNotif] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [preview, setPreview] = useState(false);

  const changePwd = () => {
    if (newPwd.length < 4) { setPwdMsg("Пароль слишком короткий"); return; }
    if (newPwd !== confirmPwd) { setPwdMsg("Пароли не совпадают"); return; }
    localStorage.setItem("admin_password", newPwd);
    setPwdMsg("✅ Пароль успешно изменён!");
    setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setPwdMsg(""), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-6">Настройки</h2>
      <div className="space-y-4 max-w-xl">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="font-semibold mb-4 text-[hsl(var(--foreground))]">🎨 Тема оформления</div>
          <div className="flex gap-3">
            {(["dark", "light"] as Theme[]).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${theme === t ? "border-blue-500 bg-blue-600/20 text-blue-400" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))]"}`}>
                {t === "dark" ? "🌙 Тёмная" : "☀️ Светлая"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="font-semibold mb-4 text-[hsl(var(--foreground))]">🔔 Уведомления</div>
          <div className="space-y-4">
            {[{ label: "Push-уведомления", val: notif, set: setNotif }, { label: "Звуки сообщений", val: sounds, set: setSounds }, { label: "Предпросмотр сообщений", val: preview, set: setPreview }].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm text-[hsl(var(--foreground))]">{item.label}</span>
                <Toggle value={item.val} onChange={item.set} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="font-semibold mb-1 text-[hsl(var(--foreground))]">🔐 Пароль администратора</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Пароль используется для входа в скрытую панель управления</div>
          <div className="space-y-3">
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Новый пароль"
              className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 transition-colors" />
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Повторите пароль"
              className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-blue-500 transition-colors" />
            {pwdMsg && <div className={`text-xs ${pwdMsg.includes("✅") ? "text-emerald-400" : "text-red-400"}`}>{pwdMsg}</div>}
            <button onClick={changePwd} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors">
              Сменить пароль
            </button>
          </div>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="font-semibold mb-3 text-[hsl(var(--foreground))]">👤 Профиль</div>
          <div className="flex items-center gap-4">
            <AvatarEl initials="ЮА" size={56} />
            <div>
              <div className="font-semibold text-[hsl(var(--foreground))]">Юрий Admin</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">@admin • Администратор</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
type StatIcon = "Users" | "MessageSquare" | "Users2" | "Bot";
interface StatItem { label: string; value: number; icon: StatIcon; color: string; }

function AdminSection({ chats, contacts, groups, bots }: { chats: Chat[]; contacts: Contact[]; groups: Group[]; bots: Bot[] }) {
  const stats: StatItem[] = [
    { label: "Пользователей", value: contacts.length, icon: "Users", color: "text-blue-400 bg-blue-500/10" },
    { label: "Чатов", value: chats.length, icon: "MessageSquare", color: "text-emerald-400 bg-emerald-500/10" },
    { label: "Групп", value: groups.length, icon: "Users2", color: "text-purple-400 bg-purple-500/10" },
    { label: "Ботов", value: bots.length, icon: "Bot", color: "text-orange-400 bg-orange-500/10" },
  ];

  const logs = [
    { time: "15:41", text: "Пользователь admin вошёл в систему", type: "info" },
    { time: "15:38", text: "Бот NotifyBot активирован", type: "success" },
    { time: "14:20", text: "Новое сообщение в группе Команда разработки", type: "info" },
    { time: "12:00", text: "Резервная копия данных создана", type: "success" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
          <Icon name="ShieldAlert" size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Панель управления</h2>
          <div className="text-xs text-red-400 font-medium">⚠️ Секретный раздел</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <Icon name={s.icon} size={20} />
            </div>
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{s.value}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="font-semibold mb-3 text-[hsl(var(--foreground))]">🟢 Активные пользователи</div>
          <div className="space-y-2">
            {contacts.filter(c => c.online).map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-sm text-[hsl(var(--foreground))]">{c.name}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))] ml-auto">{c.phone}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
          <div className="font-semibold mb-3 text-[hsl(var(--foreground))]">📋 Системный журнал</div>
          <div className="space-y-2">
            {logs.map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[hsl(var(--muted-foreground))] flex-shrink-0">{l.time}</span>
                <span className={l.type === "success" ? "text-emerald-400" : "text-[hsl(var(--foreground))]"}>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5">
        <div className="font-semibold mb-3 text-[hsl(var(--foreground))]">🚨 Системные действия</div>
        <div className="flex flex-wrap gap-2">
          {["🗑️ Очистить кэш", "💾 Бекап данных", "🔄 Перезапуск", "📤 Экспорт логов", "🔒 Заблокировать доступ"].map(a => (
            <button key={a} className="bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl px-4 py-2 text-sm transition-colors">
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Site Editor ──────────────────────────────────────────────────────────────
type EditorBlock = { id: number; type: "text" | "icon" | "image"; content: string; x: number; y: number };

const EDITOR_ICONS = ["💬", "📱", "🔔", "⚙️", "👥", "🤖", "🔐", "🌙", "☀️", "🎨", "📌", "❤️", "🚀", "⚡", "🌐"];
const EDITOR_IMAGES = ["🖼️", "🏔️", "🌊", "🌆", "🌌", "🎭", "🎯", "🔮"];

function EditorSection() {
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    { id: 1, type: "text", content: "NightChat Messenger", x: 80, y: 60 },
    { id: 2, type: "icon", content: "💬", x: 280, y: 55 },
    { id: 3, type: "image", content: "🌌", x: 400, y: 100 },
    { id: 4, type: "text", content: "Твой защищённый мессенджер", x: 100, y: 180 },
    { id: 5, type: "icon", content: "🔐", x: 160, y: 260 },
    { id: 6, type: "icon", content: "🚀", x: 220, y: 260 },
  ]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ id: number; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addBlock = (type: EditorBlock["type"], content: string) => {
    setBlocks(prev => [...prev, { id: Date.now(), type, content, x: 80 + Math.random() * 300, y: 80 + Math.random() * 150 }]);
  };

  const onMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelected(id);
    const b = blocks.find(b => b.id === id)!;
    setDragging({ id, ox: e.clientX - b.x, oy: e.clientY - b.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setBlocks(prev => prev.map(b => b.id === dragging.id ? { ...b, x: e.clientX - dragging.ox, y: e.clientY - dragging.oy } : b));
  };

  const selBlock = blocks.find(b => b.id === selected);

  return (
    <div className="flex h-full">
      <div className="w-56 border-r border-[hsl(var(--border))] flex flex-col p-3 overflow-y-auto flex-shrink-0">
        <div className="font-bold text-[hsl(var(--foreground))] mb-1 text-sm">Редактор сайта</div>
        <div className="text-xs text-[hsl(var(--muted-foreground))] mb-3">Перетаскивай блоки</div>

        <div className="mb-3">
          <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wider">Текст</div>
          <button onClick={() => addBlock("text", "Новый блок")}
            className="w-full bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] rounded-xl p-2.5 text-sm text-[hsl(var(--foreground))] text-left transition-colors flex items-center gap-2">
            <Icon name="Type" size={14} /> Добавить текст
          </button>
        </div>

        <div className="mb-3">
          <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wider">Иконки</div>
          <div className="grid grid-cols-5 gap-1">
            {EDITOR_ICONS.map(ic => (
              <button key={ic} onClick={() => addBlock("icon", ic)}
                className="aspect-square rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] flex items-center justify-center text-base transition-all hover:scale-110">
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wider">Изображения</div>
          <div className="grid grid-cols-4 gap-1">
            {EDITOR_IMAGES.map(img => (
              <button key={img} onClick={() => addBlock("image", img)}
                className="aspect-square rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] flex items-center justify-center text-xl transition-all hover:scale-110">
                {img}
              </button>
            ))}
          </div>
        </div>

        {selBlock && (
          <div className="mt-auto border-t border-[hsl(var(--border))] pt-3">
            <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">Свойства</div>
            {selBlock.type === "text" && (
              <input value={selBlock.content}
                onChange={e => setBlocks(prev => prev.map(b => b.id === selected ? { ...b, content: e.target.value } : b))}
                className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg px-2 py-1.5 text-xs text-[hsl(var(--foreground))] outline-none focus:border-blue-500" />
            )}
            <button onClick={() => { setBlocks(prev => prev.filter(b => b.id !== selected)); setSelected(null); }}
              className="w-full mt-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg py-1.5 text-xs transition-colors">
              Удалить блок
            </button>
          </div>
        )}
      </div>

      <div ref={canvasRef} className="flex-1 relative bg-[hsl(222,22%,5%)] overflow-hidden cursor-default"
        onMouseMove={onMouseMove} onMouseUp={() => setDragging(null)} onClick={() => setSelected(null)}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #4b88ff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        {blocks.map(b => (
          <div key={b.id}
            className={`absolute select-none cursor-grab active:cursor-grabbing transition-shadow ${selected === b.id ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-[hsl(222,22%,5%)] rounded-lg" : ""}`}
            style={{ left: b.x, top: b.y }}
            onMouseDown={e => onMouseDown(e, b.id)}
          >
            {b.type === "text" && (
              <div className="bg-[hsl(var(--card))]/80 backdrop-blur border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] font-semibold whitespace-nowrap shadow-lg">
                {b.content}
              </div>
            )}
            {b.type === "icon" && (
              <div className="text-3xl p-2 bg-[hsl(var(--card))]/60 backdrop-blur rounded-xl border border-[hsl(var(--border))] shadow-lg">
                {b.content}
              </div>
            )}
            {b.type === "image" && (
              <div className="text-5xl p-3 bg-[hsl(var(--card))]/60 backdrop-blur rounded-2xl border border-[hsl(var(--border))] shadow-xl">
                {b.content}
              </div>
            )}
          </div>
        ))}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))]/60 backdrop-blur px-3 py-1.5 rounded-full border border-[hsl(var(--border))]">
          Перетаскивай блоки • Нажми для выбора
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [section, setSection] = useState<Section>("chats");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [chats, setChats] = useState<Chat[]>(INIT_CHATS);
  const [groups, setGroups] = useState<Group[]>(INIT_GROUPS);
  const [bots, setBots] = useState<Bot[]>(INIT_BOTS);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  type NavIcon = "MessageSquare" | "Users2" | "Users" | "Bot" | "Layers" | "Settings";
  const NAV: { id: Section; icon: NavIcon; label: string }[] = [
    { id: "chats", icon: "MessageSquare", label: "Чаты" },
    { id: "groups", icon: "Users2", label: "Группы" },
    { id: "contacts", icon: "Users", label: "Контакты" },
    { id: "bots", icon: "Bot", label: "Боты" },
    { id: "editor", icon: "Layers", label: "Редактор" },
    { id: "settings", icon: "Settings", label: "Настройки" },
  ];

  const totalUnread = chats.reduce((a, c) => a + c.unread, 0);

  const handleAdminClick = () => {
    if (adminUnlocked) setSection("admin");
    else setShowAdminLogin(true);
  };

  return (
    <div className={`h-screen flex flex-col font-golos ${theme}`} style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      {showAdminLogin && (
        <AdminLoginModal
          onSuccess={() => { setAdminUnlocked(true); setShowAdminLogin(false); setSection("admin"); }}
          onClose={() => setShowAdminLogin(false)}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Icon name="Zap" size={16} className="text-white" />
          </div>
          <span className="font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>NightChat</span>
        </div>

        <nav className="flex items-center gap-0.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all relative ${section === n.id ? "bg-blue-600 text-white" : "hover:bg-[hsl(var(--secondary))]"}`}
              style={{ color: section === n.id ? "white" : "hsl(var(--muted-foreground))" }}>
              <Icon name={n.icon} size={15} />
              <span className="hidden md:inline">{n.label}</span>
              {n.id === "chats" && totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{totalUnread}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 hover:bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center transition-colors"
            style={{ color: "hsl(var(--muted-foreground))" }}>
            <Icon name={theme === "dark" ? "Sun" : "Moon"} size={16} />
          </button>
          <button onClick={handleAdminClick} title="Панель администратора"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${section === "admin" ? "bg-red-600 text-white" : adminUnlocked ? "text-red-400 hover:bg-red-500/10" : "hover:bg-[hsl(var(--secondary))]"}`}
            style={{ color: section === "admin" ? "white" : adminUnlocked ? undefined : "hsl(var(--muted-foreground))" }}>
            <Icon name="ShieldAlert" size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {section === "chats" && <ChatsSection chats={chats} setChats={setChats} />}
        {section === "groups" && <GroupsSection groups={groups} setGroups={setGroups} />}
        {section === "contacts" && <ContactsSection contacts={INIT_CONTACTS} />}
        {section === "bots" && <BotsSection bots={bots} setBots={setBots} />}
        {section === "settings" && <SettingsSection theme={theme} setTheme={setTheme} />}
        {section === "editor" && <EditorSection />}
        {section === "admin" && <AdminSection chats={chats} contacts={INIT_CONTACTS} groups={groups} bots={bots} />}
      </main>
    </div>
  );
}