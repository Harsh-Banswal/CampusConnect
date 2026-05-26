import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Github, Linkedin, Mail, Plus, MessageSquare, Code2, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProfileViewPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id: profileId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState('none');

  useEffect(() => {
    async function loadProfile() {
      if (!profileId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*, projects(*)')
        .eq('id', profileId)
        .single();

      if (!error && data) {
        setProfile({
          ...data,
          projects: data.projects || [],
          skills: data.skills || []
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, [profileId]);

  useEffect(() => {
    async function loadConnectionState() {
      if (!user || !profileId || profileId === user.id) {
        setConnectionState('none');
        return;
      }

      const { data, error } = await supabase
        .from('connection_requests')
        .select('requester_id, recipient_id, status')
        .or(`and(requester_id.eq.${user.id},recipient_id.eq.${profileId}),and(requester_id.eq.${profileId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading connection state:', error);
        return;
      }

      if (!data) {
        setConnectionState('none');
        return;
      }

      if (data.status === 'accepted') {
        setConnectionState('connected');
      } else if (data.status === 'pending' && data.requester_id === user.id) {
        setConnectionState('outgoing_pending');
      } else if (data.status === 'pending' && data.recipient_id === user.id) {
        setConnectionState('incoming_pending');
      } else if (data.status === 'rejected' && data.requester_id === user.id) {
        setConnectionState('rejected_outgoing');
      } else {
        setConnectionState('none');
      }
    }

    loadConnectionState();
  }, [profileId, user]);

  const getConnectButtonState = () => {
    if (connectionState === 'connected') return { label: 'Connected', disabled: true };
    if (connectionState === 'outgoing_pending') return { label: 'Cancel Request', disabled: false, tone: 'danger' };
    if (connectionState === 'incoming_pending') return { label: 'Incoming Request', disabled: true };
    if (connectionState === 'rejected_outgoing') return { label: 'Request Rejected', disabled: true };
    return { label: 'Connect', disabled: false, tone: 'primary' };
  };

  const handleCancelRequest = async () => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('requester_id', user.id)
        .eq('recipient_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;

      setConnectionState('none');
      showToast(`Connection request to ${profile.name} canceled.`, { type: 'info' });
    } catch (err) {
      console.error('Error canceling connection request:', err);
      showToast(err?.message || 'Failed to cancel connection request.', { type: 'error' });
    }
  };

  const handleConnect = async () => {
    if (!user || !profile || profile.id === user.id) return;

    if (connectionState === 'outgoing_pending') {
      await handleCancelRequest();
      return;
    }

    try {
      // Check if connection request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('recipient_id', profile.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          showToast('You already sent a connection request to this user.', { type: 'warning' });
        } else if (existingRequest.status === 'accepted') {
          showToast('You are already connected with this user.', { type: 'info' });
        } else if (existingRequest.status === 'rejected') {
          showToast('Your previous connection request was rejected.', { type: 'warning' });
        }
        return;
      }

      // Create connection request
      const { error: insertError } = await supabase.from('connection_requests').insert([{
        requester_id: user.id,
        recipient_id: profile.id,
        status: 'pending',
      }]);

      if (insertError) throw insertError;

      // Send notification (best effort). A notification failure should not roll back a successful request.
      const senderName = user.name || user.email || 'Someone';
      const { error: notificationError } = await supabase.from('notifications').insert([{
        profile_id: profile.id,
        title: 'Connection request',
        message: `${senderName} wants to connect with you.`,
        link: `/profile/${user.id}`,
        is_read: false,
      }]);

      if (notificationError) {
        console.warn('Connection request created, but notification failed:', notificationError);
      }

      setConnectionState('outgoing_pending');
      showToast(`Connection request sent to ${profile.name}.`, { type: 'success' });
    } catch (err) {
      console.error('Error sending connection request:', err);
      const friendlyMessage = err?.message ? `Failed to send the connection request: ${err.message}` : 'Failed to send the connection request.';
      showToast(friendlyMessage, { type: 'error', duration: 4500 });
    }
  };

  const handleMessage = () => {
    if (!profile || profile.id === user?.id) return;
    navigate('/chat', { state: { startChatWith: profile.id } });
  };

  if (loading) {
    return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!profile) {
    return <div className="text-center py-32 text-gray-400">Profile could not be loaded. Ensure your record exists.</div>;
  }

  const isOwnProfile = profile.id === user?.id;
  const connectButton = getConnectButtonState();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">{profile.name}'s Profile</h1>
          <p className="text-sm text-gray-400 mt-1">
            {isOwnProfile ? 'This is your profile preview.' : 'View this developer profile and reach out.'}
          </p>
        </div>

        {!isOwnProfile && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleConnect}
              disabled={connectButton.disabled}
              className={`text-sm flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium transition-colors ${
                connectButton.disabled
                  ? 'cursor-not-allowed border border-dark-border bg-dark-surface text-gray-500'
                  : connectButton.tone === 'danger'
                    ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'btn-primary'
              }`}
            >
              <Plus size={14} /> {connectButton.label}
            </button>
            <button onClick={handleMessage} className="btn-secondary text-sm flex items-center gap-2">
              <MessageSquare size={14} /> Message
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card p-6 text-center shadow-sm bg-dark-card border border-dark-border">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full mx-auto mb-3 object-cover ring-4 ring-dark-surface" />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto mb-3 bg-accent-purple text-white flex items-center justify-center text-3xl font-bold ring-4 ring-dark-surface">
                {profile.name?.charAt(0) || 'U'}
              </div>
            )}

            <h2 className="text-xl font-bold text-white leading-tight">{profile.name}</h2>
            <p className="text-accent-purple font-medium text-sm capitalize mt-1">{profile.role?.replace('_', ' ')}</p>
            <p className="text-gray-400 text-xs mt-1">{profile.department} {profile.year ? `• ${profile.year}` : ''}</p>

            <div className="mt-4 rounded-2xl border border-dark-border bg-dark-surface px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Enrollment No.</p>
              <p className="mt-1 text-sm font-bold text-white break-all">
                {profile.enrollment_no || 'Not added yet'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-3">
              <Mail size={13} className="text-gray-400" /> {profile.email}
            </div>

            <div className="flex justify-center gap-4 mt-5 pt-4 border-t border-dark-border">
              <a href={profile.github || '#'} target="_blank" rel="noreferrer" className={`text-gray-400 hover:text-white transition-colors ${!profile.github && 'opacity-30 cursor-not-allowed'}`}>
                <Github size={20} />
              </a>
              <a href={profile.linkedin || '#'} target="_blank" rel="noreferrer" className={`text-gray-400 hover:text-accent-purple transition-colors ${!profile.linkedin && 'opacity-30 cursor-not-allowed'}`}>
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          <div className="card p-5 shadow-sm bg-dark-card border border-dark-border mt-6">
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Activity Highlights</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-sm text-gray-400">
                  <div className="p-1.5 bg-dark-surface rounded-lg border border-dark-border"><Code2 size={15} className="text-violet-500" /></div> Projects
                </div>
                <span className="font-bold text-white bg-dark-surface px-2 py-0.5 rounded-md">{profile.projects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-sm text-gray-400">
                  <div className="p-1.5 bg-dark-surface rounded-lg border border-dark-border"><Briefcase size={15} className="text-purple-500" /></div> Events
                </div>
                <span className="font-bold text-white bg-dark-surface px-2 py-0.5 rounded-md">{profile.events_attended || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6 shadow-sm bg-dark-card border border-dark-border">
            <h3 className="font-bold text-white mb-4">About Me</h3>
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{profile.bio || 'No bio added yet.'}</p>
          </div>

          <div className="card p-6 shadow-sm bg-dark-card border border-dark-border">
            <h3 className="font-bold text-white mb-5">Skills & Expertise</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.skills.length === 0 ? (
                <p className="text-sm text-gray-400 w-full mb-1">No skills listed yet.</p>
              ) : (
                profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="badge bg-dark-surface border border-dark-border text-accent-purple flex items-center gap-1.5 text-sm px-3 py-1.5 shadow-sm"
                  >
                    {skill}
                  </span>
                ))
              )}
            </div>
          </div>

          
          <div className="card p-6 shadow-sm bg-dark-card border border-dark-border">
            <h3 className="font-bold text-white mb-5">Events</h3>
            <div className="text-center py-8 bg-dark-surface rounded-xl border border-dashed border-dark-border">
              <div className="mx-auto w-12 h-12 bg-dark-card rounded-full flex items-center justify-center mb-3">
                <Briefcase size={20} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No events added yet.</p>
            </div>
          </div>
\n          <div className="card p-6 shadow-sm bg-dark-card border border-dark-border border-t-4 border-t-accent-purple">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white">Projects & Portfolio</h3>
            </div>

            {profile.projects.length === 0 ? (
              <div className="text-center py-8 bg-dark-surface rounded-xl border border-dashed border-dark-border">
                <Code2 size={32} className="mx-auto text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 font-medium">No projects added yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.projects.map((project) => (
                  <div key={project.id} className="border border-dark-border bg-dark-card rounded-xl p-5 hover:border-accent hover:shadow-md transition-all relative">
                    <h4 className="font-bold text-white text-base">{project.title}</h4>
                    {project.tech && <span className="inline-block bg-dark-surface border border-dark-border text-gray-300 mt-2.5 text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider">{project.tech}</span>}
                    <p className="text-sm text-gray-400 mt-3 line-clamp-3 leading-relaxed">{project.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
