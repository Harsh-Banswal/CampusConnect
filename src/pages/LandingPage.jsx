import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, MessageSquare, BarChart3, ArrowRight, Star, Shield, Play, Code, Rocket, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const features = [
  {
    icon: <Calendar size={28} className="text-blue-600 dark:text-blue-400" />,
    title: 'Event Discovery',
    desc: 'Browse and register for hackathons, workshops, seminars, and cultural events — all in one place.',
    color: 'blue',
  },
  {
    icon: <Users size={28} className="text-cyan-600 dark:text-cyan-400" />,
    title: 'Developer Matchmaking',
    desc: 'Find teammates with complementary skills for hackathons and collaborative projects.',
    color: 'cyan',
  },
  {
    icon: <MessageSquare size={28} className="text-blue-600 dark:text-blue-400" />,
    title: 'Real-time Chat',
    desc: 'Connect and communicate with peers and project collaborators instantly.',
    color: 'blue',
  },
  {
    icon: <BarChart3 size={28} className="text-cyan-600 dark:text-cyan-400" />,
    title: 'Club Analytics',
    desc: 'Club admins get insights into event performance, registrations, and engagement.',
    color: 'cyan',
  },
];

const testimonials = [
  {
    name: 'Riya Verma',
    role: '3rd Year, CSE',
    text: 'CampusConnect helped me find my hackathon team in minutes. We ended up winning 2nd place!',
  },
  {
    name: 'Aditya Rao',
    role: 'President, Coding Club',
    text: 'Managing events used to be a hassle. The dashboard and analytics make it so much easier now.',
  },
  {
    name: 'Pooja Desai',
    role: '2nd Year, IT',
    text: "I never miss an event on campus anymore. The filters help me find exactly what I'm looking for.",
  },
];

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

