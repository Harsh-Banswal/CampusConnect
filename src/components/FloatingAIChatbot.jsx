import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronUp, Loader2, Maximize2, MessageSquare, Send, Sparkles, UserRound, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { answerCampusQuestion, getQuickPrompts } from '../lib/campusAssistant';

function formatMessage(text) {
  return String(text || '').split('\n').map((line, index) => {
    if (!line.trim()) return <br key={index} />;
    if (line.trim().startsWith('- ')) {
      return (
        <div key={index} className="mb-1 flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-60" />
          <span>{line.trim().slice(2)}</span>
        </div>
      );
    }
    return <p key={index} className="mb-2 last:mb-0">{line}</p>;
  });
}

function normalizeProfile(profile) {
  return {
    ...profile,
    available: profile.available !== false,
    projects: profile.projects?.length || 0,
    skills: profile.skills || [],
  };
}

export default function FloatingAIChatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const bottomRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      from: 'assistant',
      text: 'Hi, I am Campus AI. Ask me about events, teammates, ideas, or what to prepare for next.',
    },
  ]);

  const quickPrompts = useMemo(() => getQuickPrompts(), []);

  useEffect(() => {
    if (!open || !user) return;

    async function loadContext() {
      setLoading(true);
      const [{ data: eventData, error: eventError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase.from('events').select('*, event_registrations(count)').order('date', { ascending: true }),
        supabase.from('profiles').select('*, projects(id)').eq('role', 'student'),
      ]);

      if (!eventError && eventData) {
        setEvents(eventData.map((event) => ({
          ...event,
          registrations: event.event_registrations?.[0]?.count || 0,
        })));
      }

      if (!profileError && profileData) {
        setStudents(profileData.map(normalizeProfile));
      }

      setLoading(false);
    }

    loadContext();
  }, [open, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, open]);

  if (!user || location.pathname === '/ai-assistant') return null;

  const askAssistant = async (question) => {
    const clean = question.trim();
    if (!clean || thinking) return;

    setInput('');
    setMessages((current) => [...current, { id: Date.now(), from: 'user', text: clean }]);
    setThinking(true);

    window.setTimeout(() => {
      const answer = answerCampusQuestion(clean, { events, students, user });
      setMessages((current) => [...current, { id: Date.now() + 1, from: 'assistant', text: answer }]);
      setThinking(false);
    }, 350);
  };

  const toggleOpen = () => setOpen((current) => !current);

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {open && (
        <div className="mb-3 w-[min(92vw,420px)] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
          <div className="flex items-center justify-between border-b border-slate-100 bg-[linear-gradient(135deg,#2e1065_0%,#6d28d9_100%)] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-violet-200">
                <Bot size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Campus AI</p>
                <p className="text-[11px] text-violet-100/80">Bottom-right chatbot</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/ai-assistant')}
                className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="Open full assistant"
              >
                <Maximize2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="Close chatbot"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[58vh] overflow-y-auto bg-slate-50/70 px-4 py-4">
            <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700">
                <Sparkles size={12} /> Try asking
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {quickPrompts.slice(0, 4).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => askAssistant(prompt)}
                    className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:border-violet-200 hover:bg-violet-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {messages.map((message) => {
                const fromUser = message.from === 'user';
                return (
                  <div key={message.id} className={`flex ${fromUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[88%] gap-2 ${fromUser ? 'flex-row-reverse' : ''}`}>
                      <div className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                        fromUser ? 'bg-slate-900 text-white' : 'bg-violet-100 text-violet-700'
                      }`}>
                        {fromUser ? <UserRound size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        fromUser
                          ? 'rounded-br-md bg-slate-900 text-white'
                          : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                      }`}>
                        {formatMessage(message.text)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {thinking && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                      <Bot size={14} />
                    </div>
                    <div className="rounded-3xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="animate-spin" size={14} /> Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                className="input-field flex-1"
                placeholder="Ask Campus AI..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') askAssistant(input);
                }}
                disabled={loading}
              />
              <button
                onClick={() => askAssistant(input)}
                disabled={loading || thinking || !input.trim()}
                className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6d28d9_0%,#7c3aed_100%)] text-white shadow-2xl shadow-violet-500/25 transition hover:scale-105"
        aria-label="Open Campus AI chatbot"
      >
        {open ? <ChevronUp size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}
