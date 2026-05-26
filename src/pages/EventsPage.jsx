import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Bookmark } from 'lucide-react';
import EventCard from '../components/EventCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const categories = ["All", "Hackathon", "Workshop", "Seminar", "Meetup"];
const sortOptions = ['Latest', 'Oldest', 'Most Popular', 'Seats Available'];

export default function EventsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('all'); // 'all' or 'saved'
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Latest');
  
  const [events, setEvents] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_registrations(count)');

      if (error) {
        console.error('Error fetching events:', error);
        setLoading(false);
        return;
      }

      // Format to match expected frontend prop structure
      const formatted = data
        .map(e => ({
          ...e,
          maxSeats: e.max_seats,
          registrations: e.event_registrations[0]?.count || 0
        }));
      setEvents(formatted);
      setLoading(false);
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    async function fetchSavedEvents() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('bookmarks')
        .select('events(*, event_registrations(count))')
        .eq('profile_id', user.id);

      if (error) {
        console.error('Error fetching saved events:', error);
        return;
      }

      // Format to match expected frontend prop structure
      const formatted = data
        .map(b => b.events)
        .filter(Boolean)
        .map(e => ({
          ...e,
          maxSeats: e.max_seats,
          registrations: e.event_registrations[0]?.count || 0
        }));
      
      setSavedEvents(formatted);
    }
    fetchSavedEvents();
  }, [user]);

  const displayEvents = tab === 'saved' ? savedEvents : events;
  
  const filtered = displayEvents
    .filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.club && e.club.toLowerCase().includes(search.toLowerCase()));
      const matchCat = category === 'All' || e.category === category;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sort === 'Latest') return new Date(b.date) - new Date(a.date);
      if (sort === 'Oldest') return new Date(a.date) - new Date(b.date);
      if (sort === 'Most Popular') return b.registrations - a.registrations;
      if (sort === 'Seats Available') return (a.maxSeats - a.registrations) - (b.maxSeats - b.registrations);
      return 0;
    });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingFiltered = filtered.filter(e => new Date(e.date) >= today);
  const pastFiltered = filtered.filter(e => new Date(e.date) < today);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-1">Campus Events</h1>
        <p className="text-gray-500">Discover and register for upcoming events on your campus.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-dark-border">
        <button
          onClick={() => setTab('all')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            tab === 'all'
              ? 'text-accent border-b-accent'
              : 'text-gray-500 hover:text-gray-300 border-b-transparent'
          }`}
        >
          All Events
        </button>
        {user && (
          <button
            onClick={() => setTab('saved')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-colors border-b-2 ${
              tab === 'saved'
                ? 'text-accent border-b-accent'
                : 'text-gray-500 hover:text-gray-300 border-b-transparent'
            }`}
          >
            <Bookmark size={16} /> Saved Events
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search events or clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-gray-500" />
          <select
            className="input-field w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sortOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-accent text-gray-900 border border-accent'
                : 'bg-dark-surface text-gray-300 border border-dark-border hover:border-accent hover:text-accent'
            }`}
          >
            {cat}
          </button>
        ))}
        {(search || category !== 'All') && (
          <button
            onClick={() => { setSearch(''); setCategory('All'); }}
            className="px-4 py-1.5 rounded-full text-sm text-red-500 border border-red-500/30 hover:bg-red-500/10 text-red-400 flex items-center gap-1"
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {!loading && (
        <p className="text-sm text-gray-500 mb-5">
          Showing <strong>{filtered.length}</strong> event{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-20 px-4">
           <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (upcomingFiltered.length > 0 || pastFiltered.length > 0) ? (
        <>
          {upcomingFiltered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingFiltered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-dark-card border border-dark-border rounded-[1.5rem]">
              <p className="text-gray-400 text-sm">No upcoming events matching your criteria.</p>
            </div>
          )}

          {pastFiltered.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold text-white whitespace-nowrap">Previous Ended Events</h2>
                <div className="h-[1px] w-full bg-dark-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastFiltered.map((event) => (
                  <EventCard key={event.id} event={event} isPast={true} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-300">
            {tab === 'saved' ? 'No saved events yet' : 'No events found'}
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {tab === 'saved' 
              ? 'Bookmark events to save them for later!'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      )}
    </div>
  );
}
