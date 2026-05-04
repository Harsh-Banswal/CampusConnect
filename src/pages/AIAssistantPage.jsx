import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CalendarDays, Loader2, Send, Sparkles, UserRound, Users } from 'lucide-react';
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

export default function AIAssistantPage() {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      from: 'assistant',
      text: 'Hi, I am your Campus AI assistant. Ask me about upcoming events, teammates, event ideas, project pitches, or how to prepare.',
    },
  ]);

  const quickPrompts = useMemo(() => getQuickPrompts(), []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    async function loadContext() {
      setLoading(true);

      const [{ data: eventData, error: eventError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase
          .from('events')
          .select('*, event_registrations(count)')
          .order('date', { ascending: true }),
        supabase
          .from('profiles')
          .select('*, projects(id)')
          .eq('role', 'student'),
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
  }, []);

  const askAssistant = async (question) => {
    const clean = question.trim();
    if (!clean || thinking) return;

    setInput('');
    setMessages((current) => [...current, { id: Date.now(), from: 'user', text: clean }]);
    setThinking(true);

    window.setTimeout(() => {
      const answer = answerCampusQuestion(clean, { events, students, user });
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, from: 'assistant', text: answer },
      ]);
      setThinking(false);
    }, 450);
  };

  const upcomingCount = events.filter((event) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(event.date) >= today && event.status !== 'closed' && event.status !== 'cancelled';
  }).length;

  const availableCount = students.filter((student) => student.id !== user?.id && student.available).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid min-h-[calc(100vh-150px)] grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/50">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-cyan-300">
                <Bot size={22} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900">Campus AI</h1>
                <p className="text-xs text-slate-500">Events, teams, ideas</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              This assistant answers using your CampusConnect data, including events, skills, registrations, and available students.
            </p>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <CalendarDays className="mb-2 text-cyan-700" size={20} />
              <p className="text-2xl font-black text-slate-900">{loading ? '-' : upcomingCount}</p>
              <p className="text-xs font-semibold text-cyan-800">Upcoming</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <Users className="mb-2 text-indigo-700" size={20} />
              <p className="text-2xl font-black text-slate-900">{loading ? '-' : availableCount}</p>
              <p className="text-xs font-semibold text-indigo-800">Available</p>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/50">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Try asking</h2>
            <div className="space-y-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => askAssistant(prompt)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/95 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">AI Chatbot</h2>
                <p className="text-xs text-slate-500">
                  {loading ? 'Loading campus context...' : 'Ready with live campus context'}
                </p>
              </div>
            </div>
            {loading && <Loader2 className="animate-spin text-cyan-600" size={20} />}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/60 px-4 py-5 sm:px-6">
            <div className="space-y-4">
              {messages.map((message) => {
                const fromUser = message.from === 'user';
                return (
                  <div key={message.id} className={`flex ${fromUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] gap-3 ${fromUser ? 'flex-row-reverse' : ''}`}>
                      <div className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        fromUser ? 'bg-slate-900 text-white' : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {fromUser ? <UserRound size={16} /> : <Bot size={16} />}
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
                  <div className="flex max-w-[85%] gap-3">
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                      <Bot size={16} />
                    </div>
                    <div className="rounded-3xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="animate-spin" size={14} /> Thinking with campus data...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <input
                className="input-field flex-1"
                placeholder="Ask about events, teammates, ideas, or preparation..."
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
                className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-200 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
