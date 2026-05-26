import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Building, FileText, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const departments = ['CSE', 'IT', 'ECE', 'ME', 'Civil', 'MBA', 'MCA'];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function RegisterPage() {
  // Step 1: account details
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '', department: '', year: '', enrollment_no: '', batch: '', role: 'student',
  });
  // Step 2: club details (only for club_admin)
  const [clubForm, setClubForm] = useState({ name: '', college: '', description: '' });

  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Step 1 continue handler ---
  const handleStep1Continue = (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password || !form.department || !form.year || !form.enrollment_no.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    // If club admin, go to step 2 to collect club details
    if (form.role === 'club_admin') {
      setStep(2);
    } else {
      handleFinalSubmit();
    }
  };

  // --- Final submit (called directly for students, or after step 2 for club admins) ---
  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (form.role === 'club_admin') {
      if (!clubForm.name || !clubForm.college || !clubForm.description) {
        setError('Please fill in all club details.');
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Register with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            name: form.name,
            department: form.department,
            year: form.year,
            enrollment_no: form.enrollment_no,
            batch: form.batch,
            role: form.role,
          },
        },
      });

      if (authError) throw authError;

      if (data.user) {
        // 2. Create or update profile — always starts as 'student' role until approved
        const { error: profileError } = await supabase.from('profiles').upsert([{
          id: data.user.id,
          name: form.name,
          email: form.email.trim(),
          role: 'student', // stays student until system admin approves
          department: form.department,
          year: form.year,
          enrollment_no: form.enrollment_no,
        }], { onConflict: 'id' });

        if (profileError) throw profileError;

        // 3. If club admin, also create the pending club request
        if (form.role === 'club_admin') {
          const { error: clubError } = await supabase.from('clubs').insert([{
            name: clubForm.name,
            college: clubForm.college,
            description: clubForm.description,
            owner_id: data.user.id,
            status: 'pending',
          }]);

          if (clubError) throw clubError;
        }

        // Redirect to dashboard
        window.location.href = '/dashboard';
      }

    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative blurred background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full filter blur-3xl -z-10 animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full filter blur-3xl -z-10 animate-pulse duration-[10000ms]"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-dark-card border border-dark-border rounded-[2rem] p-8 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-glow">
              <span className="text-accent font-bold text-lg">CC</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              {step === 1 ? 'Create your account' : 'Club Details'}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {step === 1
                ? 'Join your campus community'
                : 'Tell us about the club you want to create'}
            </p>
          </div>

          {/* Step indicator for club admin */}
          {form.role === 'club_admin' && (
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-accent shadow-glow' : 'bg-dark-surface border border-dark-border'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-accent shadow-glow' : 'bg-dark-surface border border-dark-border'}`} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-950/40 text-red-400 border border-red-900/30 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* ======================== STEP 1: Account Info ======================== */}
          {step === 1 && (
            <form onSubmit={handleStep1Continue} className="space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    className="input-field pl-9"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">College Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    className="input-field pl-9"
                    placeholder="you@university.edu"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Enrollment No. *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 120XXXXXXXX"
                    value={form.enrollment_no}
                    onChange={(e) => setForm({ ...form, enrollment_no: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Batch</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 2020-2024"
                    value={form.batch}
                    onChange={(e) => setForm({ ...form, batch: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Department</label>
                  <div className="relative">
                    <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <select
                      className="input-field pl-9 appearance-none"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      <option value="">Select</option>
                      {departments.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Year</label>
                  <select
                    className="input-field"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  >
                    <option value="">Select</option>
                    {years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {['student', 'club_admin'].map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2 border rounded-xl p-3 cursor-pointer transition-all ${
                        form.role === r 
                          ? 'border-accent bg-accent/10 text-white shadow-glow' 
                          : 'border-dark-border hover:border-gray-600 text-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={form.role === r}
                        onChange={() => setForm({ ...form, role: r })}
                        className="accent-accent"
                      />
                      <span className="text-sm font-semibold">
                        {r === 'club_admin' ? 'Club Admin' : 'Student'}
                      </span>
                    </label>
                  ))}
                </div>
                {form.role === 'club_admin' && (
                  <p className="text-xs text-accent mt-2 bg-accent/10 border border-accent/20 px-3 py-2 rounded-xl">
                    You'll be asked to provide club details in the next step. Your request will be reviewed by the system admin.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input-field pl-9 pr-10"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2 disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                {form.role === 'club_admin' ? 'Next: Club Details →' : (loading ? 'Creating...' : 'Create Account')}
              </button>
            </form>
          )}

          {/* ======================== STEP 2: Club Details (Club Admin only) ======================== */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Club Name</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    className="input-field pl-9"
                    placeholder="e.g. Robotics Club"
                    value={clubForm.name}
                    onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">College / Department</label>
                <div className="relative">
                  <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    className="input-field pl-9"
                    placeholder="e.g. College of Engineering"
                    value={clubForm.college}
                    onChange={(e) => setClubForm({ ...clubForm, college: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Club Description</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-3 text-gray-500" />
                  <textarea
                    required
                    rows={4}
                    className="input-field pl-9 resize-none"
                    placeholder="What is your club about? What will members do?"
                    value={clubForm.description}
                    onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-orange-955/40 border border-orange-900/30 text-orange-400 text-xs px-3 py-2.5 rounded-xl">
                ⏳ Your club request will be reviewed by the system admin. You can use the platform as a student while waiting for approval.
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-dark-border text-gray-300 rounded-xl hover:bg-dark-surface font-medium text-sm transition-colors"
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                  {loading ? 'Creating Account...' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent font-semibold hover:text-accent-purple hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