export default function LandingPage() {
  const [realStats, setRealStats] = useState([
    { value: '...', label: 'Active Clubs' },
    { value: '...', label: 'Events Hosted' },
    { value: '...', label: 'Students Connected' },
    { value: '...', label: 'Projects Built' },
  ]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { count: clubsCount },
          { count: eventsCount },
          { count: studentsCount },
          { count: projectsCount }
        ] = await Promise.all([
          supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('projects').select('*', { count: 'exact', head: true })
        ]);

        setRealStats([
          { value: clubsCount || 0, label: 'Active Clubs' },
          { value: eventsCount || 0, label: 'Events Hosted' },
          { value: studentsCount || 0, label: 'Students Connected' },
          { value: projectsCount || 0, label: 'Projects Built' },
        ]);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100 overflow-hidden transition-colors duration-300">
      {/* Custom Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(15px) rotate(-2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 7s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
      `}} />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28">
        {/* Soft Background Gradients */}
        <div className="absolute top-0 inset-x-0 h-[800px] bg-gradient-to-b from-blue-50/80 dark:from-blue-950/30 via-slate-50 dark:via-slate-950 to-transparent -z-10 transition-colors duration-300" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-blue-200/40 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-pulse-glow pointer-events-none transition-colors duration-300" />
        <div className="absolute top-40 left-[-100px] w-[500px] h-[500px] bg-cyan-200/40 dark:bg-cyan-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-pulse-glow pointer-events-none transition-colors duration-300" style={{ animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 font-medium text-sm mb-8 shadow-sm transition-colors duration-300 cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-500"></span>
              </span>
              The ultimate campus network
            </div>
            
            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.1] transition-colors duration-300">
              Connect. Collaborate. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400">
                Create Together.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed transition-colors duration-300">
              Discover campus events, find teammates with the right skills, and build amazing projects. Stop relying on scattered group chats.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 dark:bg-blue-500 text-white font-bold text-lg hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900/50 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 group"
              >
                Join CampusConnect
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/events"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-lg border-2 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                <Play size={20} className="text-blue-500 dark:text-blue-400" />
                Explore Events
              </Link>
            </div>
          </div>

          {/* Floating UI Elements Showcase */}
          <div className="mt-20 relative h-[380px] hidden lg:block max-w-5xl mx-auto">
            {/* Main Center Component */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-blue-100/50 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-800 p-8 z-10 transition-colors duration-300">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Upcoming Hackathon</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Hosted by Computer Science Club</p>
                </div>
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl font-bold transition-colors duration-300">
                  244 Joined
                </div>
              </div>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors duration-300">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center text-blue-500 dark:text-blue-400">
                    <Code size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Looking for</p>
                    <p className="font-bold text-slate-900 dark:text-white">Frontend Devs</p>
                  </div>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors duration-300">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center text-cyan-500 dark:text-cyan-400">
                    <Rocket size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Status</p>
                    <p className="font-bold text-slate-900 dark:text-white">Team Forming</p>
                  </div>
                </div>
              </div>
              <button className="w-full py-4 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors duration-300">
                Apply to Join
              </button>
            </div>

            {/* Floating Card Left */}
            <div className="absolute left-[5%] top-[15%] w-64 bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-800 animate-float z-20 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold">
                  AK
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">Aman Kumar</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Full-stack Dev</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg transition-colors duration-300">
                <CheckCircle2 size={14} className="text-cyan-500 dark:text-cyan-400" />
                Available for team
              </div>
            </div>

            {/* Floating Card Right */}
            <div className="absolute right-[5%] bottom-[10%] w-64 bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-800 animate-float-reverse z-20 transition-colors duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">New Message</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">"Hey! Saw your profile, want to team up for the weekend hackathon?"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 py-12 relative z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100 dark:divide-slate-800">
            {realStats.map((s, idx) => (
              <div key={idx} className="text-center px-4">
                <p className="text-4xl font-black text-slate-900 dark:text-white mb-2 transition-colors duration-300">{s.value}</p>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300">
              Everything you need, in one place
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 transition-colors duration-300">
              A comprehensive suite of tools built specifically for students and clubs to thrive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f, idx) => (
              <div key={idx} className="group bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-16 h-16 rounded-2xl bg-${f.color}-50 dark:bg-${f.color}-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 transition-colors duration-300">{f.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg transition-colors duration-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300">How it works</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto transition-colors duration-300">Get started in minutes and unlock the full potential of your campus network.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-100 dark:bg-slate-800 -z-10 transition-colors duration-300" />
            
            {[
              { step: '1', title: 'Create your profile', desc: 'Sign up, add your skills, and showcase your portfolio to stand out.' },
              { step: '2', title: 'Discover events', desc: 'Browse the campus calendar and RSVP to events that match your interests.' },
              { step: '3', title: 'Build teams', desc: 'Find collaborators, send connection requests, and start building together.' },
            ].map((item, idx) => (
              <div key={idx} className="relative flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 rounded-full shadow-lg dark:shadow-slate-900/50 flex items-center justify-center mb-6 z-10 transition-colors duration-300">
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 transition-colors duration-300">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs transition-colors duration-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white text-center mb-16 transition-colors duration-300">
            Loved by students
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 relative">
                <div className="flex mb-4 gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-8">"{t.text}"</p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 transition-colors duration-300">
                    {getInitials(t.name)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white transition-colors duration-300">{t.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 dark:bg-blue-950 rounded-[3rem] p-10 md:p-16 text-center relative overflow-hidden border border-transparent dark:border-blue-900/50 transition-colors duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 dark:from-blue-600/40 dark:to-cyan-500/40" />
            <div className="relative z-10">
              <Shield size={48} className="mx-auto mb-6 text-blue-400 dark:text-blue-300" />
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to join your campus network?</h2>
              <p className="text-lg text-slate-300 dark:text-blue-100/80 mb-10 max-w-2xl mx-auto">Don't miss out on the next big hackathon or the perfect teammate. Get started today, it's free.</p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-blue-500 px-10 py-5 font-bold text-slate-900 dark:text-white text-lg shadow-xl hover:-translate-y-1 hover:shadow-2xl dark:hover:bg-blue-400 transition-all active:scale-95"
              >
                Create Free Account <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
