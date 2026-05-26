import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, Check, Loader2, MessageSquare, Sparkles, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { buildSuggestedTeam, extractSkillSignals, recommendStudents } from '../lib/aiTeamMatcher';
import { useToast } from '../context/ToastContext';

function initials(name) {
  return String(name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function toProfile(profile) {
  return {
    ...profile,
    projects: profile.projects?.length || 0,
    skills: profile.skills || [],
    available: profile.available !== false,
  };
}

export default function AITeamRecommender({
  user,
  contextType,
  event = null,
  project = null,
  teamSize = 4,
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdTeam, setCreatedTeam] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');

  const requiredSkills = useMemo(() => {
    if (contextType === 'event') {
      return extractSkillSignals({
        title: event?.title,
        category: event?.category,
        description: event?.description,
        tags: event?.tags || [],
        explicitSkills: event?.required_skills || [],
      });
    }

    // For projects, only use explicit skills from the Required skills section
    return project?.skills || [];
  }, [contextType, event, project]);

  const recommendations = useMemo(
    () => recommendStudents(students, user, requiredSkills, 10),
    [students, user, requiredSkills]
  );

  const suggestedTeam = useMemo(
    () => buildSuggestedTeam(recommendations, user, requiredSkills, teamSize),
    [recommendations, requiredSkills, teamSize, user]
  );

  useEffect(() => {
    setSelectedIds(suggestedTeam.members.map((member) => member.id));
  }, [suggestedTeam.members.map((member) => member.id).join('|')]);

  useEffect(() => {
    async function fetchAvailableStudents() {
      if (!user) return;
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*, projects(id)')
        .eq('role', 'student')
        .eq('available', true);

      if (fetchError) {
        setError('Could not load available students. Please confirm the profiles.available column exists in Supabase.');
        setLoading(false);
        return;
      }

      setStudents((data || []).map(toProfile).filter((profile) => profile.id !== user.id));
      setLoading(false);
    }

    fetchAvailableStudents();
  }, [user]);

  const selectedMembers = recommendations.filter((student) => selectedIds.includes(student.id));

  const toggleMember = (studentId) => {
    setSelectedIds((current) => {
      if (current.includes(studentId)) return current.filter((id) => id !== studentId);
      if (current.length >= Math.max(teamSize - 1, 1)) return current;
      return [...current, studentId];
    });
  };

  const handleConnect = async (studentId, studentName) => {
    if (!user) return;
    try {
      const { data: existingRequest, error: checkError } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('recipient_id', studentId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          showToast('You already sent a connection request.', { type: 'warning' });
        } else if (existingRequest.status === 'accepted') {
          showToast('You are already connected.', { type: 'info' });
        }
        return;
      }

      const { error: insertError } = await supabase.from('connection_requests').insert([{
        requester_id: user.id,
        recipient_id: studentId,
        status: 'pending',
      }]);

      if (insertError) throw insertError;

      const senderName = user.name || user.email || 'Someone';
      await supabase.from('notifications').insert([{
        profile_id: studentId,
        title: 'Connection request',
        message: `${senderName} wants to connect with you.`,
        link: `/profile/${user.id}`,
        is_read: false,
      }]);

      showToast(`Connection request sent to ${studentName}.`, { type: 'success' });
    } catch (err) {
      console.error('Error sending connection request:', err);
      showToast('Failed to send connection request.', { type: 'error' });
    }
  };

  const createTeam = async () => {
    if (!user || selectedMembers.length === 0) return;
    setCreating(true);
    setError('');

    const teamName =
      contextType === 'event'
        ? `${event?.title || 'Event'} team`
        : `${project?.title || 'Project'} team`;

    const firstMessage =
      contextType === 'event'
        ? `Team created for ${event?.title || 'this event'}. Suggested skills: ${requiredSkills.join(', ') || 'general collaboration'}.`
        : `Team created for ${project?.title || 'this project'}. Suggested skills: ${requiredSkills.join(', ') || 'general collaboration'}.`;

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert([{
        name: teamName,
        is_group: true,
        last_message: firstMessage,
        created_by: user.id,
      }])
      .select()
      .single();

    if (conversationError) {
      setError('Could not create the group chat. Please check your existing chat table permissions.');
      setCreating(false);
      return;
    }

    const participantRows = [
      { conversation_id: conversation.id, profile_id: user.id },
      ...selectedMembers.map((member) => ({
        conversation_id: conversation.id,
        profile_id: member.id,
      })),
    ];

    const { error: participantsError } = await supabase.from('conversation_participants').insert(participantRows);

    if (participantsError) {
      setError('Group chat was created, but members could not be added.');
      setCreating(false);
      return;
    }

    await supabase.from('messages').insert([{
      conversation_id: conversation.id,
      sender_id: user.id,
      content: firstMessage,
    }]);

    await supabase.from('notifications').insert(
      selectedMembers.map((member) => ({
        profile_id: member.id,
        title: 'New team group chat',
        message: `${user.name || 'A student'} added you to ${teamName}.`,
        link: '/chat',
      }))
    );

    setCreatedTeam(conversation);
    setCreating(false);
    navigate('/chat', { state: { conversationId: conversation.id } });
  };

  if (!user) return null;

  return (
    <section className="rounded-[1.5rem] bg-transparent p-5 shadow-none border border-transparent">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">Recommended teammates</h3>
          <p className="text-sm leading-6 text-gray-400">
            Based on your project requirements and tech stack.
          </p>
        </div>
        <div className="rounded-2xl border border-dark-border bg-dark-card px-3 py-2 text-center text-white">
          <p className="text-lg font-black">{suggestedTeam.coverage}%</p>
          <p className="text-[10px] uppercase tracking-wide text-accent">coverage</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {requiredSkills.length > 0 ? (
            requiredSkills.map((skill) => (
              <span key={skill} className="badge bg-accent-muted text-accent border border-accent">
                {skill}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500">Add event tags or project skills for stronger matches.</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-900 bg-red-900/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {createdTeam && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-green-900 bg-green-900/40 px-4 py-3 text-sm font-semibold text-green-200">
          <Check size={17} /> Team created and invitations sent.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-accent">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dark-border bg-dark-surface px-4 py-8 text-center">
          <Users className="mx-auto mb-2 text-gray-500" size={30} />
          <p className="font-semibold text-gray-300">No available matches yet</p>
          <p className="mt-1 text-sm text-gray-500">Ask students to update their skills and set their status to available.</p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '450px' }}>
          {recommendations.map((student) => {
            const selected = selectedIds.includes(student.id);
            return (
              <div
                key={student.id}
                className={`rounded-2xl border p-5 transition ${
                  selected ? 'border-accent bg-accent-muted/40' : 'border-dark-border bg-dark-card'
                }`}
              >
                <div className="flex items-start gap-4">
                  {student.avatar ? (
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full object-cover ring-2 ring-dark-surface"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent-muted text-lg font-bold text-accent ring-2 ring-dark-surface">
                      {initials(student.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-bold text-white">{student.name}</h4>
                      <span className="badge bg-accent-mutedGreen text-accent-green border border-accent-green/30">Available Now</span>
                      <span className="badge bg-dark-surface text-accent-green border border-dark-border">{student.score}% Match</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {[student.department, student.year].filter(Boolean).join(' • ') || 'Student'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(student.matchedSkills.length ? student.matchedSkills : student.skills.slice(0, 4)).map((skill) => (
                        <span key={skill} className="badge bg-dark-surface text-gray-300 border border-dark-border">
                          {skill}
                        </span>
                      ))}
                    </div>
                    {student.reasons.length > 0 && (
                      <p className="mt-4 text-xs leading-5 text-gray-500 line-clamp-2">
                        {student.reasons.join(' | ')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toggleMember(student.id)}
                      className={`btn-primary flex justify-center w-[120px] py-2 text-sm ${
                        selected ? 'bg-accent-green text-black hover:bg-accent-greenHover' : 'bg-accent text-black hover:bg-accent-purple'
                      }`}
                    >
                      {selected ? 'Added' : 'Add'}
                    </button>
                    <button
                      onClick={() => handleConnect(student.id, student.name)}
                      className="btn-secondary flex justify-center w-[120px] py-2 text-sm"
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => navigate(`/profile/${student.id}`)}
                      className="btn-secondary flex justify-center w-[120px] py-2 text-sm"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedMembers.length > 0 && (
        <div className="mt-5 rounded-2xl border border-dark-border bg-dark-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white">{selectedMembers.length + 1} member team</p>
              <p className="text-xs text-gray-400">
                You plus {selectedMembers.map((member) => member.name).join(', ')}
              </p>
            </div>
            <button
              onClick={createTeam}
              disabled={creating}
              className="btn-primary flex items-center gap-2 px-5 py-2 text-sm bg-accent-green text-black hover:bg-accent-greenHover"
            >
              {creating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              Create Team
            </button>
          </div>
          {suggestedTeam.missingSkills.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-orange-900/40 px-3 py-2 text-xs text-orange-400">
              <X size={14} className="mt-0.5 flex-shrink-0" />
              Still missing: {suggestedTeam.missingSkills.join(', ')}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
