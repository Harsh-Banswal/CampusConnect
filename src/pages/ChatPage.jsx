import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Send, MoreVertical, Smile, Paperclip, MessageSquare, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import EmojiPicker from 'emoji-picker-react';

export default function ChatPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const startChatWithId = location.state?.startChatWith;
  const startConversationId = location.state?.conversationId;
  
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalUsers, setGlobalUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const bottomRef = useRef(null);
  const creatingConv = useRef(false);
  const optionsRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const activeConvRef = useRef(null);

  // Global user search for new conversations
  useEffect(() => {
    if (!showNewChatModal || !user) return;
    
    const searchUsers = async () => {
      setSearchingUsers(true);
      
      let query = supabase.from('profiles').select('id, name, avatar, department').neq('id', user.id).limit(10);
      
      if (globalSearch.trim()) {
        query = query.ilike('name', `%${globalSearch.trim()}%`);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        setGlobalUsers(data);
      }
      setSearchingUsers(false);
    };
    
    // Debounce
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [showNewChatModal, globalSearch, user]);

  // Close options dropdown on click outside
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  const refreshConversations = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        unread_count,
        conversations (
          id,
          is_group,
          name,
          last_message,
          updated_at,
          conversation_participants (
            profiles (
              id,
              name,
              avatar
            )
          )
        )
      `)
      .eq('profile_id', user.id);

    if (error) throw error;

    const formatted = (data || []).map((cp) => {
      const c = cp.conversations;
      let displayName = c.name;
      let otherUser = null;
      let participants = [];

      if (!c.is_group) {
        const others = c.conversation_participants.filter((p) => p.profiles?.id !== user.id);
        if (others.length > 0) {
          otherUser = others[0].profiles;
          displayName = otherUser?.name;
        }
      } else {
        participants = c.conversation_participants.map((p) => ({id: p.profiles?.id, name: p.profiles?.name})).filter(p => p.name);
      }

      return {
        id: c.id,
        name: displayName || 'Unknown',
        lastMessage: c.last_message,
        time: new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(c.updated_at).getTime(),
        unread: cp.unread_count,
        online: true,
        otherUserId: otherUser?.id,
        isGroup: c.is_group,
        participants,
      };
    }).sort((a, b) => b.timestamp - a.timestamp);

    setConversations(formatted);

    const currentActive = activeConvRef.current;
    if (currentActive?.id) {
      const updatedActive = formatted.find((conv) => conv.id === currentActive.id);
      if (updatedActive) {
        setActiveConv(updatedActive);
      }
    }

    return formatted;
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteChat = async () => {
    if (!activeConv) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this conversation? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', activeConv.id);
        
      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== activeConv.id));
      setActiveConv(null);
      setMessages([]);
      setShowOptions(false);
    } catch (err) {
      console.error("Error deleting conversation:", err);
      showToast("Failed to delete the conversation.", { type: 'error' });
    }
  };

  const handleRenameGroup = async (newName) => {
    if (!activeConv || !activeConv.isGroup) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ name: newName })
        .eq('id', activeConv.id);
        
      if (error) throw error;

      setActiveConv(prev => ({ ...prev, name: newName }));
      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, name: newName } : c));
      showToast("Group name updated successfully", { type: 'success' });
    } catch (err) {
      console.error("Error renaming group:", err);
      showToast("Failed to rename group.", { type: 'error' });
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch Messages for active conversation
  const selectConv = async (conv) => {
    setActiveConv(conv);
    setMessages([]); // clear old while loading

    if (conv.unread > 0) {
      await supabase
        .from('conversation_participants')
        .update({ unread_count: 0 })
        .eq('conversation_id', conv.id)
        .eq('profile_id', user.id);
        
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
      conv.unread = 0;
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        profiles ( name )
      `)
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data.map(m => ({
        id: m.id,
        from: m.sender_id === user.id ? 'me' : 'them',
        text: m.content,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderName: m.profiles?.name
      })));
    }
  };

  const startNewChat = async (userId) => {
    // Check if conversation already exists
    const existingConv = conversations.find((c) => c.otherUserId === userId);
    if (existingConv) {
      selectConv(existingConv);
      return;
    }

    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .insert([{ is_group: false, created_by: user.id }])
      .select()
      .single();

    if (convData && !convError) {
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: convData.id, profile_id: user.id },
          { conversation_id: convData.id, profile_id: userId },
        ]);

      if (partError) {
        console.error("Error inserting participants:", partError);
        showToast("Failed to add participants: " + partError.message, { type: 'error' });
      }

      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      const newConv = {
        id: convData.id,
        name: otherProfile?.name || 'Unknown',
        lastMessage: null,
        time: 'Just now',
        timestamp: Date.now(),
        unread: 0,
        online: true,
        otherUserId: userId,
        isGroup: false,
        participants: [{id: userId, name: otherProfile?.name}]
      };

      setConversations((prev) => [newConv, ...prev]);
      selectConv(newConv);
    } else {
      console.error("Error creating conversation:", convError);
      showToast("Failed to create conversation: " + convError?.message, { type: 'error' });
    }
  };

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const fetchConversations = async () => {
      try {
        if (!isMounted) return;

        const formatted = await refreshConversations();

        if (!isMounted) return;

        if (startChatWithId) {
          let existingConv = formatted.find((c) => c.otherUserId === startChatWithId);
          if (existingConv) {
            selectConv(existingConv);
            navigate('.', { replace: true, state: {} });
          } else if (!creatingConv.current) {
            creatingConv.current = true;

            const { data: convData, error: convError } = await supabase
              .from('conversations')
              .insert([{ is_group: false, created_by: user.id }])
              .select()
              .single();

            if (convData && !convError) {
              const { error: partError } = await supabase
                .from('conversation_participants')
                .insert([
                  { conversation_id: convData.id, profile_id: user.id },
                  { conversation_id: convData.id, profile_id: startChatWithId },
                ]);

              if (partError) {
                console.error("Error inserting participants:", partError);
                showToast("Failed to add participants: " + partError.message, { type: 'error' });
              }

              const { data: otherProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', startChatWithId)
                .single();

              const newConv = {
                id: convData.id,
                name: otherProfile?.name || 'Unknown',
                lastMessage: null,
                time: 'Just now',
                timestamp: Date.now(),
                unread: 0,
                online: true,
                otherUserId: startChatWithId,
                isGroup: false,
                participants: [{id: startChatWithId, name: otherProfile?.name}]
              };

              setConversations((prev) => [newConv, ...prev]);
              selectConv(newConv);
              navigate('.', { replace: true, state: {} });
            } else {
              console.error("Error creating conversation:", convError);
              showToast("Failed to create conversation: " + convError?.message, { type: 'error' });
            }

            creatingConv.current = false;
          }
        } else if (startConversationId) {
          const existingConv = formatted.find((conv) => conv.id === startConversationId);
          if (existingConv) {
            selectConv(existingConv);
            navigate('.', { replace: true, state: {} });
          } else {
            const { data: convData, error: convError } = await supabase
              .from('conversations')
              .select(
                `
                  id,
                  is_group,
                  name,
                  last_message,
                  updated_at,
                  conversation_participants (
                    profiles (
                      id,
                      name,
                      avatar
                    )
                  )
                `
              )
              .eq('id', startConversationId)
              .maybeSingle();

            if (!convError && convData) {
              const otherUser = convData.conversation_participants?.find((participant) => participant.profiles?.id !== user.id)?.profiles;
              const participants = convData.is_group ? convData.conversation_participants?.map((p) => ({id: p.profiles?.id, name: p.profiles?.name})).filter(p => p.name) : [];
              const newConv = {
                id: convData.id,
                name: convData.name || otherUser?.name || 'Unknown',
                lastMessage: convData.last_message,
                time: new Date(convData.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date(convData.updated_at).getTime(),
                unread: 0,
                online: true,
                otherUserId: otherUser?.id,
                isGroup: convData.is_group,
                participants,
              };

              setConversations((prev) => [newConv, ...prev.filter((conv) => conv.id !== newConv.id)]);
              selectConv(newConv);
              navigate('.', { replace: true, state: {} });
            }
          }
        } else if (formatted.length > 0 && !activeConvRef.current) {
          selectConv(formatted[0]);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConversations();

    return () => {
      isMounted = false;
    };
  }, [user, startChatWithId, startConversationId, navigate, refreshConversations]);

  useEffect(() => {
    if (!user) return;

    const conversationsChannel = supabase
      .channel(`chat_conversations_${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      }, (payload) => {
        const updated = payload.new;
        setConversations((prev) => prev.map((conv) => (
          conv.id === updated.id
            ? {
                ...conv,
                name: updated.name ?? conv.name,
                lastMessage: updated.last_message ?? conv.lastMessage,
                timestamp: updated.updated_at ? new Date(updated.updated_at).getTime() : conv.timestamp,
                time: updated.updated_at ? new Date(updated.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : conv.time,
              }
            : conv
        )).sort((a, b) => b.timestamp - a.timestamp));

        if (activeConvRef.current?.id === updated.id) {
          setActiveConv((prev) => prev ? {
            ...prev,
            name: updated.name ?? prev.name,
            lastMessage: updated.last_message ?? prev.lastMessage,
            timestamp: updated.updated_at ? new Date(updated.updated_at).getTime() : prev.timestamp,
            time: updated.updated_at ? new Date(updated.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : prev.time,
          } : prev);
        }
      })
      .subscribe();

    const participantChannel = supabase
      .channel(`chat_participants_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_participants',
        filter: `profile_id=eq.${user.id}`,
      }, async () => {
        await refreshConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(participantChannel);
    };
  }, [user, refreshConversations]);

  // Real-time listener for active conversation
  useEffect(() => {
    if (!activeConv || !user) return;

    const channel = supabase
      .channel(`chat_${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, (payload) => {
        const m = payload.new;
        setMessages((prev) => {
          if (prev.some((message) => message.id === m.id)) return prev;

          return [...prev, {
            id: m.id,
            from: m.sender_id === user.id ? 'me' : 'them',
            text: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            senderName: m.sender_id === user.id ? user.name : (activeConv.isGroup ? activeConv.participants?.find(p => p.id === m.sender_id)?.name || 'Member' : undefined),
          }];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv, user]);

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !user) return;
    
    const text = input.trim();
    setInput('');

    const { data: insertedMessage, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: activeConv.id,
        sender_id: user.id,
        content: text
      }])
      .select('id, content, created_at, sender_id')
      .single();

    if (!error && insertedMessage) {
      setMessages((prev) => {
        if (prev.some((message) => message.id === insertedMessage.id)) return prev;
        return [...prev, {
          id: insertedMessage.id,
          from: 'me',
          text: insertedMessage.content,
          time: new Date(insertedMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          senderName: user.name,
        }];
      });

      // Update conversation's last message time
      await supabase
        .from('conversations')
        .update({ last_message: text, updated_at: new Date().toISOString() })
        .eq('id', activeConv.id);
        
      // Update local state for sidebar
      setConversations(prev => prev.map(c => 
        c.id === activeConv.id 
          ? { ...c, lastMessage: text, time: 'Just now', timestamp: Date.now() } 
          : c
      ).sort((a, b) => b.timestamp - a.timestamp));
    } else {
      setInput(text);
      showToast('Failed to send message.', { type: 'error' });
    }
  };

  const filteredConvs = conversations.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  };

  if (!user) return <div className="text-center py-20">Please log in to view messages.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Messages</h1>

      <div className="flex h-[calc(100vh-220px)] min-h-[500px] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex-1">Conversations</h2>
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                title="New Conversation"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="input-field pl-9 text-sm bg-slate-50"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading messages...</div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No conversations yet. Connect with a developer to start chatting!
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConv(conv)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-slate-100 ${
                    activeConv?.id === conv.id ? 'bg-slate-50 border-l-2 border-l-cyan-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-xs font-semibold">
                      {getInitials(conv.name)}
                    </div>
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">{conv.name}</span>
                      <span className="text-xs text-slate-400">{conv.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.lastMessage || 'No messages yet'}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="bg-cyan-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-slate-50/50">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare size={48} className="mb-4 text-slate-200" />
              <p className="font-medium text-slate-500">Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                      {getInitials(activeConv.name)}
                    </div>
                    {activeConv.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{activeConv.name}</p>
                    <p className="text-xs text-slate-500">
                      {activeConv.isGroup && activeConv.participants 
                        ? activeConv.participants.map(p => p.name).join(', ') 
                        : (activeConv.online ? 'Online' : 'Offline')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative" ref={optionsRef}>
                  <button 
                    onClick={() => setShowOptions(!showOptions)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {showOptions && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                      {activeConv.isGroup && (
                        <>
                          <button 
                            onClick={() => {
                              showToast("Group photo uploads will be available soon!", { type: 'info' });
                              setShowOptions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-slate-100"
                          >
                            Change Group Photo
                          </button>
                          <button 
                            onClick={() => {
                              setNewGroupName(activeConv.name);
                              setShowRenameModal(true);
                              setShowOptions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-slate-100"
                          >
                            Change Group Name
                          </button>
                        </>
                      )}
                      <button 
                        onClick={handleDeleteChat}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        Delete Conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-slate-50/50">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm mt-10">
                    Send a message to start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md`}>
                        {msg.from === 'them' && activeConv.isGroup && (
                          <p className="text-xs text-slate-500 mb-1 ml-1">{msg.senderName}</p>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-[16px] text-sm shadow-sm ${
                            msg.from === 'me'
                              ? 'bg-slate-900 text-white rounded-br-sm'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <p className={`text-xs text-slate-400 mt-1 ${msg.from === 'me' ? 'text-right' : 'text-left'}`}>
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-slate-200 bg-white relative">
                {showEmojiPicker && (
                  <div className="absolute bottom-[80px] right-20 z-50 shadow-2xl rounded-lg" ref={emojiPickerRef}>
                    <EmojiPicker 
                      onEmojiClick={(emojiObject) => {
                        setInput(prev => prev + emojiObject.emoji);
                      }} 
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button 
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => showToast('File sharing will be available soon!', { type: 'info' })}
                    title="Attach file"
                  >
                    <Paperclip size={20} />
                  </button>
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        sendMessage();
                        setShowEmojiPicker(false);
                      }
                    }}
                  />
                  <button 
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Add emoji"
                  >
                    <Smile size={20} />
                  </button>
                  <button
                    onClick={() => {
                      sendMessage();
                      setShowEmojiPicker(false);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white p-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rename Group Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Rename Group</h3>
              <input
                type="text"
                className="input-field w-full mb-6"
                placeholder="Enter new group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGroupName.trim() !== '') {
                    handleRenameGroup(newGroupName.trim());
                    setShowRenameModal(false);
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newGroupName.trim() !== '') {
                      handleRenameGroup(newGroupName.trim());
                      setShowRenameModal(false);
                    }
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors font-medium shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">New Conversation</h3>
              <button 
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="input-field pl-9 text-sm"
                  placeholder="Search students by name..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {searchingUsers ? (
                <div className="flex justify-center p-8 text-cyan-600">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : globalUsers.length === 0 ? (
                <div className="text-center p-8 text-sm text-slate-500">
                  No users found.
                </div>
              ) : (
                globalUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setShowNewChatModal(false);
                      setGlobalSearch('');
                      startNewChat(u.id);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-xs font-semibold shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.department || 'Student'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
