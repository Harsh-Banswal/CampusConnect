import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, SlidersHorizontal } from 'lucide-react';
import DeveloperCard from '../components/DeveloperCard';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PREDEFINED_BRANCHES = ['CSE', 'ECE', 'BIOTECH', 'BCA', 'BBA', 'IT', 'INTG IT', 'INTG CSE', 'INTG ECE', 'INTG BIOTECH'];
const PREDEFINED_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

export default function DevelopersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  
  // Advanced Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    availableOnly: false,
    minProjects: 0,
    minHackathons: 0,
    year: '',
    branch: '',
    skills: []
  });

  const [developers, setDevelopers] = useState([]);
  const [connectionStatusById, setConnectionStatusById] = useState({});
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tag input state
  const [skillInput, setSkillInput] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSkillDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchDevelopers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, projects(id)');

        if (error) throw error;
        
        const formattedDevs = data.map(profile => ({
          ...profile,
          role: profile.department || 'Student',
          hackathons: profile.hackathons_won || 0,
          projects: profile.projects?.length || 0, 
          available: profile.available !== false,
          skills: profile.skills || []
        }));

        setDevelopers(formattedDevs);

        const skillsSet = new Set();
        formattedDevs.forEach(dev => {
          if (dev.skills) dev.skills.forEach(skill => skillsSet.add(skill));
        });

        setAllSkills(Array.from(skillsSet).sort());
      } catch (err) {
        console.error('Error fetching developers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDevelopers();
  }, []);

  useEffect(() => {
    const fetchConnectionStatuses = async () => {
      if (!user) {
        setConnectionStatusById({});
        return;
      }

      const { data, error } = await supabase
        .from('connection_requests')
        .select('requester_id, recipient_id, status')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching connection statuses:', error);
        return;
      }

      const nextMap = {};
      for (const req of data || []) {
        const otherId = req.requester_id === user.id ? req.recipient_id : req.requester_id;

        if (req.status === 'accepted') {
          nextMap[otherId] = 'connected';
        } else if (req.status === 'pending') {
          nextMap[otherId] = req.requester_id === user.id ? 'outgoing_pending' : 'incoming_pending';
        } else if (req.status === 'rejected' && req.requester_id === user.id) {
          nextMap[otherId] = 'rejected_outgoing';
        }
      }

      setConnectionStatusById(nextMap);
    };

    fetchConnectionStatuses();
  }, [user]);

  const getConnectUiState = (devId) => {
    const state = connectionStatusById[devId];

    if (state === 'connected') return { label: 'Connected', disabled: true, tone: 'primary' };
    if (state === 'outgoing_pending') return { label: 'Cancel Request', disabled: false, tone: 'danger' };
    if (state === 'incoming_pending') return { label: 'Incoming Request', disabled: true, tone: 'primary' };
    if (state === 'rejected_outgoing') return { label: 'Request Rejected', disabled: true, tone: 'primary' };

    return { label: 'Connect', disabled: false, tone: 'primary' };
  };

  const handleCancelRequest = async (dev) => {
    if (!user || !dev) return;

    try {
      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('requester_id', user.id)
        .eq('recipient_id', dev.id)
        .eq('status', 'pending');

      if (error) throw error;

      setConnectionStatusById((prev) => {
        const next = { ...prev };
        delete next[dev.id];
        return next;
      });

      showToast(`Connection request to ${dev.name} canceled.`, { type: 'info' });
    } catch (err) {
      console.error('Error canceling connection request:', err);
      showToast(err?.message || 'Failed to cancel connection request.', { type: 'error' });
    }
  };

  const handleConnectAction = async (dev) => {
    const state = connectionStatusById[dev.id];
    if (state === 'outgoing_pending') {
      await handleCancelRequest(dev);
      return;
    }

    await handleConnect(dev);
  };

  const filtered = developers.filter((dev) => {
    if (user && dev.id === user.id) return false;

    const searchLower = search.toLowerCase();
    const matchSearch =
      (dev.name && dev.name.toLowerCase().includes(searchLower)) ||
      (dev.role && dev.role.toLowerCase().includes(searchLower)) ||
      (dev.bio && dev.bio.toLowerCase().includes(searchLower)) ||
      (dev.skills && dev.skills.some((s) => s.toLowerCase().includes(searchLower)));
    
    const matchAvail = !filters.availableOnly || dev.available;
    const matchProjects = (dev.projects || 0) >= filters.minProjects;
    const matchHackathons = (dev.hackathons || 0) >= filters.minHackathons;
    const matchYear = !filters.year || (dev.year && (dev.year.toLowerCase() === filters.year.toLowerCase() || dev.year.includes(filters.year[0])));
    const matchBranch = !filters.branch || (dev.department && dev.department.toLowerCase() === filters.branch.toLowerCase());
    
    // Skills must include all selected filters.skills
    const matchSkills = filters.skills.length === 0 || filters.skills.every(skill => 
      dev.skills && dev.skills.some(ds => ds.toLowerCase() === skill.toLowerCase())
    );

    return matchSearch && matchAvail && matchProjects && matchHackathons && matchYear && matchBranch && matchSkills;
  });

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.availableOnly) count++;
    if (filters.minProjects > 0) count++;
    if (filters.minHackathons > 0) count++;
    if (filters.year) count++;
    if (filters.branch) count++;
    count += filters.skills.length;
    return count;
  };

  const activeFiltersCount = getActiveFilterCount();

  const handleAddSkill = (skill) => {
    if (skill.trim() && !filters.skills.some(s => s.toLowerCase() === skill.trim().toLowerCase())) {
      setFilters({...filters, skills: [...filters.skills, skill.trim()]});
    }
    setSkillInput('');
    setShowSkillDropdown(false);
  };

  const handleConnect = async (dev) => {
    if (!user || !dev || dev.id === user.id) return;

    try {
      // Check if connection request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('recipient_id', dev.id)
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
        recipient_id: dev.id,
        status: 'pending',
      }]);

      if (insertError) throw insertError;

      // Send notification (best effort). A notification failure should not roll back a successful request.
      const senderName = user.name || user.email || 'Someone';
      const { error: notificationError } = await supabase.from('notifications').insert([{
        profile_id: dev.id,
        title: 'Connection request',
        message: `${senderName} wants to connect with you.`,
        link: `/profile/${user.id}`,
        is_read: false,
      }]);

      if (notificationError) {
        console.warn('Connection request created, but notification failed:', notificationError);
      }

      setConnectionStatusById((prev) => ({ ...prev, [dev.id]: 'outgoing_pending' }));
      showToast(`Connection request sent to ${dev.name}.`, { type: 'success' });
    } catch (err) {
      console.error('Error sending connection request:', err);
      const friendlyMessage = err?.message ? `Failed to send the connection request: ${err.message}` : 'Failed to send the connection request.';
      showToast(friendlyMessage, { type: 'error', duration: 4500 });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Find Developers</h1>
        <p className="text-gray-500">Search by skills, role, or availability to build stronger project teams for hackathons, clubs, and side projects.</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by name, role, or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-cyan-300 relative"
        >
          <SlidersHorizontal size={18} />
          Advanced Filters
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white shadow-sm">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">
          Showing <strong>{filtered.length}</strong> developer{filtered.length !== 1 ? 's' : ''}
        </p>
        
        {activeFiltersCount > 0 && (
          <button 
            onClick={() => setFilters({ availableOnly: false, minProjects: 0, minHackathons: 0, year: '', branch: '', skills: [] })}
            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <X size={12}/> Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-cyan-600" size={40} />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((dev) => (
            <DeveloperCard
              key={dev.id}
              dev={dev}
              onOpenProfile={() => navigate(`/profile/${dev.id}`)}
              onConnect={() => handleConnectAction(dev)}
              onMessage={() => navigate('/chat', { state: { startChatWith: dev.id } })}
              connectLabel={getConnectUiState(dev.id).label}
              connectDisabled={getConnectUiState(dev.id).disabled}
              connectTone={getConnectUiState(dev.id).tone}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 py-20 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-slate-700">No developers found</h3>
          <p className="mt-1 text-sm text-slate-400">Try adjusting your filters or search terms.</p>
        </div>
      )}

      {/* Advanced Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                 <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                   <SlidersHorizontal size={18} className="text-cyan-600"/> Advanced Filters
                 </h3>
                 <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Availability */}
                 <label className="flex cursor-pointer items-center gap-3 bg-cyan-50/50 p-3 rounded-xl border border-cyan-100">
                   <input
                     type="checkbox"
                     className="w-5 h-5 accent-cyan-600"
                     checked={filters.availableOnly}
                     onChange={(e) => setFilters({...filters, availableOnly: e.target.checked})}
                   />
                   <span className="text-sm font-semibold text-cyan-900">Only show available developers</span>
                 </label>

                 <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch / Dept</label>
                      <select 
                        value={filters.branch} 
                        onChange={e => setFilters({...filters, branch: e.target.value})} 
                        className="input-field shadow-sm text-sm bg-slate-50"
                      >
                         <option value="">Any Branch</option>
                         {PREDEFINED_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year</label>
                      <select 
                        value={filters.year} 
                        onChange={e => setFilters({...filters, year: e.target.value})} 
                        className="input-field shadow-sm text-sm bg-slate-50"
                      >
                         <option value="">Any Year</option>
                         {PREDEFINED_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Min Projects</label>
                      <input 
                        type="number" 
                        min="0" 
                        value={filters.minProjects} 
                        onChange={e => setFilters({...filters, minProjects: Number(e.target.value)})} 
                        className="input-field shadow-sm text-sm bg-slate-50" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Min Hackathons</label>
                      <input 
                        type="number" 
                        min="0" 
                        value={filters.minHackathons} 
                        onChange={e => setFilters({...filters, minHackathons: Number(e.target.value)})} 
                        className="input-field shadow-sm text-sm bg-slate-50" 
                      />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Required Skills</label>
                    <div 
                      className="relative flex flex-wrap items-center gap-2 min-h-[46px] p-2 border border-slate-200 rounded-xl bg-slate-50 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400 transition-colors"
                      ref={dropdownRef}
                    >
                      {filters.skills.map(skill => (
                        <span 
                          key={skill}
                          className="flex items-center gap-1.5 bg-cyan-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm"
                        >
                          {skill}
                          <button 
                            onClick={() => setFilters({...filters, skills: filters.skills.filter(s => s !== skill)})}
                            className="hover:text-cyan-200 transition-colors"
                          >
                            <X size={13}/>
                          </button>
                        </span>
                      ))}
                      
                      <div className="flex-1 min-w-[140px] relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-full bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400 p-1 pr-6"
                            placeholder={filters.skills.length === 0 ? "Type or select skills..." : "Add more..."}
                            value={skillInput}
                            onChange={(e) => {
                              setSkillInput(e.target.value);
                              setShowSkillDropdown(true);
                            }}
                            onFocus={() => setShowSkillDropdown(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSkill(skillInput);
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowSkillDropdown(!showSkillDropdown)}
                            className="absolute right-1 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                          </button>
                        </div>
                        
                        {/* Autocomplete Dropdown */}
                        {showSkillDropdown && (
                          <div className="absolute top-full left-0 mt-2 w-48 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
                            {allSkills
                              .filter(s => s.toLowerCase().includes(skillInput.toLowerCase()) && !filters.skills.some(fs => fs.toLowerCase() === s.toLowerCase()))
                              .map(skill => (
                                <button
                                  key={skill}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-cyan-50 hover:text-cyan-900 transition-colors"
                                  onClick={() => handleAddSkill(skill)}
                                >
                                  {skill}
                                </button>
                              ))}
                            
                            {skillInput.trim() && !allSkills.some(s => s.toLowerCase() === skillInput.trim().toLowerCase()) && (
                              <button
                                className="w-full text-left px-4 py-2 text-sm text-cyan-700 hover:bg-cyan-50 font-medium transition-colors border-t border-slate-100"
                                onClick={() => handleAddSkill(skillInput)}
                              >
                                + Add "{skillInput.trim()}"
                              </button>
                            )}
                            
                            {!skillInput && allSkills.length === 0 && (
                              <div className="px-4 py-2 text-sm text-slate-500 italic">
                                No skills found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                 </div>
              </div>
              
              <div className="p-6 pt-0 flex gap-3">
                 <button 
                   onClick={() => setFilters({ availableOnly: false, minProjects: 0, minHackathons: 0, year: '', branch: '', skills: [] })} 
                   className="btn-secondary py-2.5 px-6"
                 >
                   Reset
                 </button>
                 <button 
                   onClick={() => setShowFilters(false)} 
                   className="btn-primary flex-1 py-2.5 shadow-sm shadow-cyan-200 flex justify-center items-center gap-2"
                 >
                   Show Results <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs">{filtered.length}</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}