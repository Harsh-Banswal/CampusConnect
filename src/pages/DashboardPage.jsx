import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Users, Calendar, PlusCircle, Eye, Trash2, ArrowRight, Power, UserPlus, X, Search, Building, Clock, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [hostedEvents, setHostedEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [dashboardTab, setDashboardTab] = useState('hosted');
  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Participants Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filterBatch, setFilterBatch] = useState('');
  const [sortConfig, setSortConfig] = useState('name_asc');

  // Club request status
  const [clubRequest, setClubRequest] = useState(null);

  const isAdmin = user?.role === 'club_admin';

  const fetchDashboardEvents = async () => {
    if (!user) return;
    
    let fetchedHosted = [];
    let fetchedRegistered = [];
    let calcStats = [];
    let calcChart = [];
    let calcCategories = [];
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toLocaleString('default', { month: 'short' }));
    }
    const chartCounts = {};
    months.forEach(m => chartCounts[m] = 0);

    const catCounts = { 'Hackathon': 0, 'Workshop': 0, 'Seminar': 0, 'Meetup': 0, 'Other': 0 };

    if (isAdmin) {
      // 1. Fetch Hosted Events
      const { data: hostedData, error: hostedError } = await supabase
        .from('events')
        .select('*, event_registrations(count)')
        .eq('organizer_id', user.id)
        .order('date', { ascending: false });
        
      if (!hostedError && hostedData) {
        fetchedHosted = hostedData;
        
        const totalEvents = hostedData.length;
        const totalRegistrations = hostedData.reduce((acc, curr) => acc + (curr.event_registrations[0]?.count || 0), 0);
        const upcoming = hostedData.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0))).length;
        const totalCapacity = hostedData.reduce((acc, curr) => acc + curr.max_seats, 0);
        const avgFill = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;

        calcStats = [
          { label: 'Total Events', value: totalEvents, change: 'All time', icon: <Calendar size={22} />, color: 'bg-accent-muted text-accent' },
          { label: 'Total Registrations', value: totalRegistrations, change: 'All time', icon: <Users size={22} />, color: 'bg-accent-mutedGreen text-accent-green' },
          { label: 'Upcoming Events', value: upcoming, change: 'Planned', icon: <Eye size={22} />, color: 'bg-orange-900/40 text-orange-400' },
          { label: 'Average Fill Rate', value: `${avgFill}%`, change: 'Of total capacity', icon: <TrendingUp size={22} />, color: 'bg-rose-900/40 text-rose-400' },
        ];

        hostedData.forEach(e => {
          const m = new Date(e.created_at).toLocaleString('default', { month: 'short' });
          if (chartCounts[m] !== undefined) chartCounts[m] += (e.event_registrations[0]?.count || 0);
          if (catCounts[e.category] !== undefined) catCounts[e.category] += 1;
        });
      }

      // 2. Fetch Participated Events for Admin too
      const { data: regs, error: regError } = await supabase
        .from('event_registrations')
        .select('event_id, registered_at')
        .eq('profile_id', user.id);
        
      if (!regError && regs && regs.length > 0) {
        const eventIds = regs.map(r => r.event_id);
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*, event_registrations(count)')
          .in('id', eventIds);
          
        if (!eventsError && eventsData) {
          fetchedRegistered = eventsData.map(e => {
             const reg = regs.find(r => r.event_id === e.id);
             return { ...e, registered_at: reg?.registered_at };
          });
        }
      }
    } else {
      // Fetch Participated Events for Student
      const { data: regs, error: regError } = await supabase
        .from('event_registrations')
        .select('event_id, registered_at')
        .eq('profile_id', user.id);
        
      if (!regError && regs && regs.length > 0) {
        const eventIds = regs.map(r => r.event_id);
        
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*, event_registrations(count)')
          .in('id', eventIds);
          
        if (!eventsError && eventsData) {
          fetchedRegistered = eventsData.map(e => {
             const reg = regs.find(r => r.event_id === e.id);
             return { ...e, registered_at: reg?.registered_at };
          });
          
          const totalAttended = fetchedRegistered.length;
          const upcoming = fetchedRegistered.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0))).length;

          const { data: profile } = await supabase.from('profiles').select('hackathons_won, projects(count)').eq('id', user.id).single();

          calcStats = [
            { label: 'Events Registered', value: totalAttended, change: 'All time', icon: <Calendar size={22} />, color: 'bg-accent-muted text-accent' },
            { label: 'Upcoming Events', value: upcoming, change: 'Planned', icon: <Users size={22} />, color: 'bg-accent-mutedGreen text-accent-green' },
            { label: 'Hackathons Won', value: profile?.hackathons_won || 0, change: 'From profile', icon: <Eye size={22} />, color: 'bg-orange-900/40 text-orange-400' },
            { label: 'Projects Built', value: profile?.projects?.[0]?.count || 0, change: 'From profile', icon: <TrendingUp size={22} />, color: 'bg-rose-900/40 text-rose-400' },
          ];

          fetchedRegistered.forEach(e => {
            const m = new Date(e.registered_at).toLocaleString('default', { month: 'short' });
            if (chartCounts[m] !== undefined) chartCounts[m] += 1;
            if (catCounts[e.category] !== undefined) catCounts[e.category] += 1;
          });
        }
      } else {
        const { data: profile } = await supabase.from('profiles').select('hackathons_won, projects(count)').eq('id', user.id).single();
        calcStats = [
          { label: 'Events Registered', value: 0, change: 'All time', icon: <Calendar size={22} />, color: 'bg-accent-muted text-accent' },
          { label: 'Upcoming Events', value: 0, change: 'Planned', icon: <Users size={22} />, color: 'bg-accent-mutedGreen text-accent-green' },
          { label: 'Hackathons Won', value: profile?.hackathons_won || 0, change: 'From profile', icon: <Eye size={22} />, color: 'bg-orange-900/40 text-orange-400' },
          { label: 'Projects Built', value: profile?.projects?.[0]?.count || 0, change: 'From profile', icon: <TrendingUp size={22} />, color: 'bg-rose-900/40 text-rose-400' },
        ];
      }
    }

    calcChart = months.map(m => ({ month: m, value: chartCounts[m] }));
    
    const catColors = ['bg-accent', 'bg-accent-green', 'bg-orange-400', 'bg-rose-400', 'bg-blue-400'];
    const totalCats = Math.max(Object.values(catCounts).reduce((a,b) => a+b, 0), 1);
    calcCategories = Object.keys(catCounts)
      .filter(k => catCounts[k] > 0)
      .map((k, i) => ({
        cat: k + 's', 
        count: catCounts[k], 
        color: catColors[i % catColors.length], 
        pct: (catCounts[k] / totalCats) * 100 
      }));

    const formatEvent = e => ({
       ...e,
       maxSeats: e.max_seats,
       registrations: e.event_registrations ? e.event_registrations[0]?.count || 0 : 0
    });

    const formattedHosted = fetchedHosted.map(formatEvent);
    const formattedRegistered = fetchedRegistered.map(formatEvent);

    setStats(calcStats);
    setChartData(calcChart);
    setCategoryData(calcCategories.length > 0 ? calcCategories : [{ cat: 'No Data', count: 0, color: 'bg-dark-border', pct: 0 }]);
    setHostedEvents(formattedHosted);
    setRegisteredEvents(formattedRegistered);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      setDashboardTab(user.role === 'club_admin' ? 'hosted' : 'registered');
    }
    fetchDashboardEvents();
    fetchClubRequest();
  }, [user]);

  const fetchClubRequest = async () => {
    if (!user) return;
    if (user.role === 'club_admin' || user.role === 'admin') return;
    const { data } = await supabase
      .from('clubs')
      .select('id, name, status, created_at')
      .eq('owner_id', user.id)
      .in('status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setClubRequest(data);
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Are you sure you want to completely delete this event?")) return;
    await supabase.from('events').delete().eq('id', id);
    fetchDashboardEvents();
  };

  const handleToggleStatus = async (event) => {
    const newStatus = event.status === 'closed' ? 'available' : 'closed';
    await supabase.from('events').update({ status: newStatus }).eq('id', event.id);
    fetchDashboardEvents();
  };

  const handleViewParticipants = async (event) => {
    setSelectedEvent(event);
    setLoadingParticipants(true);
    setSearchUser('');
    setSearchResults([]);
    
    const { data, error } = await supabase
      .from('event_registrations')
      .select('id, profile_id, registration_type, registration_data, profiles(name, avatar, department, enrollment_no, year)')
      .eq('event_id', event.id);
    
    if (error) {
      console.error('Error fetching participants:', error);
      showToast('Error loading participants', { type: 'error' });
    } else {
      setParticipants(data || []);
    }
    
    setLoadingParticipants(false);
  };

  const handleRemoveParticipant = async (registrationId) => {
    if (!window.confirm("Remove this participant?")) return;
    await supabase.from('event_registrations').delete().eq('id', registrationId);
    setParticipants(prev => prev.filter(p => p.id !== registrationId));
    fetchDashboardEvents();
  };

  const handleSearchUser = async (e) => {
    const q = e.target.value;
    setSearchUser(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const { data } = await supabase
      .from('profiles')
      .select('id, name, department, enrollment_no, batch, year')
      .ilike('name', `%${q}%`)
      .limit(5);
      
    if (data) {
      const existingIds = participants.map(p => p.profile_id);
      setSearchResults(data.filter(u => !existingIds.includes(u.id)));
    }
  };

  const handleAddParticipant = async (userObj) => {
    if (participants.length >= selectedEvent.maxSeats) {
      showToast('Event is full! Cannot add more participants.', { type: 'warning' });
      return;
    }

    const registrationType = selectedEvent.participation_mode === 'team' ? 'team' : 'solo';
    const registrationData = {
      registration_type: registrationType,
      team_name: registrationType === 'team' ? `${userObj.name || 'Team'} team` : null,
      captain: {
        name: userObj.name || 'Unknown User',
        contact: '',
      },
      members: [{
        name: userObj.name || 'Unknown User',
        enrollment_no: userObj.enrollment_no || '',
        batch: userObj.batch || '',
        year: userObj.year || '',
      }],
    };
    
    const { data, error } = await supabase
      .from('event_registrations')
      .insert([{ event_id: selectedEvent.id, profile_id: userObj.id, registration_type: registrationType, registration_data: registrationData }])
      .select('id, profile_id, registration_type, registration_data, profiles(name, avatar, department, enrollment_no, batch, year)')
      .single();
      
    if (error) {
       showToast('Error adding participant.', { type: 'error' });
       return;
    }
    
    setParticipants(prev => [...prev, data]);
    setSearchUser('');
    setSearchResults([]);
    fetchDashboardEvents();
  };

  const maxVal = Math.max(...chartData.map((d) => d.value), 1); 
  const visibleParticipants = participants
    .filter(p => !filterBatch || p.profiles?.batch === filterBatch || (!p.profiles?.batch && filterBatch === ''))
    .sort((a, b) => {
      if (sortConfig === 'name_asc') return (a.profiles?.name || '').localeCompare(b.profiles?.name || '');
      if (sortConfig === 'name_desc') return (b.profiles?.name || '').localeCompare(a.profiles?.name || '');
      if (sortConfig === 'enrollment_asc') return (a.profiles?.enrollment_no || '').localeCompare(b.profiles?.enrollment_no || '');
      if (sortConfig === 'year_asc') return (a.profiles?.year || '').localeCompare(b.profiles?.year || '');
      return 0;
    });

  const teamRegistrations = visibleParticipants.filter((registration) => (registration.registration_type || registration.registration_data?.registration_type || 'solo') === 'team');
  const soloRegistrations = visibleParticipants.filter((registration) => (registration.registration_type || registration.registration_data?.registration_type || 'solo') !== 'team');

  const currentEvents = isAdmin && dashboardTab === 'hosted' ? hostedEvents : registeredEvents;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative bg-dark min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            {isAdmin ? 'Club Dashboard' : 'Student Dashboard'}
          </h1>
          <p className="text-gray-400 mt-1">
            {isAdmin ? 'Manage your events and track performance.' : 'Track your active event registrations and stats.'}
          </p>
        </div>
        {isAdmin ? (
          <Link to="/create-event" className="btn-primary flex items-center gap-2">
            <PlusCircle size={18} /> Create Event
          </Link>
        ) : (
          <Link to="/events" className="btn-primary flex items-center gap-2">
            Participate in event <ArrowRight size={18} />
          </Link>
        )}
      </div>

      {clubRequest && (
        <div className={`mb-6 flex items-start gap-4 rounded-xl border px-5 py-4 ${
          clubRequest.status === 'pending'
            ? 'bg-amber-900/20 border-amber-500/30'
            : 'bg-red-900/20 border-red-500/30'
        }`}>
          <div className={`mt-0.5 flex-shrink-0 ${
            clubRequest.status === 'pending' ? 'text-amber-400' : 'text-red-400'
          }`}>
            {clubRequest.status === 'pending' ? <Clock size={22} /> : <XCircle size={22} />}
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${
              clubRequest.status === 'pending' ? 'text-amber-200' : 'text-red-200'
            }`}>
              {clubRequest.status === 'pending' ? '⏳ Club Request Pending Review' : '❌ Club Request Rejected'}
            </p>
            <p className={`text-sm mt-0.5 ${
              clubRequest.status === 'pending' ? 'text-amber-400/80' : 'text-red-400/80'
            }`}>
              {clubRequest.status === 'pending'
                ? <span>Your request to create <strong>"{clubRequest.name}"</strong> is awaiting system admin approval. You can use the platform as a student in the meantime.</span>
                : <span>Your request to create <strong>"{clubRequest.name}"</strong> was rejected. Please contact the admin for more details.</span>
              }
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
            clubRequest.status === 'pending'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-red-500/20 text-red-300'
          }`}>
            {clubRequest.status.toUpperCase()}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5 border-dark-border">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-extrabold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400 mt-0.5 uppercase tracking-wide font-bold">{stat.label}</p>
            <p className="text-xs text-accent-green font-medium mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white text-xl">
               {isAdmin ? 'Event Registrations' : 'Events Attended'}
            </h3>
            <span className="badge bg-dark-surface text-gray-400 border border-dark-border">Last 6 Months</span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {chartData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{d.value}</span>
                <div
                  className="w-full bg-accent rounded-t-sm hover:bg-accent-purple transition-colors cursor-pointer group"
                  style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: '8px' }}
                />
                <span className="text-xs text-gray-500">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-white text-xl mb-6">Events by Category</h3>
          <div className="space-y-4">
            {categoryData.map((item) => (
              <div key={item.cat}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-300 font-medium">{item.cat}</span>
                  <span className="font-semibold text-white">{Math.round(item.pct)}%</span>
                </div>
                <div className="w-full bg-dark-surface rounded-full h-1.5 border border-dark-border">
                  <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border-dark-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 border-b border-dark-border gap-4">
          {isAdmin ? (
            <div className="flex gap-6">
              <button
                onClick={() => setDashboardTab('hosted')}
                className={`py-4 font-bold text-lg transition-colors border-b-2 ${
                  dashboardTab === 'hosted'
                    ? 'text-accent border-b-accent'
                    : 'text-gray-400 hover:text-gray-200 border-b-transparent'
                }`}
              >
                Hosted Events
              </button>
              <button
                onClick={() => setDashboardTab('registered')}
                className={`py-4 font-bold text-lg transition-colors border-b-2 ${
                  dashboardTab === 'registered'
                    ? 'text-accent border-b-accent'
                    : 'text-gray-400 hover:text-gray-200 border-b-transparent'
                }`}
              >
                Participated Events
              </button>
            </div>
          ) : (
            <h3 className="font-bold text-white text-xl py-4">My Registered Events</h3>
          )}

          <div className="py-2.5">
            {isAdmin && dashboardTab === 'hosted' ? (
              <Link to="/create-event" className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1">
                New Event
              </Link>
            ) : (
              <Link to="/events" className="btn-primary bg-accent-green hover:bg-accent-greenHover text-black text-sm px-4 py-1.5 flex items-center gap-1">
                Register New
              </Link>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-dark-surface text-gray-400 text-xs font-bold uppercase border-b border-dark-border">
              <tr>
                <th className="px-6 py-4">Event Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-gray-300">
              {loading ? (
                <tr>
                   <td colSpan="5" className="text-center py-6 text-gray-500">Loading events...</td>
                </tr>
              ) : currentEvents.length === 0 ? (
                <tr>
                   <td colSpan="5" className="text-center py-6 text-gray-500">
                     {isAdmin && dashboardTab === 'hosted' ? "You haven't hosted any events yet." : "You haven't registered for any events yet."}
                   </td>
                </tr>
              ) : currentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-dark-surface transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-dark-surface border border-dark-border flex items-center justify-center text-accent text-xs font-bold">
                        {event.title.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="font-bold text-white">{event.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge border ${
                      event.category === 'Workshop' ? 'bg-accent-muted text-accent border-accent/30' : 
                      event.category === 'Hackathon' ? 'bg-red-900/30 text-red-400 border-red-500/30' : 
                      'bg-accent-mutedGreen text-accent-green border-accent-green/30'
                    }`}>
                      {event.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    {isAdmin && dashboardTab === 'hosted' ? (
                      <span className={`badge border ${event.status === 'closed' ? 'bg-orange-900/30 text-orange-400 border-orange-500/30' : 'bg-accent-mutedGreen text-accent-green border-accent-green/30'}`}>
                        {event.status === 'closed' ? 'Closed' : 'Active'}
                      </span>
                    ) : (
                      <span className={`badge border ${event.status === 'closed' ? 'bg-orange-900/30 text-orange-400 border-orange-500/30' : 'bg-accent-mutedGreen text-accent-green border-accent-green/30'}`}>
                        {event.status === 'closed' ? 'Waitlisted' : 'Registered'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isAdmin && dashboardTab === 'hosted' ? (
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleViewParticipants(event)} className="text-gray-400 hover:text-white transition-colors" title="Manage Participants"><Users size={16}/></button>
                        <button onClick={() => handleToggleStatus(event)} className="text-gray-400 hover:text-white transition-colors" title="Toggle Status"><Power size={16}/></button>
                        <button onClick={() => handleDeleteEvent(event.id)} className="text-gray-400 hover:text-red-400 transition-colors" title="Delete Event"><Trash2 size={16}/></button>
                      </div>
                    ) : (
                      <Link to={`/events/${event.id}`} className="text-white hover:text-accent font-semibold transition-colors">
                        Details
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Browse Clubs / Team Builder Banner */}
      <div className="mt-8 rounded-[1.5rem] p-8 flex items-center justify-between gap-6" style={{ background: 'linear-gradient(to right, #1a1a1a, #111111)', border: '1px solid #333' }}>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center text-accent ring-4 ring-dark-surface">
            <Building size={28} />
          </div>
          <div>
            <span className="badge bg-accent-muted text-accent border border-accent/30 mb-2">New Feature</span>
            <h3 className="font-bold text-white text-2xl mb-1">Team Builder AI</h3>
            <p className="text-sm text-gray-400 max-w-md">Our new AI matching algorithm helps you find the perfect teammates based on your skills and interests.</p>
          </div>
        </div>
        <Link
          to="/ai-teams"
          className="btn-primary bg-accent-green text-black hover:bg-accent-greenHover px-6 py-3"
        >
          Try Team Builder
        </Link>
      </div>

      {/* Participants Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-card rounded-2xl border border-dark-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between bg-dark-surface">
              <div>
                <h3 className="font-bold text-white text-lg">Manage Participants</h3>
                <p className="text-sm text-gray-400">{selectedEvent.title} • {participants.length} / {selectedEvent.maxSeats} Registered</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Add Participant</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search students by name..." 
                    className="input-field pl-9"
                    value={searchUser}
                    onChange={handleSearchUser}
                    disabled={participants.length >= selectedEvent.maxSeats}
                  />
                  {participants.length >= selectedEvent.maxSeats && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-rose-400">Event Full</span>
                  )}
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-dark-border rounded-xl shadow-sm overflow-hidden divide-y divide-dark-border bg-dark-surface">
                    {searchResults.map(u => (
                      <div key={u.id} className="p-3 flex items-center justify-between hover:bg-dark-card transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-white">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.department || 'Student'}</p>
                        </div>
                        <button onClick={() => handleAddParticipant(u)} className="btn-primary py-1.5 px-4 text-xs">
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-dark-border pb-3">
                  <label className="block text-sm font-semibold text-gray-300">Registered Students</label>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="text-xs border border-dark-border rounded-md px-2 py-1 bg-dark-surface text-gray-300 outline-none focus:border-accent"
                    >
                      <option value="">All Years</option>
                      {Array.from(new Set(participants.map(p => p.profiles?.year).filter(Boolean))).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <select 
                      value={sortConfig} 
                      onChange={(e) => setSortConfig(e.target.value)}
                      className="text-xs border border-dark-border rounded-md px-2 py-1 bg-dark-surface text-gray-300 outline-none focus:border-accent"
                    >
                      <option value="name_asc">Name (A-Z)</option>
                      <option value="name_desc">Name (Z-A)</option>
                      <option value="enrollment_asc">Enrollment No.</option>
                      <option value="year_asc">Year</option>
                    </select>
                  </div>
                </div>

                {loadingParticipants ? (
                  <p className="text-center text-gray-500 py-4 text-sm">Loading participants...</p>
                ) : visibleParticipants.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm bg-dark-surface border border-dark-border rounded-xl">No participants registered yet.</p>
                ) : (
                  <div className="space-y-6">
                    {teamRegistrations.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Team Registrations</h4>
                        <div className="space-y-3">
                          {teamRegistrations.map((registration, index) => {
                            const details = registration.registration_data || {};
                            const members = details.members || [];
                            const captainName = members[0]?.name || registration.profiles?.name || 'Unknown';
                            return (
                              <div key={registration.id} className="rounded-xl border border-dark-border bg-dark-surface p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-bold text-white">{details.team_name || `Team ${index + 1}`}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Captain: {captainName}</p>
                                  </div>
                                  <button onClick={() => handleRemoveParticipant(registration.id)} className="p-2 text-gray-500 hover:text-rose-400 transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {members.map((member, memberIndex) => (
                                    <span key={memberIndex} className="badge border border-dark-border bg-dark-card text-gray-300">
                                      {member.name || 'Member'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {soloRegistrations.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Solo Registrations</h4>
                        <div className="space-y-2">
                          {soloRegistrations.map((registration) => (
                            <div key={registration.id} className="flex items-center justify-between rounded-xl border border-dark-border bg-dark-surface p-3 transition-colors hover:border-accent/50">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-accent-muted text-accent flex items-center justify-center font-bold text-sm">
                                  {registration.profiles?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">
                                    {registration.profiles?.name || 'Unknown User'}
                                    {registration.profiles?.enrollment_no && <span className="text-gray-500 font-normal ml-2">({registration.profiles.enrollment_no})</span>}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-gray-400 font-medium">{registration.profiles?.department || 'Student'}</p>
                                    {registration.profiles?.year && <span className="text-[10px] bg-dark-card text-gray-500 px-1.5 py-0.5 rounded border border-dark-border">{registration.profiles.year}</span>}
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => handleRemoveParticipant(registration.id)} className="p-2 text-gray-500 hover:text-rose-400 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
