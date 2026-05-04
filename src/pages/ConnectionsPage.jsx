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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white ring-2 ring-slate-100">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900">{profile.name}</h3>
            <p className="text-xs text-slate-500">{profile.department || 'Department not set'}{profile.year ? ` • ${profile.year}` : ''}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{profile.bio || 'No bio yet.'}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {actions}
          <Link
            to={`/profile/${item.otherUserId}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-[linear-gradient(140deg,#f0f9ff_0%,#f8fafc_55%,#eef2ff_100%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Your Connections</h1>
            <p className="mt-2 text-sm text-slate-600">Manage accepted friends and pending requests in one place.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-slate-900">{accepted.length}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Connected</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-slate-900">{incomingPending.length}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Incoming</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-slate-900">{outgoingPending.length}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Sent</p>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <UserRoundPlus size={16} className="text-amber-600" />
          <h2 className="text-lg font-bold text-slate-900">Incoming Requests</h2>
        </div>

        {incomingPending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No incoming connection requests.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {incomingPending.map((item) => (
              <ProfileCard
                key={item.id}
                item={item}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(item.id, 'accepted')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(item.id, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <X size={13} /> Decline
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 size={16} className="text-sky-600" />
          <h2 className="text-lg font-bold text-slate-900">Sent Requests</h2>
        </div>

        {outgoingPending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No pending requests sent by you.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {outgoingPending.map((item) => (
              <ProfileCard
                key={item.id}
                item={item}
                actions={
                  <>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                      <Clock3 size={13} /> Request Sent
                    </span>
                    <button
                      type="button"
                      onClick={() => cancelOutgoingRequest(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <X size={13} /> Cancel Request
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <UserRoundCheck size={16} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">Connected Friends</h2>
        </div>

        {accepted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">You have no accepted connections yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {accepted.map((item) => (
              <ProfileCard
                key={item.id}
                item={item}
                actions={
                  <button
                    type="button"
                    onClick={() => openChat(item.otherUserId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <MessageSquare size={13} /> Message
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
