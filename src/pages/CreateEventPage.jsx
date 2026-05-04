import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Image, ArrowLeft, Plus, X, Upload, Loader } from 'lucide-react';
import { allowedClubs, allowedVenues } from '../data/events';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { uploadFile, deleteFile } from '../lib/uploadService';
import { useEffect } from 'react';

const categories = ['Hackathon', 'Workshop', 'Seminar', 'Meetup'];

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    title: '',
    club: '',
    category: '',
    date: '',
    time: '',
    venue: '',
    maxSeats: '',
    participation_mode: 'solo',
    maxTeamMembers: '1',
    description: '',
    tags: [],
    image: null,
  });
  const [tagInput, setTagInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [userClubs, setUserClubs] = useState([]);
  const [fetchingClubs, setFetchingClubs] = useState(true);

  useEffect(() => {
    async function fetchUserClubs() {
      if (!user) return;
      
      try {
        const { data, error: fetchError } = await supabase
          .from('clubs')
          .select('name')
          .eq('owner_id', user.id);
          
        if (fetchError) throw fetchError;
        
        if (data && data.length > 0) {
          const clubNames = data.map(c => c.name);
          setUserClubs(clubNames);
          // Auto-select the first club they own
          setForm(prev => ({ ...prev, club: clubNames[0] }));
        }
      } catch (err) {
        console.error('Error fetching user clubs:', err);
      } finally {
        setFetchingClubs(false);
      }
    }
    
    fetchUserClubs();
  }, [user]);

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (t) => setForm({ ...form, tags: form.tags.filter((x) => x !== t) });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const { url, error } = await uploadFile(file, 'event-banners', `${user.id}-${Date.now()}`);

    if (error) {
      showToast(`Upload failed: ${error}`, { type: 'error' });
    } else {
      setForm({ ...form, image: url });
      showToast('Banner uploaded!', { type: 'success' });
    }

    setUploadingImage(false);
    e.target.value = ''; // Reset input
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Must be logged in', { type: 'warning' });
      return;
    }
    
    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase.from('events').insert([{
      title: form.title,
      club: form.club,
      category: form.category,
      date: form.date,
      time: form.time,
      venue: form.venue,
      max_seats: parseInt(form.maxSeats),
      participation_mode: form.participation_mode,
      max_team_members: form.participation_mode === 'team' ? parseInt(form.maxTeamMembers || '1', 10) : 1,
      description: form.description,
      tags: form.tags,
      image: form.image,
      organizer_id: user.id
    }]);

    setSubmitting(false);

    if (insertError) {
       setError(insertError.message);
    } else {
       setSubmitted(true);
       setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Created!</h2>
          <p className="text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create New Event</h1>
        <p className="text-gray-500 mt-1">Fill in the details to publish your event on CampusConnect.</p>
        {error && <p className="text-red-500 text-sm mt-3 p-3 bg-red-50 rounded-lg border border-red-100">{error}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">Event Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Club Name *</label>
            {fetchingClubs ? (
              <div className="input-field animate-pulse bg-gray-50 flex items-center text-gray-400">Loading your club...</div>
            ) : userClubs.length > 0 ? (
              <select
                className="input-field bg-gray-50 border-gray-200"
                value={form.club}
                onChange={(e) => setForm({ ...form, club: e.target.value })}
                required
                disabled={userClubs.length === 1} // Disable if they only own 1 club
              >
                {userClubs.map((club) => <option key={club} value={club}>{club}</option>)}
              </select>
            ) : (
              <select
                className="input-field"
                value={form.club}
                onChange={(e) => setForm({ ...form, club: e.target.value })}
                required
              >
                <option value="">Select club</option>
                {allowedClubs.map((club) => <option key={club}>{club}</option>)}
              </select>
            )}
            {userClubs.length === 1 && (
              <p className="mt-1 text-xs text-blue-600">Auto-filled based on your club admin profile.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Title *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. HackFest 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
              <select
                className="input-field"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Seats *</label>
              <div className="relative">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  className="input-field pl-9"
                  placeholder="e.g. 200"
                  value={form.maxSeats}
                  onChange={(e) => setForm({ ...form, maxSeats: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Type *</label>
              <select
                className="input-field"
                value={form.participation_mode}
                onChange={(e) => setForm({ ...form, participation_mode: e.target.value, maxTeamMembers: e.target.value === 'solo' ? '1' : (form.maxTeamMembers || '2') })}
                required
              >
                <option value="solo">Solo Event</option>
                <option value="team">Team Event</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {form.participation_mode === 'team' ? 'Max Team Members *' : 'Individual Participants *'}
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={form.maxTeamMembers}
                onChange={(e) => setForm({ ...form, maxTeamMembers: e.target.value })}
                disabled={form.participation_mode === 'solo'}
                required
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 -mt-2">
            Team events will ask registrants for team name, captain contact, and member details during registration.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  className="input-field pl-9"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Time *</label>
              <input
                type="time"
                className="input-field"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Venue *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                className="input-field pl-9"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                required
              >
                <option value="">Select venue</option>
                {allowedVenues.map((venue) => <option key={venue}>{venue}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea
              className="input-field min-h-[120px] resize-none"
              placeholder="Tell students what this event is about..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">Tags & Media</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag) => (
                <span key={tag} className="badge bg-blue-100 text-blue-700 flex items-center gap-1 px-3 py-1 text-sm">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Add a tag (e.g. AI, Coding)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
              <button type="button" onClick={addTag} className="btn-secondary flex items-center gap-1">
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Banner</label>
            {form.image ? (
              <div className="relative">
                <img src={form.image} alt="Event banner preview" className="w-full h-48 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => {
                    if (form.image) {
                      deleteFile(form.image, 'event-banners');
                    }
                    setForm({ ...form, image: null });
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                {uploadingImage ? (
                  <>
                    <Loader size={28} className="text-blue-500 mb-2 animate-spin" />
                    <p className="text-sm text-gray-500">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload banner image</p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
                  </>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Publishing...' : 'Publish Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
