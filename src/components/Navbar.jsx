import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Bell, MessageSquare, User, LogOut, ChevronDown, Check, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const navLinks = [
  { to: '/events', label: 'Events' },
  { to: '/developers', label: 'Developers' },
  { to: '/connections', label: 'Connections' },
  { to: '/ai-teams', label: 'Team Builder' },
  { to: '/chat', label: 'Messages' },
  { to: '/admin', label: 'System Admin', requiresSystemAdmin: true },
];

export default function Navbar({ user, onLogout }) {
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const notifRef = useRef(null);
  
  const location = useLocation();
  const userInitials = (user?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  const isActive = (path) => location.pathname === path;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      const { data: rawNotifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
      }

      const { data: pendingRequests, error: requestsError } = await supabase
        .from('connection_requests')
        .select('id, requester_id, created_at')
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching pending connection requests:', requestsError);
      }

      const requesterIds = [...new Set((pendingRequests || []).map((req) => req.requester_id))];
      let requesterNameById = {};

      if (requesterIds.length > 0) {
        const { data: requesterProfiles, error: requesterProfilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', requesterIds);

        if (requesterProfilesError) {
          console.error('Error fetching requester profiles:', requesterProfilesError);
        } else {
          requesterNameById = (requesterProfiles || []).reduce((acc, profile) => {
            acc[profile.id] = profile.name;
            return acc;
          }, {});
        }
      }

      const synthesizedRequestNotifs = (pendingRequests || []).map((req) => ({
        id: `connection_request_${req.id}`,
        connection_request_id: req.id,
        profile_id: user.id,
        title: 'Connection request',
        message: `${requesterNameById[req.requester_id] || 'Someone'} wants to connect with you.`,
        is_read: false,
        link: `/profile/${req.requester_id}`,
        created_at: req.created_at,
      }));

      const dedupedConnectionNotifs = [];
      const seenRequesters = new Set((pendingRequests || []).map((req) => req.requester_id));
      for (const notif of rawNotifications || []) {
        const requesterId = notif.link?.replace('/profile/', '');
        if (notif.title === 'Connection request' && requesterId && seenRequesters.has(requesterId)) {
          continue;
        }
        dedupedConnectionNotifs.push(notif);
      }

      const merged = [...synthesizedRequestNotifs, ...dedupedConnectionNotifs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setNotifications(merged);
    };

    fetchNotifications();

    const notificationsChannel = supabase
      .channel('notifications_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 10));
      })
      .subscribe();

    const requestsChannel = supabase
      .channel('connection_requests_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connection_requests',
        filter: `recipient_id=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [user]);

  const handleAcceptRequest = async (requestId, requesterId) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      // Mark notification as read
      const notification = notifications.find(
        (n) => n.connection_request_id === requestId || n.link === `/profile/${requesterId}`
      );
      if (notification) {
        const isPersistedNotification = !String(notification.id).startsWith('connection_request_');
        if (isPersistedNotification) {
          await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        }
      }

      showToast('Connection request accepted!', { type: 'success' });
      if (notification) {
        setNotifications((current) => current.filter((n) => n.id !== notification.id));
      }
    } catch (err) {
      console.error('Error accepting request:', err);
      showToast(err?.message || 'Failed to accept request.', { type: 'error' });
    }
  };

  const handleRejectRequest = async (requestId, requesterId) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      // Mark notification as read
      const notification = notifications.find(
        (n) => n.connection_request_id === requestId || n.link === `/profile/${requesterId}`
      );
      if (notification) {
        const isPersistedNotification = !String(notification.id).startsWith('connection_request_');
        if (isPersistedNotification) {
          await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        }
      }

      showToast('Connection request declined.', { type: 'info' });
      if (notification) {
        setNotifications((current) => current.filter((n) => n.id !== notification.id));
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      showToast(err?.message || 'Failed to decline request.', { type: 'error' });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('profile_id', user.id);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from('notifications').delete().eq('profile_id', user.id);
      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => String(n.id).startsWith('connection_request_')));
      showToast("Notifications cleared", { type: 'success' });
      setShowClearConfirm(false);
      setNotifOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to clear notifications", { type: 'error' });
      setShowClearConfirm(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? '/events' : '/'} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_100%)] shadow-lg shadow-cyan-500/20">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">CampusConnect</span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                if (link.requiresAdmin && user?.role !== 'club_admin') return null;
                if (link.requiresSystemAdmin && user?.role !== 'admin') return null;
                return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
                );
              })}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => { setNotifOpen(!notifOpen); setDropOpen(false); }}
                    className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-300 transition-colors hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1">
                              <Check size={12} /> Mark read
                            </button>
                          )}
                          <button onClick={() => setShowClearConfirm(true)} className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-1">
                            <Trash2 size={12} /> Clear all
                          </button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-gray-400 dark:text-gray-500">No new notifications</div>
                        ) : (
                          notifications.map((notif) => {
                            const isConnectionRequest = notif.title === 'Connection request';
                            const requesterId = notif.link?.replace('/profile/', '');

                            return (
                              <div
                                key={notif.id}
                                className={`px-4 py-3 border-b dark:border-slate-800 last:border-0 ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-950/30' : 'dark:bg-slate-900'}`}
                              >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <div>
                                    <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{notif.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                  </div>
                                  {!notif.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />}
                                </div>

                                {isConnectionRequest && requesterId ? (
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        if (notif.connection_request_id) {
                                          handleAcceptRequest(notif.connection_request_id, requesterId);
                                        } else {
                                          const { data: req, error: reqError } = await supabase
                                            .from('connection_requests')
                                            .select('id')
                                            .eq('requester_id', requesterId)
                                            .eq('recipient_id', user.id)
                                            .eq('status', 'pending')
                                            .maybeSingle();
                                          if (reqError) {
                                            console.error('Error loading request before accept:', reqError);
                                          } else if (req) {
                                            handleAcceptRequest(req.id, requesterId);
                                          }
                                        }
                                        setNotifOpen(false);
                                      }}
                                      className="flex-1 text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900 px-3 py-1.5 rounded-md font-semibold transition-colors"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        if (notif.connection_request_id) {
                                          handleRejectRequest(notif.connection_request_id, requesterId);
                                        } else {
                                          const { data: req, error: reqError } = await supabase
                                            .from('connection_requests')
                                            .select('id')
                                            .eq('requester_id', requesterId)
                                            .eq('recipient_id', user.id)
                                            .eq('status', 'pending')
                                            .maybeSingle();
                                          if (reqError) {
                                            console.error('Error loading request before reject:', reqError);
                                          } else if (req) {
                                            handleRejectRequest(req.id, requesterId);
                                          }
                                        }
                                        setNotifOpen(false);
                                      }}
                                      className="flex-1 text-xs bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900 px-3 py-1.5 rounded-md font-semibold transition-colors"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                ) : (
                                  <Link
                                    to={notif.link || '#'}
                                    onClick={() => setNotifOpen(false)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2 inline-block"
                                  >
                                    View →
                                  </Link>
                                )}

                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setDropOpen(!dropOpen); setNotifOpen(false); }}
                    className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 transition-colors hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-xs font-semibold">
                      {userInitials}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {user.name}
                    </span>
                    <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
                  </button>

                  {dropOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                      <Link
                        to="/profile"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <User size={16} /> My Profile
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <MessageSquare size={16} /> Dashboard
                      </Link>
                      <hr className="my-1 border-slate-100 dark:border-slate-800" />
                      <button
                         onClick={() => { onLogout(); setDropOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-sm dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">
                  Log In
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            {user && (
              <button
                className="md:hidden rounded-xl p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {user && menuOpen && (
          <div className="space-y-1 border-t border-slate-100 py-3 md:hidden">
            {navLinks.map((link) => {
              if (link.requiresAdmin && user?.role !== 'club_admin') return null;
              if (link.requiresSystemAdmin && user?.role !== 'admin') return null;
              return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                  isActive(link.to) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
                }`}
              >
                {link.label}
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>

      {/* Clear Notifications Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Clear Notifications</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to clear all your notifications? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium text-sm shadow-sm"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
