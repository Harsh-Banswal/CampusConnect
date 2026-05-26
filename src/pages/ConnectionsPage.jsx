import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Clock3, MessageSquare, UserRoundCheck, UserRoundPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ConnectionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState([]);
  const [incomingPending, setIncomingPending] = useState([]);
  const [outgoingPending, setOutgoingPending] = useState([]);

  const fetchConnections = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: requests, error } = await supabase
        .from('connection_requests')
        .select('id, requester_id, recipient_id, status, created_at, updated_at')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const otherIds = [...new Set((requests || []).map((req) => (req.requester_id === user.id ? req.recipient_id : req.requester_id)))];

      let profilesById = {};
      if (otherIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, department, year, avatar, bio')
          .in('id', otherIds);

        if (profilesError) throw profilesError;

        profilesById = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      const acceptedRows = [];
      const incomingRows = [];
      const outgoingRows = [];

      for (const req of requests || []) {
        const otherUserId = req.requester_id === user.id ? req.recipient_id : req.requester_id;
        const profile = profilesById[otherUserId];
        if (!profile) continue;

        const row = {
          ...req,
          otherUserId,
          profile,
        };

        if (req.status === 'accepted') {
          acceptedRows.push(row);
        } else if (req.status === 'pending' && req.recipient_id === user.id) {
          incomingRows.push(row);
        } else if (req.status === 'pending' && req.requester_id === user.id) {
          outgoingRows.push(row);
        }
      }

      setAccepted(acceptedRows);
      setIncomingPending(incomingRows);
      setOutgoingPending(outgoingRows);
    } catch (err) {
      console.error('Error fetching connections:', err);
      showToast(err?.message || 'Failed to load connections.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const updateRequestStatus = async (requestId, status) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      if (status === 'accepted') {
        showToast('Connection request accepted.', { type: 'success' });
      } else {
        showToast('Connection request declined.', { type: 'info' });
      }

      fetchConnections();
    } catch (err) {
      console.error('Error updating request status:', err);
      showToast(err?.message || 'Failed to update request.', { type: 'error' });
    }
  };

  const cancelOutgoingRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('id', requestId)
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      showToast('Connection request canceled.', { type: 'info' });
      fetchConnections();
    } catch (err) {
      console.error('Error canceling outgoing request:', err);
      showToast(err?.message || 'Failed to cancel request.', { type: 'error' });
    }
  };

  const openChat = (otherUserId) => {
    navigate('/chat', { state: { startChatWith: otherUserId } });
  };

  const ProfileCard = ({ item, actions }) => {
    const profile = item.profile;
    const initials = (profile.name || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';

    return (
      <div className="rounded-2xl border border-dark-border bg-dark-card p-4 shadow-sm transition hover:border-accent">
        <div className="flex items-start gap-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-dark-surface" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent ring-2 ring-dark-surface">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-white">{profile.name}</h3>
            <p className="text-xs text-gray-400">{profile.department || 'Department not set'}{profile.year ? ` • ${profile.year}` : ''}</p>
            <p className="mt-1 line-clamp-2 text-xs text-gray-400">{profile.bio || 'No bio yet.'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {actions}
          <Link
            to={`/profile/${item.otherUserId}`}
            className="flex-1 text-center rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-accent hover:text-accent"
          >
            View Profile
          </Link>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 bg-dark min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-accent mb-6">Your Connections</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-dark-border bg-dark-card p-4 flex justify-between items-center">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold mb-1">Connected Friends</p>
              <p className="text-3xl font-black text-white">{accepted.length}</p>
            </div>
            <div className="h-10 w-10 bg-accent-muted rounded-lg flex items-center justify-center text-accent">
              <UserRoundCheck size={20} />
            </div>
          </div>

          <div className="rounded-xl border border-dark-border bg-dark-card p-4 flex justify-between items-center">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold mb-1">Incoming Requests</p>
              <p className="text-3xl font-black text-accent-green">{incomingPending.length}</p>
            </div>
            <div className="h-10 w-10 bg-accent-mutedGreen rounded-lg flex items-center justify-center text-accent-green">
              <UserRoundPlus size={20} />
            </div>
          </div>

          <div className="rounded-xl border border-dark-border bg-dark-card p-4 flex justify-between items-center">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold mb-1">Sent Requests</p>
              <p className="text-3xl font-black text-orange-400">{outgoingPending.length}</p>
            </div>
            <div className="h-10 w-10 bg-orange-900/40 rounded-lg flex items-center justify-center text-orange-400">
              <Clock3 size={20} />
            </div>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-accent-green/20 flex justify-center items-center">
            <UserRoundPlus size={14} className="text-accent-green" />
          </div>
          <h2 className="text-lg font-bold text-white">Incoming Requests</h2>
        </div>

        {incomingPending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-dark-border bg-dark-card p-6 text-sm text-gray-500 text-center">No incoming connection requests.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {incomingPending.map((item) => (
              <ProfileCard
                key={item.id}
                item={item}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(item.id, 'accepted')}
                      className="flex-1 inline-flex justify-center items-center gap-1 rounded-lg bg-accent-green px-3 py-2 text-xs font-bold text-black transition hover:bg-accent-greenHover"
                    >
                       Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(item.id, 'rejected')}
                      className="flex-1 inline-flex justify-center items-center gap-1 rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-dark-border"
                    >
                       Decline
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-orange-400/20 flex justify-center items-center">
            <Clock3 size={14} className="text-orange-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Sent Requests</h2>
        </div>

        {outgoingPending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-dark-border bg-dark-card p-6 text-sm text-gray-500 text-center">No pending requests sent by you.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {outgoingPending.map((item) => (
              <ProfileCard
                key={item.id}
                item={item}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => cancelOutgoingRequest(item.id)}
                      className="flex-1 inline-flex justify-center items-center gap-1 rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-dark-border hover:text-rose-400"
                    >
                      <X size={13} /> Cancel
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-accent/20 flex justify-center items-center">
            <UserRoundCheck size={14} className="text-accent" />
          </div>
          <h2 className="text-lg font-bold text-white">Connected Friends</h2>
        </div>

        {accepted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-dark-border bg-dark-card p-6 text-sm text-gray-500 text-center">You have no accepted connections yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accepted.map((item) => (
              <ProfileCard
                key={item.id}
                item={item}
                actions={
                  <button
                    type="button"
                    onClick={() => openChat(item.otherUserId)}
                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-black transition hover:bg-accent-purple"
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
