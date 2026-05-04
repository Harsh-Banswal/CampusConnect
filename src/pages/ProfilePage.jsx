import { useState, useEffect } from 'react';
import { Github, Linkedin, Edit3, Plus, Trash2, Code2, Briefcase, Mail, X, Upload, Loader, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { uploadFile, deleteFile } from '../lib/uploadService';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [newSkill, setNewSkill] = useState('');
  const [editBio, setEditBio] = useState(false);
  const [tempBio, setTempBio] = useState('');

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ title: '', tech: '', description: '', link: '' });
  const [savingProject, setSavingProject] = useState(false);

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', role: '', description: '', date: '' });
  const [savingEvent, setSavingEvent] = useState(false);
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showGithubImportModal, setShowGithubImportModal] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [githubRepos, setGithubRepos] = useState([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [importingRepos, setImportingRepos] = useState(false);

  useEffect(() => {
    if (showGithubImportModal && profile?.github) {
      try {
        const url = new URL(profile.github);
        if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
           const pathParts = url.pathname.split('/').filter(Boolean);
           if (pathParts.length > 0) {
             setGithubUsername(pathParts[0]);
           }
        }
      } catch (e) {
        // Invalid URL, leave empty
      }
    }
  }, [showGithubImportModal, profile?.github]);

  const handleFetchRepos = async () => {
    if (!githubUsername) return;
    setFetchingRepos(true);
    setGithubRepos([]);
    try {
      const res = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=15`);
      if (!res.ok) throw new Error('User not found or API error');
      const data = await res.json();
      setGithubRepos(data.filter(repo => !repo.fork));
    } catch (err) {
      showToast('Failed to fetch repositories. Check username.', { type: 'error' });
    } finally {
      setFetchingRepos(false);
    }
  };

  const handleImportSelectedRepos = async () => {
    if (selectedRepos.length === 0) return;
    setImportingRepos(true);
    
    const reposToImport = githubRepos.filter(repo => selectedRepos.includes(repo.id));
    
    const newProjects = reposToImport.map(repo => ({
       profile_id: user.id,
       title: repo.name,
       tech: repo.language || '',
       description: repo.description || '',
       link: repo.html_url || ''
    }));

    const { data, error } = await supabase.from('projects').insert(newProjects).select();

    if (!error && data) {
       setProfile({ ...profile, projects: [...data, ...profile.projects] });
       setShowGithubImportModal(false);
       setSelectedRepos([]);
       showToast('Projects imported successfully!', { type: 'success' });
    } else {
       console.error("Supabase insert error:", error);
       if (error?.message?.includes('link')) {
           showToast('Database error: Please run the SQL command in Supabase to add the link column first.', { type: 'error' });
       } else {
           showToast(`Failed to import projects: ${error?.message || 'Unknown error'}`, { type: 'error' });
       }
    }
    setImportingRepos(false);
  };

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*, projects(*), past_events(*)')
        .eq('id', user.id)
        .single();
        
      if (data && !error) {
        setProfile({
          ...data,
          projects: data.projects || [],
          past_events: data.past_events || [],
          skills: data.skills || []
        });
        setTempBio(data.bio || '');
        setSettingsForm({
           name: data.name || '',
           department: data.department || '',
           year: data.year || '',
           enrollment_no: data.enrollment_no || '',
           github: data.github || '',
           linkedin: data.linkedin || '',
           available: data.available !== false // defaults to true if undefined
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, [user]);

  const saveBio = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ bio: tempBio }).eq('id', user.id);
    if (!error) {
       setProfile({ ...profile, bio: tempBio });
       setEditBio(false);
    } else {
       showToast('Failed to update bio.', { type: 'error' });
    }
  };

  const addSkill = async () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      const updatedSkills = [...profile.skills, newSkill.trim()];
      const { error } = await supabase.from('profiles').update({ skills: updatedSkills }).eq('id', user.id);
      if (!error) {
        setProfile({ ...profile, skills: updatedSkills });
        setNewSkill('');
      } else {
        showToast('Failed to add skill.', { type: 'error' });
      }
    }
  };

  const removeSkill = async (s) => {
    const updatedSkills = profile.skills.filter((x) => x !== s);
    const { error } = await supabase.from('profiles').update({ skills: updatedSkills }).eq('id', user.id);
    if (!error) setProfile({ ...profile, skills: updatedSkills });
  };

  const handleSaveSettings = async (e) => {
     e.preventDefault();
     setSavingSettings(true);
     const { error } = await supabase.from('profiles').update(settingsForm).eq('id', user.id);
     if (!error) {
       setProfile({ ...profile, ...settingsForm });
       setShowSettingsModal(false);
     } else {
       showToast('Failed to update profile settings.', { type: 'error' });
     }
     setSavingSettings(false);
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!projectForm.title) return;
    setSavingProject(true);

    const { data, error } = await supabase.from('projects').insert([{
       profile_id: user.id,
       title: projectForm.title,
       tech: projectForm.tech,
       description: projectForm.description,
       link: projectForm.link || null
    }]).select();

    if (!error && data) {
       setProfile({ ...profile, projects: [data[0], ...profile.projects] });
       setShowProjectModal(false);
       setProjectForm({ title: '', tech: '', description: '', link: '' });
    } else {
       console.error("Supabase insert error:", error);
       if (error?.message?.includes('link')) {
           showToast('Database error: Please run the SQL command in Supabase to add the link column first.', { type: 'error' });
       } else {
           showToast(`Failed to add project: ${error?.message || 'Unknown error'}`, { type: 'error' });
       }
    }
    setSavingProject(false);
  };

  const handleDeleteProject = async (projectId) => {
     const { error } = await supabase.from('projects').delete().eq('id', projectId);
     if (!error) {
        setProfile({ ...profile, projects: profile.projects.filter(p => p.id !== projectId) });
     }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title) return;
    setSavingEvent(true);

    const { data, error } = await supabase.from('past_events').insert([{
       profile_id: user.id,
       title: eventForm.title,
       role: eventForm.role,
       description: eventForm.description,
       date: eventForm.date
    }]).select();

    if (!error && data) {
       setProfile({ ...profile, past_events: [data[0], ...profile.past_events] });
       setShowEventModal(false);
       setEventForm({ title: '', role: '', description: '', date: '' });
    } else {
       console.error("Supabase insert error:", error);
       showToast(`Failed to add event: ${error?.message || 'Unknown error'}`, { type: 'error' });
    }
    setSavingEvent(false);
  };

  const handleDeleteEvent = async (eventId) => {
     const { error } = await supabase.from('past_events').delete().eq('id', eventId);
     if (!error) {
        setProfile({ ...profile, past_events: profile.past_events.filter(e => e.id !== eventId) });
     }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const { url, error } = await uploadFile(file, 'profile-photos', user.id);

    if (error) {
      showToast(`Upload failed: ${error}`, { type: 'error' });
    } else {
      // Delete old avatar if exists
      if (profile.avatar) {
        await deleteFile(profile.avatar, 'profile-photos');
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: url })
        .eq('id', user.id);

      if (updateError) {
        showToast('Failed to update profile', { type: 'error' });
      } else {
        setProfile({ ...profile, avatar: url });
        showToast('Profile photo updated!', { type: 'success' });
      }
    }

    setUploadingAvatar(false);
    e.target.value = ''; // Reset input
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    // Call the postgres function to delete the user auth record
    const { error } = await supabase.rpc('delete_user');
    
    if (error) {
      showToast('Failed to delete account. Please try again.', { type: 'error' });
      setIsDeletingAccount(false);
    } else {
      // Sign out and redirect
      await supabase.auth.signOut();
      showToast('Account deleted successfully.', { type: 'success' });
      navigate('/');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!profile) {
    return <div className="text-center py-32 text-gray-500">Profile could not be loaded. Ensure your record exists.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="card p-6 text-center shadow-sm">
            <div className="relative inline-block mb-3 group">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full mx-auto object-cover ring-4 ring-blue-50" />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto bg-blue-600 text-white flex items-center justify-center text-3xl font-bold ring-4 ring-blue-50">
                  {profile.name?.charAt(0) || 'U'}
                </div>
              )}
              <label className={`absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg ${uploadingAvatar ? 'opacity-70' : ''}`}>
                {uploadingAvatar ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{profile.name}</h2>
            <p className="text-blue-600 font-medium text-sm capitalize mt-1">{profile.role?.replace('_', ' ')}</p>
            <p className="text-gray-500 text-xs mt-1">{profile.department} {profile.year ? `• ${profile.year}` : ''}</p>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mt-3">
              <Mail size={13} className="text-gray-400" /> {profile.email}
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Enrollment No.</p>
              <p className="mt-1 text-sm font-bold text-gray-900 break-all">
                {profile.enrollment_no || 'Not added yet'}
              </p>
            </div>

            <div className="flex justify-center gap-4 mt-5 pt-4 border-t border-gray-100">
              <a href={profile.github || '#'} target="_blank" rel="noreferrer" className={`text-gray-400 hover:text-gray-900 transition-colors ${!profile.github && 'opacity-30 cursor-not-allowed'}`}>
                <Github size={20} />
              </a>
              <a href={profile.linkedin || '#'} target="_blank" rel="noreferrer" className={`text-gray-400 hover:text-blue-600 transition-colors ${!profile.linkedin && 'opacity-30 cursor-not-allowed'}`}>
                <Linkedin size={20} />
              </a>
            </div>
            <button onClick={() => setShowSettingsModal(true)} className="btn-secondary w-full mt-5 text-sm flex items-center justify-center gap-1.5">
              <Edit3 size={15} /> Edit Settings
            </button>
          </div>

          <div className="card p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Activity Highlights</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <div className="p-1.5 bg-blue-50 rounded-lg"><Code2 size={15} className="text-blue-500" /></div> Projects
                </div>
                <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md">{profile.projects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <div className="p-1.5 bg-purple-50 rounded-lg"><Briefcase size={15} className="text-purple-500" /></div> Events
                </div>
                <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md">{profile.past_events?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 space-y-5">
          <div className="card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">About Me</h3>
              {editBio ? (
                 <div className="flex gap-2">
                   <button onClick={() => setEditBio(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2">Cancel</button>
                   <button onClick={saveBio} className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-md font-semibold transition-colors">Save</button>
                 </div>
              ) : (
                <button onClick={() => setEditBio(true)} className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1.5">
                  <Edit3 size={14} /> Edit
                </button>
              )}
            </div>
            {editBio ? (
              <textarea
                className="input-field min-h-[100px] resize-none focus:ring-blue-500 text-sm"
                value={tempBio}
                placeholder="Write a little bit about yourself, your interests, and your goals..."
                onChange={(e) => setTempBio(e.target.value)}
                autoFocus
              />
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{profile.bio || "No bio added yet. Click edit to introduce yourself!"}</p>
            )}
          </div>

          <div className="card p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-5">Skills & Expertise</h3>
            <div className="flex flex-wrap gap-2 mb-5">
              {profile.skills.length === 0 && <p className="text-sm text-gray-400 w-full mb-1">Add some skills to stand out to developers and clubs.</p>}
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="badge bg-blue-50 border border-blue-100 text-blue-700 flex items-center gap-1.5 text-sm px-3 py-1.5 shadow-sm"
                >
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="ml-1 text-blue-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                className="input-field flex-1 text-sm bg-gray-50"
                placeholder="e.g. React, Python, UI Design..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
              />
              <button onClick={addSkill} className="btn-primary rounded-lg flex items-center gap-1.5 px-5 shadow-sm">
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          <div className="card p-6 shadow-sm border-t-4 border-t-indigo-500">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900">Projects & Portfolio</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowGithubImportModal(true)} className="text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors shadow-sm border border-gray-200">
                  <Github size={14} /> Import
                </button>
                <button onClick={() => setShowProjectModal(true)} className="text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors shadow-sm">
                  <Plus size={15} /> Add Project
                </button>
              </div>
            </div>
            
            {profile.projects.length === 0 ? (
               <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                 <Code2 size={32} className="mx-auto text-gray-300 mb-2" />
                 <p className="text-sm text-gray-500 font-medium">No projects added yet.</p>
                 <p className="text-xs text-gray-400 mt-1">Showcase your hackathons or side projects here!</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {profile.projects.map((project) => (
                  <div key={project.id} className="group border border-gray-200 bg-white rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all relative">
                    <button onClick={() => handleDeleteProject(project.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-start justify-between pr-6">
                      <h4 className="font-bold text-gray-900 text-base flex-1">
                        {project.link ? (
                          <a href={project.link} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 w-fit">
                            {project.title} <ExternalLink size={14} className="text-gray-400" />
                          </a>
                        ) : project.title}
                      </h4>
                    </div>
                    {project.tech && <span className="inline-block bg-gray-100 text-gray-700 mt-2.5 text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider">{project.tech}</span>}
                    <p className="text-sm text-gray-600 mt-3 line-clamp-3 leading-relaxed">{project.description}</p>
                  </div>
                ))}
            </div>
            )}
          </div>
          <div className="card p-6 shadow-sm border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900">Past Events & Hackathons</h3>
              <button onClick={() => setShowEventModal(true)} className="text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors shadow-sm">
                <Plus size={15} /> Add Event
              </button>
            </div>
            
            {!profile.past_events || profile.past_events.length === 0 ? (
               <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                 <Briefcase size={32} className="mx-auto text-gray-300 mb-2" />
                 <p className="text-sm text-gray-500 font-medium">No events added yet.</p>
                 <p className="text-xs text-gray-400 mt-1">Share the hackathons or workshops you've attended!</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {profile.past_events.map((evt) => (
                  <div key={evt.id} className="group border border-gray-200 bg-white rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all relative">
                    <button onClick={() => handleDeleteEvent(evt.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                    <h4 className="font-bold text-gray-900 pr-6 text-base">{evt.title}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      {evt.role && <span className="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider">{evt.role}</span>}
                      {evt.date && <span className="text-xs text-gray-500 font-medium">{evt.date}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-3 leading-relaxed">{evt.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <h3 className="font-bold text-lg text-gray-900">Edit Profile Information</h3>
                 <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                   <input type="text" required className="input-field shadow-sm" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department</label>
                      <input type="text" className="input-field shadow-sm" value={settingsForm.department} onChange={e => setSettingsForm({...settingsForm, department: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Year</label>
                      <input type="text" className="input-field shadow-sm" value={settingsForm.year} onChange={e => setSettingsForm({...settingsForm, year: e.target.value})} />
                    </div>
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Enrollment Number</label>
                   <input type="text" className="input-field shadow-sm" placeholder="e.g. 12012345" value={settingsForm.enrollment_no || ''} onChange={e => setSettingsForm({...settingsForm, enrollment_no: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Github size={14}/> GitHub URL</label>
                      <input type="url" className="input-field shadow-sm bg-gray-50 text-sm" placeholder="https://github.com/..." value={settingsForm.github} onChange={e => setSettingsForm({...settingsForm, github: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Linkedin size={14} className="text-blue-600"/> LinkedIn URL</label>
                      <input type="url" className="input-field shadow-sm bg-gray-50 text-sm" placeholder="https://linkedin.com/..." value={settingsForm.linkedin} onChange={e => setSettingsForm({...settingsForm, linkedin: e.target.value})} />
                    </div>
                 </div>
                 <div className="pt-2">
                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-blue-600"
                       checked={settingsForm.available}
                       onChange={e => setSettingsForm({...settingsForm, available: e.target.checked})}
                     />
                     Available for hackathons and projects
                   </label>
                 </div>
                 <div className="pt-4 flex gap-3">
                   <button type="button" onClick={() => setShowSettingsModal(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                   <button type="submit" disabled={savingSettings} className="btn-primary flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200">{savingSettings ? 'Saving...' : 'Save Changes'}</button>
                 </div>
                 
                 <div className="pt-6 mt-4 border-t border-red-100">
                    <h4 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h4>
                    <p className="text-xs text-gray-500 mb-3">Permanently delete your account and all associated data.</p>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowSettingsModal(false);
                        setShowDeleteModal(true);
                      }}
                      disabled={isDeletingAccount}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isDeletingAccount ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Code2 size={18} className="text-indigo-600"/> Add New Project</h3>
                 <button onClick={() => setShowProjectModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddProject} className="p-6 space-y-4">
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Title *</label>
                   <input type="text" required className="input-field shadow-sm" placeholder="e.g. AI Study Assistant" value={projectForm.title} onChange={e => setProjectForm({...projectForm, title: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Technologies Used</label>
                   <input type="text" className="input-field shadow-sm text-sm" placeholder="e.g. React, Node.js, Tailwind" value={projectForm.tech} onChange={e => setProjectForm({...projectForm, tech: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                   <textarea className="input-field min-h-[100px] resize-none shadow-sm text-sm" placeholder="What does it do? What was your role?" value={projectForm.description} onChange={e => setProjectForm({...projectForm, description: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Link (Optional)</label>
                   <input type="url" className="input-field shadow-sm text-sm" placeholder="https://github.com/... or live demo" value={projectForm.link} onChange={e => setProjectForm({...projectForm, link: e.target.value})} />
                 </div>
                 
                 <div className="pt-2 flex gap-3">
                   <button type="button" onClick={() => setShowProjectModal(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                   <button type="submit" disabled={savingProject} className="btn-primary flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200">{savingProject ? 'Adding...' : 'Add Project'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}
      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Briefcase size={18} className="text-emerald-600"/> Add Past Event</h3>
                 <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Name *</label>
                   <input type="text" required className="input-field shadow-sm text-sm" placeholder="e.g. Hacktoberfest 2023" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Role</label>
                     <input type="text" className="input-field shadow-sm text-sm" placeholder="e.g. Participant, Winner" value={eventForm.role} onChange={e => setEventForm({...eventForm, role: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date / Year</label>
                     <input type="text" className="input-field shadow-sm text-sm" placeholder="e.g. Oct 2023" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} />
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                   <textarea className="input-field min-h-[80px] resize-none shadow-sm text-sm" placeholder="What did you do or learn?" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} />
                 </div>
                 
                 <div className="pt-2 flex gap-3">
                   <button type="button" onClick={() => setShowEventModal(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                   <button type="submit" disabled={savingEvent} className="btn-primary flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200">{savingEvent ? 'Adding...' : 'Add Event'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* GitHub Import Modal */}
      {showGithubImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Github size={18}/> Import from GitHub</h3>
                 <button onClick={() => {setShowGithubImportModal(false); setGithubRepos([]); setSelectedRepos([]);}} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    className="input-field flex-1 text-sm shadow-sm" 
                    placeholder="GitHub Username" 
                    value={githubUsername} 
                    onChange={e => setGithubUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFetchRepos()}
                  />
                  <button 
                    onClick={handleFetchRepos} 
                    disabled={fetchingRepos || !githubUsername} 
                    className="btn-primary bg-gray-800 hover:bg-gray-900 px-4 shadow-sm"
                  >
                    {fetchingRepos ? <Loader size={16} className="animate-spin" /> : 'Fetch'}
                  </button>
                </div>
                
                {githubRepos.length > 0 && (
                  <div className="space-y-2 mt-4 max-h-[40vh] overflow-y-auto pr-2">
                    <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Select Repositories to Import</p>
                    {githubRepos.map(repo => (
                      <label key={repo.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedRepos.includes(repo.id) ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                         <input 
                           type="checkbox" 
                           className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-blue-600"
                           checked={selectedRepos.includes(repo.id)}
                           onChange={(e) => {
                             if (e.target.checked) setSelectedRepos([...selectedRepos, repo.id]);
                             else setSelectedRepos(selectedRepos.filter(id => id !== repo.id));
                           }}
                         />
                         <div>
                           <p className="text-sm font-bold text-gray-900">{repo.name}</p>
                           {repo.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{repo.description}</p>}
                           {repo.language && <span className="inline-block mt-2 text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{repo.language}</span>}
                         </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-100 flex gap-3 bg-white">
                <button type="button" onClick={() => {setShowGithubImportModal(false); setGithubRepos([]); setSelectedRepos([]);}} className="btn-secondary flex-1 py-2.5">Cancel</button>
                <button 
                  type="button" 
                  onClick={handleImportSelectedRepos}
                  disabled={importingRepos || selectedRepos.length === 0} 
                  className="btn-primary flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {importingRepos ? 'Importing...' : `Import Selected (${selectedRepos.length})`}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                 <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
                    <AlertTriangle size={24} />
                 </div>
                 <h3 className="font-bold text-xl text-gray-900 mb-2">Delete Account</h3>
                 <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.</p>
                 <div className="flex gap-3">
                   <button type="button" onClick={() => setShowDeleteModal(false)} disabled={isDeletingAccount} className="btn-secondary flex-1 py-2.5">Cancel</button>
                   <button type="button" onClick={handleDeleteAccount} disabled={isDeletingAccount} className="btn-primary flex-1 py-2.5 bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200">
                     {isDeletingAccount ? <Loader size={16} className="animate-spin mx-auto" /> : 'Yes, Delete'}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
