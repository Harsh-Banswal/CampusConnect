import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Building, User, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function SystemAdminDashboard() {
  const { showToast } = useToast();
  const [pendingClubs, setPendingClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPendingClubs();
  }, []);

  const fetchPendingClubs = async () => {
    try {
      setLoading(true);
      // Fetch clubs with 'pending' status, including the owner's profile details
      const { data, error } = await supabase
        .from('clubs')
        .select(`
          id, name, college, description, created_at, status, owner_id,
          profiles:owner_id (name, email)
        `)
        .eq('status', 'pending');

      if (error) throw error;
      
      // Supabase join syntax returns a single object if it's a 1:1, but might return an array or object depending on schema.
      // Usually it returns an object for references.
      setPendingClubs(data || []);
    } catch (err) {
      console.error('Error fetching pending clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (club) => {
    try {
      setActionLoading(club.id);
      
      // 1. Update club status to approved
      const { error: clubError } = await supabase
        .from('clubs')
        .update({ status: 'approved' })
        .eq('id', club.id);
        
      if (clubError) throw clubError;

      // 2. Update the requester's role to club_admin
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'club_admin' })
        .eq('id', club.owner_id);
        
      if (roleError) throw roleError;

      // 3. Add to club_members as an approved member
      const { error: memberError } = await supabase
        .from('club_members')
        .insert({
          club_id: club.id,
          profile_id: club.owner_id,
          status: 'approved'
        });

      if (memberError && memberError.code !== '23505') throw memberError;

      // 4. Send notification to the club requester
      await supabase.from('notifications').insert({
        profile_id: club.owner_id,
        title: '🎉 Club Approved!',
        message: `Your club "${club.name}" has been approved. You are now a Club Admin!`,
        link: '/dashboard',
        is_read: false,
      });

      // Remove from UI
      setPendingClubs(prev => prev.filter(c => c.id !== club.id));
      showToast('Club approved successfully!', { type: 'success' });
      
    } catch (err) {
      console.error('Error approving club:', err);
      showToast('Failed to approve club.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (clubId) => {
    if (!window.confirm('Are you sure you want to reject this club request?')) return;
    
    try {
      setActionLoading(clubId);
      
      const { error } = await supabase
        .from('clubs')
        .update({ status: 'rejected' })
        .eq('id', clubId);

      if (error) throw error;

      // Send notification to the club requester
      const rejected = pendingClubs.find(c => c.id === clubId);
      if (rejected) {
        await supabase.from('notifications').insert({
          profile_id: rejected.owner_id,
          title: '❌ Club Request Rejected',
          message: `Your request to create "${rejected.name}" was not approved. Please contact the admin for more information.`,
          link: '/dashboard',
          is_read: false,
        });
      }

      // Remove from UI
      setPendingClubs(prev => prev.filter(c => c.id !== clubId));
      
    } catch (err) {
      console.error('Error rejecting club:', err);
      showToast('Failed to reject club.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">System Admin Dashboard</h1>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-indigo-600" />
        <h1 className="text-3xl font-bold">System Admin Dashboard</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Pending Club Requests
            <span className="bg-indigo-100 text-indigo-700 text-sm font-medium px-2.5 py-0.5 rounded-full ml-2">
              {pendingClubs.length}
            </span>
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {pendingClubs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No pending club requests at the moment.
            </div>
          ) : (
            pendingClubs.map((club) => (
              <div key={club.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{club.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Building className="w-4 h-4" /> {club.college}
                      </p>
                    </div>
                    
                    <p className="text-gray-600 text-sm">
                      {club.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100/50 w-fit px-3 py-1.5 rounded-md">
                      <User className="w-4 h-4" />
                      <span>Requested by: <strong>{club.profiles?.name}</strong> ({club.profiles?.email})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:flex-col md:w-32">
                    <button
                      onClick={() => handleApprove(club)}
                      disabled={actionLoading === club.id}
                      className="flex-1 md:w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === club.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Approve
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleReject(club.id)}
                      disabled={actionLoading === club.id}
                      className="flex-1 md:w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
