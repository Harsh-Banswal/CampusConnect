import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Share2, Bookmark, ArrowLeft, CheckCircle2, Copy, MessageCircle, Twitter, Linkedin, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function buildEmptyMember(defaults = {}) {
  return {
    name: defaults.name || '',
    enrollment_no: defaults.enrollment_no || '',
    year: defaults.year || '',
    batch: defaults.batch || '',
  };
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [memberCount, setMemberCount] = useState(1);
  const [registrationForm, setRegistrationForm] = useState({
    teamName: '',
    captainContact: '',
    members: [],
  });

  const isTeamEvent = event?.participation_mode === 'team';
  const teamMemberLimit = Math.max(Number(event?.max_team_members) || 1, 1);

  useEffect(() => {
    async function fetchEvent() {
      // 1. Fetch Event Document
      const { data, error } = await supabase
        .from('events')
        .select('*, organizer:profiles(name), event_registrations(count)')
        .eq('id', id)
        .single();
        
      if (data && !error) {
        setEvent({
           ...data,
           maxSeats: data.max_seats,
            participation_mode: data.participation_mode || 'solo',
            max_team_members: data.max_team_members || 1,
           registrations: data.event_registrations[0]?.count || 0,
           organizer: data.organizer?.name || 'Unknown Organizer'
        });
        
        // 2. Check if logged in user is already registered for this event
        if (user) {
          const { data: reg, error: regError } = await supabase
            .from('event_registrations')
            .select('id')
            .eq('event_id', id)
            .eq('profile_id', user.id)
            .single();
            
          if (reg && !regError) {
             setRegistered(true);
          }
          
          // 3. Check if event is bookmarked
          const { data: bookmark, error: bookmarkError } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('event_id', id)
            .eq('profile_id', user.id)
            .single();
            
          if (bookmark && !bookmarkError) {
            setIsBookmarked(true);
          }
        }
      }
      setLoading(false);
    }
    
    if (id) fetchEvent();
  }, [id, user]);

  useEffect(() => {
    if (!showRegistrationModal || !user || !event) return;

    const initialCount = isTeamEvent ? Math.min(teamMemberLimit, 2) : 1;
    const defaultMember = buildEmptyMember({
      name: user.name || '',
      enrollment_no: user.enrollment_no || '',
      year: user.year || '',
      batch: user.batch || '',
    });

    setMemberCount(initialCount);
    setRegistrationForm({
      teamName: isTeamEvent ? `${event.title || 'Event'} team` : '',
      captainContact: user.email || '',
      members: Array.from({ length: initialCount }, (_, index) => (index === 0 ? defaultMember : buildEmptyMember())),
    });
    setRegistrationError('');
  }, [event, isTeamEvent, showRegistrationModal, teamMemberLimit, user]);

  useEffect(() => {
    if (!showRegistrationModal || !event) return;

    setRegistrationForm((current) => {
      const nextMembers = [...current.members];
      const defaultMember = buildEmptyMember();

      while (nextMembers.length < memberCount) {
        nextMembers.push(defaultMember);
      }

      return {
        ...current,
        members: nextMembers.slice(0, memberCount),
      };
    });
  }, [memberCount, showRegistrationModal, event]);

  const updateMember = (index, field, value) => {
    setRegistrationForm((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) => (
        memberIndex === index ? { ...member, [field]: value } : member
      )),
    }));
  };

  const openRegistrationModal = () => {
    if (!user) return navigate('/login');
    if (event?.status === 'closed' || isAtCapacity) return;
    setShowRegistrationModal(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!user || !event) {
      return;
    }

    const normalizedMembers = registrationForm.members.map((member, index) => ({
      name: member.name.trim(),
      enrollment_no: member.enrollment_no.trim(),
      year: member.year.trim(),
      batch: member.batch.trim(),
      is_captain: index === 0,
    }));

    if (normalizedMembers.some((member) => !member.name || !member.enrollment_no || !member.year || !member.batch)) {
      setRegistrationError('Please fill in the name, enrollment number, year, and batch for every member.');
      return;
    }

    if (isTeamEvent && (!registrationForm.teamName.trim() || !registrationForm.captainContact.trim())) {
      setRegistrationError('Team name and captain contact are required for team events.');
      return;
    }

    setRegistrationSubmitting(true);
    setRegistrationError('');

    const { error } = await supabase
      .from('event_registrations')
      .insert([{ 
        event_id: event.id,
        profile_id: user.id,
        registration_type: isTeamEvent ? 'team' : 'solo',
        registration_data: {
          event_title: event.title,
          event_type: isTeamEvent ? 'team' : 'solo',
          team_name: isTeamEvent ? registrationForm.teamName.trim() : null,
          captain_contact: registrationForm.captainContact.trim(),
          members: normalizedMembers,
        },
      }]);

    if (!error) {
      setRegistered(true);
      setEvent({ ...event, registrations: event.registrations + 1 });
      setShowRegistrationModal(false);
      showToast('Successfully registered!', { type: 'success' });
    } else {
      console.error(error);
      setRegistrationError(error.message || 'Error registering for event.');
      showToast('Error registering for event.', { type: 'error' });
    }

    setRegistrationSubmitting(false);
  };

  const handleCancelRegistration = async () => {
    if (!user) return navigate('/login');
    if (!window.confirm("Are you sure you want to cancel your registration?")) return;
    
    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', event.id)
      .eq('profile_id', user.id);
      
    if (!error) {
      setRegistered(false);
      setEvent({ ...event, registrations: Math.max(0, event.registrations - 1) });
      showToast('Registration cancelled.', { type: 'info' });
    } else {
      console.error(error);
      showToast('Error cancelling registration.', { type: 'error' });
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) return navigate('/login');

    if (isBookmarked) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('event_id', event.id)
        .eq('profile_id', user.id);
      
      if (!error) {
        setIsBookmarked(false);
        showToast('Event removed from saved.', { type: 'info' });
      } else {
        showToast('Error removing bookmark.', { type: 'error' });
      }
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert([{ event_id: event.id, profile_id: user.id }]);
      
      if (!error) {
        setIsBookmarked(true);
        showToast('Event saved!', { type: 'success' });
      } else {
        showToast('Error saving event.', { type: 'error' });
      }
    }
  };

  const handleShareEvent = (platform) => {
    const eventUrl = `${window.location.origin}/event/${event.id}`;
    const eventText = `Check out this event: ${event.title} - ${event.description.substring(0, 50)}... Join us!`;
    
    const urls = {
      copy: () => {
        navigator.clipboard.writeText(eventUrl);
        showToast('Event link copied to clipboard!', { type: 'success' });
        setShowShareModal(false);
      },
      whatsapp: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(eventText + ' ' + eventUrl)}`, '_blank');
      },
      twitter: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(eventText)}&url=${encodeURIComponent(eventUrl)}`, '_blank');
      },
      linkedin: () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`, '_blank');
      },
      email: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(eventText + '\n\n' + eventUrl)}`;
      }
    };
    
    urls[platform]?.();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32 px-4">
         <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-32">
        <h2 className="text-2xl font-bold text-gray-700">Event not found</h2>
        <Link to="/events" className="btn-primary mt-6 inline-block">Back to Events</Link>
      </div>
    );
  }

  const maxSeats = Number(event.maxSeats) || 0;
  const filled = maxSeats > 0 ? Math.round((event.registrations / maxSeats) * 100) : 0;
  const isAtCapacity = maxSeats <= 0 || filled >= 100;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 text-sm">
        <ArrowLeft size={16} /> Back to Events
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-64 object-cover rounded-2xl mb-6 bg-gray-100"
            />
          ) : (
            <div className="w-full h-64 rounded-2xl mb-6 bg-gradient-to-tr from-blue-100 to-purple-100" />
          )}

          <div className="flex items-center gap-2 mb-2">
            <span className="badge bg-blue-100 text-blue-700">{event.category}</span>
            <span className="badge bg-slate-100 text-slate-700 capitalize">
              {isTeamEvent ? `Team event • max ${teamMemberLimit} members` : 'Solo event'}
            </span>
            <span className={`badge ${event.status === 'closed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {event.status === 'closed' ? 'Closed' : 'Available'}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{event.title}</h1>
          <p className="text-blue-600 font-semibold mb-6">by {event.club || 'Campus Connect'}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { icon: <Calendar size={16} />, label: 'Date & Time', value: `${new Date(event.date).toDateString()} • ${event.time}` },
              { icon: <MapPin size={16} />, label: 'Venue', value: event.venue },
              { icon: <Users size={16} />, label: 'Organizer', value: event.organizer },
                { icon: <Clock size={16} />, label: 'Registrations', value: `${event.registrations} / ${maxSeats}` },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                <span className="text-blue-600 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="font-semibold text-sm text-gray-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-3">About this Event</h2>
          <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-wrap">{event.description}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {event.tags && event.tags.map((tag) => (
              <span key={tag} className="badge bg-blue-50 text-blue-700 text-sm px-3 py-1">{tag}</span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-6 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Registration</h3>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500 flex items-center gap-1"><Users size={14} /> {event.registrations} registered</span>
                <span className="text-gray-500">{event.maxSeats} total</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${isAtCapacity ? 'bg-red-500' : filled >= 70 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(filled, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {maxSeats > 0 ? `${Math.max(100 - filled, 0)}% seats available` : 'Registration data unavailable'}
              </p>
            </div>

            {!registered ? (
              <button
                onClick={openRegistrationModal}
                disabled={event.status === 'closed' || isAtCapacity}
                className={`btn-primary w-full ${event.status === 'closed' || isAtCapacity ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {event.status === 'closed' ? 'Event Closed' : isAtCapacity ? 'House Full' : 'Register Now'}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-4">
                  <CheckCircle2 size={20} />
                  <div>
                    <p className="font-semibold text-sm">You're registered!</p>
                    <p className="text-xs text-green-600">Check your email for details.</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelRegistration}
                  className="w-full text-sm font-semibold text-red-600 hover:bg-red-50 py-2.5 rounded-xl border border-transparent transition-colors"
                >
                  Cancel Registration
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button 
                onClick={handleToggleBookmark}
                className={`flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-2 text-sm font-medium transition-colors ${
                  isBookmarked 
                    ? 'bg-blue-50 border-blue-300 text-blue-600' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} /> 
                {isBookmarked ? 'Saved' : 'Save'}
              </button>
              <button 
                onClick={() => setShowShareModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                <Share2 size={15} /> Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRegistrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Complete your registration</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {isTeamEvent
                    ? `Fill in the team details for this event. Max ${teamMemberLimit} members per team.`
                    : 'Fill in your details to confirm your registration.'}
                </p>
              </div>
              <button
                onClick={() => setShowRegistrationModal(false)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close registration form"
              >
                <ArrowLeft size={18} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="max-h-[80vh] overflow-y-auto px-6 py-5">
              {registrationError && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {registrationError}
                </div>
              )}

              {isTeamEvent && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Team Name *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={registrationForm.teamName}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, teamName: e.target.value })}
                        placeholder="Enter your team name"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Captain Contact *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={registrationForm.captainContact}
                        onChange={(e) => setRegistrationForm({ ...registrationForm, captainContact: e.target.value })}
                        placeholder="Phone number or email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Number of team members *</label>
                    <input
                      type="number"
                      min="1"
                      max={teamMemberLimit}
                      className="input-field"
                      value={memberCount}
                      onChange={(e) => setMemberCount(Math.max(1, Math.min(teamMemberLimit, Number(e.target.value) || 1)))}
                    />
                    <p className="mt-1 text-xs text-gray-500">This includes the captain. Maximum allowed is {teamMemberLimit}.</p>
                  </div>

                  <div className="space-y-3">
                    {registrationForm.members.map((member, index) => (
                      <div key={index} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <p className="mb-3 text-sm font-semibold text-gray-900">
                          {index === 0 ? 'Captain' : `Member ${index + 1}`}
                        </p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <input
                            className="input-field"
                            placeholder="Full name"
                            value={member.name}
                            onChange={(e) => updateMember(index, 'name', e.target.value)}
                            required
                          />
                          <input
                            className="input-field"
                            placeholder="Enrollment no."
                            value={member.enrollment_no}
                            onChange={(e) => updateMember(index, 'enrollment_no', e.target.value)}
                            required
                          />
                          <input
                            className="input-field"
                            placeholder="Year"
                            value={member.year}
                            onChange={(e) => updateMember(index, 'year', e.target.value)}
                            required
                          />
                          <input
                            className="input-field"
                            placeholder="Batch"
                            value={member.batch}
                            onChange={(e) => updateMember(index, 'batch', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isTeamEvent && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={registrationForm.members[0]?.name || user?.name || ''}
                        onChange={(e) => updateMember(0, 'name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Enrollment No. *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={registrationForm.members[0]?.enrollment_no || user?.enrollment_no || ''}
                        onChange={(e) => updateMember(0, 'enrollment_no', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Year *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={registrationForm.members[0]?.year || user?.year || ''}
                        onChange={(e) => updateMember(0, 'year', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Batch *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={registrationForm.members[0]?.batch || user?.batch || ''}
                        onChange={(e) => updateMember(0, 'batch', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowRegistrationModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registrationSubmitting}
                  className="btn-primary flex-1 disabled:opacity-70"
                >
                  {registrationSubmitting ? 'Submitting...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Share Event</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100"
              >
                <ArrowLeft size={18} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <button
                onClick={() => handleShareEvent('copy')}
                className="w-full flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <Copy size={18} className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">Copy Link</p>
                  <p className="text-xs text-gray-500">Copy event link to clipboard</p>
                </div>
              </button>

              <button
                onClick={() => handleShareEvent('whatsapp')}
                className="w-full flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <MessageCircle size={18} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">WhatsApp</p>
                  <p className="text-xs text-gray-500">Share via WhatsApp</p>
                </div>
              </button>

              <button
                onClick={() => handleShareEvent('twitter')}
                className="w-full flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <Twitter size={18} className="text-blue-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">Twitter</p>
                  <p className="text-xs text-gray-500">Share on Twitter</p>
                </div>
              </button>

              <button
                onClick={() => handleShareEvent('linkedin')}
                className="w-full flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <Linkedin size={18} className="text-blue-700 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">LinkedIn</p>
                  <p className="text-xs text-gray-500">Share on LinkedIn</p>
                </div>
              </button>

              <button
                onClick={() => handleShareEvent('email')}
                className="w-full flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <Mail size={18} className="text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">Email</p>
                  <p className="text-xs text-gray-500">Share via Email</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
