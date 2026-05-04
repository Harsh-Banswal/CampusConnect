import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Users, Calendar, PlusCircle, Eye, Trash2, ArrowRight, Power, UserPlus, X, Search, Building, Clock, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [dashboardEvents, setDashboardEvents] = useState([]);
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

  // Club request status (for users who signed up as club_admin but are pending/rejected)
  const [clubRequest, setClubRequest] = useState(null);

  const isAdmin = user?.role === 'club_admin';

  const fetchDashboardEvents = async () => {
    if (!user) return;
    
    let fetchedEvents = [];
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
      const { data, error } = await supabase
        .from('events')
        .select('*, event_registrations(count)')
        .eq('organizer_id', user.id)
        .order('date', { ascending: false });
        
      if (!error && data) {
        fetchedEvents = data;
        
        const totalEvents = data.length;
        const totalRegistrations = data.reduce((acc, curr) => acc + (curr.event_registrations[0]?.count || 0), 0);
        const upcoming = data.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0))).length;
        const totalCapacity = data.reduce((acc, curr) => acc + curr.max_seats, 0);
        const avgFill = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;

        calcStats = [
          { label: 'Total Events', value: totalEvents, change: 'All time', icon: <Calendar size={22} />, color: 'bg-blue-100 text-blue-700' },
          { label: 'Total Registrations', value: totalRegistrations, change: 'All time', icon: <Users size={22} />, color: 'bg-purple-100 text-purple-700' },
          { label: 'Upcoming Events', value: upcoming, change: 'Planned', icon: <Eye size={22} />, color: 'bg-green-100 text-green-700' },
          { label: 'Average Fill Rate', value: `${avgFill}%`, change: 'Of total capacity', icon: <TrendingUp size={22} />, color: 'bg-orange-100 text-orange-700' },
        ];

        data.forEach(e => {
          const m = new Date(e.created_at).toLocaleString('default', { month: 'short' });
          if (chartCounts[m] !== undefined) chartCounts[m] += (e.event_registrations[0]?.count || 0);
          if (catCounts[e.category] !== undefined) catCounts[e.category] += 1;
        });
      }
    } else {
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
          // Map events to registration dates
          const eventsWithRegDate = eventsData.map(e => {
             const reg = regs.find(r => r.event_id === e.id);
             return { ...e, registered_at: reg?.registered_at };
          });
          
          fetchedEvents = eventsWithRegDate;
          
          const totalAttended = fetchedEvents.length;
          const upcoming = fetchedEvents.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0))).length;

          const { data: profile } = await supabase.from('profiles').select('hackathons_won, projects(count)').eq('id', user.id).single();

          calcStats = [
            { label: 'Events Registered', value: totalAttended, change: 'All time', icon: <Calendar size={22} />, color: 'bg-blue-100 text-blue-700' },
            { label: 'Upcoming Events', value: upcoming, change: 'Planned', icon: <Users size={22} />, color: 'bg-purple-100 text-purple-700' },
            { label: 'Hackathons Won', value: profile?.hackathons_won || 0, change: 'From profile', icon: <Eye size={22} />, color: 'bg-green-100 text-green-700' },
            { label: 'Projects Built', value: profile?.projects?.[0]?.count || 0, change: 'From profile', icon: <TrendingUp size={22} />, color: 'bg-orange-100 text-orange-700' },
          ];

          fetchedEvents.forEach(e => {
            const m = new Date(e.registered_at).toLocaleString('default', { month: 'short' });
            if (chartCounts[m] !== undefined) chartCounts[m] += 1;
            if (catCounts[e.category] !== undefined) catCounts[e.category] += 1;
          });
        }
      } else {
        // No registrations or error
        const { data: profile } = await supabase.from('profiles').select('hackathons_won, projects(count)').eq('id', user.id).single();
        calcStats = [
          { label: 'Events Registered', value: 0, change: 'All time', icon: <Calendar size={22} />, color: 'bg-blue-100 text-blue-700' },
          { label: 'Upcoming Events', value: 0, change: 'Planned', icon: <Users size={22} />, color: 'bg-purple-100 text-purple-700' },
          { label: 'Hackathons Won', value: profile?.hackathons_won || 0, change: 'From profile', icon: <Eye size={22} />, color: 'bg-green-100 text-green-700' },
          { label: 'Projects Built', value: profile?.projects?.[0]?.count || 0, change: 'From profile', icon: <TrendingUp size={22} />, color: 'bg-orange-100 text-orange-700' },
        ];
      }
    }

    calcChart = months.map(m => ({ month: m, value: chartCounts[m] }));
    
    const catColors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-pink-500', 'bg-orange-500'];
    const totalCats = Math.max(Object.values(catCounts).reduce((a,b) => a+b, 0), 1);
    calcCategories = Object.keys(catCounts)
      .filter(k => catCounts[k] > 0)
      .map((k, i) => ({
        cat: k + 's', 
        count: catCounts[k], 
        color: catColors[i % catColors.length], 
        pct: (catCounts[k] / totalCats) * 100 
      }));

    const formatted = fetchedEvents.map(e => ({
       ...e,
       maxSeats: e.max_seats,
       registrations: e.event_registrations ? e.event_registrations[0]?.count || 0 : 0
    }));

    setStats(calcStats);
    setChartData(calcChart);
    setCategoryData(calcCategories.length > 0 ? calcCategories : [{ cat: 'No Data', count: 0, color: 'bg-gray-300', pct: 0 }]);
    setDashboardEvents(formatted);
    setLoading(false);
  };

  useEffect(() => {
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

  // --- Participant Management Logic ---
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
      console.log('Fetched participants:', data);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {isAdmin ? 'Club Dashboard' : 'Student Dashboard'}
          </h1>
          <p className="text-gray-500 mt-1">
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

      {/* Club Request Status Banner */}
      {clubRequest && (
        <div className={`mb-6 flex items-start gap-4 rounded-xl border px-5 py-4 ${
          clubRequest.status === 'pending'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`mt-0.5 flex-shrink-0 ${
            clubRequest.status === 'pending' ? 'text-amber-500' : 'text-red-500'
          }`}>
            {clubRequest.status === 'pending' ? <Clock size={22} /> : <XCircle size={22} />}
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${
              clubRequest.status === 'pending' ? 'text-amber-800' : 'text-red-800'
            }`}>
              {clubRequest.status === 'pending' ? '⏳ Club Request Pending Review' : '❌ Club Request Rejected'}
            </p>
            <p className={`text-sm mt-0.5 ${
              clubRequest.status === 'pending' ? 'text-amber-700' : 'text-red-700'
            }`}>
              {clubRequest.status === 'pending'
                ? <span>Your request to create <strong>"{clubRequest.name}"</strong> is awaiting system admin approval. You can use the platform as a student in the meantime.</span>
                : <span>Your request to create <strong>"{clubRequest.name}"</strong> was rejected. Please contact the admin for more details.</span>
              }
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
            clubRequest.status === 'pending'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {clubRequest.status.toUpperCase()}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            <p className="text-xs text-green-600 font-medium mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-blue-600" />
            <h3 className="font-bold text-gray-900">
               {isAdmin ? 'Event Registrations (Last 6 Months)' : 'Events Attended (Last 6 Months)'}
            </h3>
          </div>
          <div className="flex items-end gap-3 h-40">
            {chartData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-700">{d.value}</span>
                <div
                  className="w-full bg-blue-600 rounded-t-md hover:bg-blue-700 transition-colors cursor-pointer"
                  style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: '8px' }}
                />
                <span className="text-xs text-gray-400">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-5">Events by Category</h3>
          <div className="space-y-3">
            {categoryData.map((item) => (
              <div key={item.cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.cat}</span>
                  <span className="font-semibold text-gray-900">{item.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{isAdmin ? 'My Hosted Events' : 'My Registered Events'}</h3>
          {isAdmin && (
            <Link to="/create-event" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              <PlusCircle size={14} /> New
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Event</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Registrations</th>
                <th className="px-6 py-3 text-left">Status</th>
                {isAdmin && <th className="px-6 py-3 text-left">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                   <td colSpan="5" className="text-center py-6 text-gray-400">Loading events...</td>
                </tr>
              ) : dashboardEvents.length === 0 ? (
                <tr>
                   <td colSpan="5" className="text-center py-6 text-gray-400">
                     {isAdmin ? "You haven't hosted any events yet." : "You haven't registered for any events yet."}
                   </td>
                </tr>
              ) : dashboardEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{event.title}</div>
                    <div className="text-xs text-gray-400">{event.category}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{event.registrations}</span>
                      <span className="text-gray-400">/ {event.maxSeats}</span>
                    </div>
                    <div className="w-24 bg-gray-100 rounded-full h-1 mt-1">
                      <div
                        className="h-1 rounded-full bg-blue-500"
                        style={{ width: `${Math.min((event.registrations / event.maxSeats) * 100, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${event.status === 'closed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {event.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewParticipants(event)}
                          title="Manage Participants"
                          className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                        >
                          <Users size={15} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(event)}
                          title={event.status === 'closed' ? 'Re-open Event' : 'Close Event'}
                          className={`${event.status === 'closed' ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-orange-500'} p-1 transition-colors`}
                        >
                          <Power size={15} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          title="Delete Event"
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Browse Clubs */}
      <div className="mt-6 card p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Building size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Campus Clubs</h3>
            <p className="text-sm text-gray-500">Browse all active clubs on your campus.</p>
          </div>
        </div>
        <Link
          to="/clubs"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          Browse Clubs <ArrowRight size={15} />
        </Link>
      </div>

      {/* Participants Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Manage Participants</h3>
                <p className="text-sm text-gray-500">{selectedEvent.title} • {participants.length} / {selectedEvent.maxSeats} Registered</p>
                <p className="text-xs text-gray-400 mt-1 capitalize">
                  {selectedEvent.participation_mode === 'team'
                    ? `Team event • max ${selectedEvent.max_team_members || 1} members per registration`
                    : 'Solo event'}
                </p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Add Participant</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search students by name..." 
                    className="input-field pl-9"
                    value={searchUser}
                    onChange={handleSearchUser}
                    disabled={participants.length >= selectedEvent.maxSeats}
                  />
                  {participants.length >= selectedEvent.maxSeats && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-red-500">Event Full</span>
                  )}
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-100 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                    {searchResults.map(u => (
                      <div key={u.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.department || 'Student'}</p>
                        </div>
                        <button onClick={() => handleAddParticipant(u)} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                          <UserPlus size={14} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                  <label className="block text-sm font-semibold text-gray-700">Registered Students</label>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 outline-none"
                    >
                      <option value="">All Years</option>
                      {Array.from(new Set(participants.map(p => p.profiles?.year).filter(Boolean))).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <select 
                      value={sortConfig} 
                      onChange={(e) => setSortConfig(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 outline-none"
                    >
                      <option value="name_asc">Name (A-Z)</option>
                      <option value="name_desc">Name (Z-A)</option>
                      <option value="enrollment_asc">Enrollment No.</option>
                      <option value="year_asc">Year</option>
                    </select>
                  </div>
                </div>

                {loadingParticipants ? (
                  <p className="text-center text-gray-400 py-4 text-sm">Loading participants...</p>
                ) : visibleParticipants.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm bg-gray-50 rounded-xl">No participants registered yet.</p>
                ) : (
                  <div className="space-y-5">
                    {teamRegistrations.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Team Registrations</h4>
                        <div className="space-y-2">
                          {teamRegistrations.map((registration, index) => {
                            const details = registration.registration_data || {};
                            const members = details.members || [];
                            const captainName = members[0]?.name || registration.profiles?.name || 'Unknown';
                            const captainContact = details.captain_contact || members[0]?.enrollment_no || '';
                            return (
                              <div key={registration.id} className="rounded-xl border border-gray-100 bg-white p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{details.team_name || `Team ${index + 1}`}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Captain: {captainName}
                                      {captainContact ? ` • ${captainContact}` : ''}
                                    </p>
                                  </div>
                                  <button 
                                    onClick={() => handleRemoveParticipant(registration.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove Registration"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {members.map((member, memberIndex) => (
                                    <span key={`${registration.id}-${memberIndex}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                                      {member.name || 'Member'}
                                      {member.enrollment_no ? ` • ${member.enrollment_no}` : ''}
                                      {member.year ? ` • ${member.year}` : ''}
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
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Solo Registrations</h4>
                        <div className="space-y-2">
                          {soloRegistrations.map((registration) => (
                            <div key={registration.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 transition-colors hover:border-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                  {registration.profiles?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {registration.profiles?.name || 'Unknown User'}
                                    {registration.profiles?.enrollment_no && <span className="text-gray-400 font-normal ml-2">({registration.profiles.enrollment_no})</span>}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-gray-500 font-medium">{registration.profiles?.department || 'Student'}</p>
                                    {registration.profiles?.year && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{registration.profiles.year}</span>}
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRemoveParticipant(registration.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove Participant"
                              >
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
