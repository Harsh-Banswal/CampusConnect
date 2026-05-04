import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, Check, Loader2, MessageSquare, Sparkles, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { buildSuggestedTeam, extractSkillSignals, recommendStudents } from '../lib/aiTeamMatcher';

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
    <section className="rounded-[1.5rem] border border-cyan-100 bg-white/95 p-5 shadow-xl shadow-slate-200/50">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
            <BrainCircuit size={14} /> Team Builder
          </div>
          <h3 className="mt-3 text-lg font-bold text-slate-900">Recommended teammates</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Ranked by required skills, complementary fit, availability, and project experience.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900 px-3 py-2 text-center text-white">
          <p className="text-lg font-black">{suggestedTeam.coverage}%</p>
          <p className="text-[10px] uppercase tracking-wide text-cyan-200">coverage</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Skills needed</p>
        <div className="flex flex-wrap gap-2">
          {requiredSkills.length > 0 ? (
            requiredSkills.map((skill) => (
              <span key={skill} className="badge bg-cyan-50 text-cyan-700 border border-cyan-100">
                {skill}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400">Add event tags or project skills for stronger matches.</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {createdTeam && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          <Check size={17} /> Team created and invitations sent.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-cyan-600">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <Users className="mx-auto mb-2 text-slate-300" size={30} />
          <p className="font-semibold text-slate-700">No available matches yet</p>
          <p className="mt-1 text-sm text-slate-400">Ask students to update their skills and set their status to available.</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '450px' }}>
          {recommendations.map((student) => {
            const selected = selectedIds.includes(student.id);
            return (
              <div
                key={student.id}
                className={`rounded-2xl border p-4 transition ${
                  selected ? 'border-cyan-300 bg-cyan-50/60' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleMember(student.id)}
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-md border ${
                      selected ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 bg-white text-transparent'
                    }`}
                    aria-label={selected ? 'Remove from team' : 'Add to team'}
                  >
                    <Check size={13} />
                  </button>
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {initials(student.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900">{student.name}</h4>
                      <span className="badge bg-green-100 text-green-700">Available</span>
                      <span className="badge bg-slate-100 text-slate-700">{student.score}% fit</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[student.department, student.year].filter(Boolean).join(' - ') || 'Student'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(student.matchedSkills.length ? student.matchedSkills : student.skills.slice(0, 4)).map((skill) => (
                        <span key={skill} className="badge bg-white text-cyan-700 border border-cyan-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                    {student.reasons.length > 0 && (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {student.reasons.join(' | ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/chat', { state: { startChatWith: student.id } })}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:border-cyan-200 hover:text-cyan-700"
                    aria-label={`Message ${student.name}`}
                  >
                    <MessageSquare size={17} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedMembers.length > 0 && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900">{selectedMembers.length + 1} member team</p>
              <p className="text-xs text-slate-500">
                You plus {selectedMembers.map((member) => member.name).join(', ')}
              </p>
            </div>
            <button
              onClick={createTeam}
              disabled={creating}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              {creating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              Create Team
            </button>
          </div>
          {suggestedTeam.missingSkills.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <X size={14} className="mt-0.5 flex-shrink-0" />
              Still missing: {suggestedTeam.missingSkills.join(', ')}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
