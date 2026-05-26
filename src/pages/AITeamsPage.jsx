import { useMemo, useState } from 'react';
import { Lightbulb, Plus, X } from 'lucide-react';
import AITeamRecommender from '../components/AITeamRecommender';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SKILLS = ['React', 'Python', 'UI Design', 'Machine Learning', 'Node', 'Supabase'];

export default function AITeamsPage() {
  const { user } = useAuth();
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    skillInput: '',
    skills: ['React', 'Supabase'],
    teamSize: 4,
  });

  const projectContext = useMemo(() => ({
    title: projectForm.title || 'New student project',
    description: projectForm.description,
    skills: projectForm.skills,
  }), [projectForm.description, projectForm.skills, projectForm.title]);

  const addSkill = (skill) => {
    const clean = skill.trim();
    if (!clean || projectForm.skills.some((item) => item.toLowerCase() === clean.toLowerCase())) return;
    setProjectForm((current) => ({
      ...current,
      skills: [...current.skills, clean],
      skillInput: '',
    }));
  };

  const removeSkill = (skill) => {
    setProjectForm((current) => ({
      ...current,
      skills: current.skills.filter((item) => item !== skill),
    }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 bg-dark min-h-screen">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.5rem] border border-dark-border bg-dark-card p-6 shadow-none">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-muted text-accent">
              <Lightbulb size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white text-xl">Project details</h2>
              <p className="text-sm text-gray-400">The matcher updates as you edit.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-300">Project title</label>
              <input
                className="input-field"
                placeholder="e.g. AI attendance assistant"
                value={projectForm.title}
                onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-300">Project description</label>
              <textarea
                className="input-field min-h-[140px] resize-none"
                placeholder="What are you building, and what kind of teammates would help?"
                value={projectForm.description}
                onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-300">Required skills</label>
              <div className="rounded-2xl border border-dark-border bg-dark-surface p-3">
                <div className="mb-3 flex flex-wrap gap-2">
                  {projectForm.skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="rounded-full p-0.5 hover:bg-black/20" aria-label={`Remove ${skill}`}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white outline-none"
                    placeholder="Add a skill..."
                    value={projectForm.skillInput}
                    onChange={(event) => setProjectForm({ ...projectForm, skillInput: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSkill(projectForm.skillInput);
                      }
                    }}
                  />
                  <button onClick={() => addSkill(projectForm.skillInput)} className="rounded-xl bg-accent px-3 py-2 text-black font-semibold hover:bg-accent-purple" aria-label="Add skill">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEFAULT_SKILLS.filter((skill) => !projectForm.skills.includes(skill)).map((skill) => (
                  <button
                    key={skill}
                    onClick={() => addSkill(skill)}
                    className="rounded-full border border-dark-border bg-dark-surface px-3 py-1 text-xs font-semibold text-gray-400 hover:border-accent hover:text-accent transition-colors"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-300">Team size</label>
              <input
                type="range"
                min="2"
                max="6"
                value={projectForm.teamSize}
                onChange={(event) => setProjectForm({ ...projectForm, teamSize: Number(event.target.value) })}
                className="w-full accent-accent"
              />
              <p className="mt-1 text-sm font-semibold text-gray-300">{projectForm.teamSize} members including you</p>
            </div>
          </div>
        </section>

        <AITeamRecommender
          user={user}
          contextType="project"
          project={projectContext}
          teamSize={projectForm.teamSize}
        />
      </div>
    </div>
  );
}
