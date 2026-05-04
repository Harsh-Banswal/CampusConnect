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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">CC</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? 'Create your account' : 'Club Details'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1
                ? 'Join your campus community'
                : 'Tell us about the club you want to create'}
            </p>
          </div>

          {/* Step indicator for club admin */}
          {form.role === 'club_admin' && (
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200 mb-4">
              {error}
            </div>
          )}

          {/* ======================== STEP 1: Account Info ======================== */}
          {step === 1 && (
            <form onSubmit={handleStep1Continue} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">College Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Enrollment No. *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <div className="relative">
                    <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {['student', 'club_admin'].map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                        form.role === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={form.role === r}
                        onChange={() => setForm({ ...form, role: r })}
                        className="accent-blue-600"
                      />
                      <span className="text-sm font-medium">
                        {r === 'club_admin' ? 'Club Admin' : 'Student'}
                      </span>
                    </label>
                  ))}
                </div>
                {form.role === 'club_admin' && (
                  <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-3 py-2 rounded-lg">
                    You'll be asked to provide club details in the next step. Your request will be reviewed by the system admin.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Club Name</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">College / Department</label>
                <div className="relative">
                  <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Club Description</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
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

              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2.5 rounded-lg">
                ⏳ Your club request will be reviewed by the system admin. You can use the platform as a student while waiting for approval.
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
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

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
