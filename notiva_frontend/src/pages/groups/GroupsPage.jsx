import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import collabService from '../../api/collabService';
import { Users, Plus, Shield, UsersRound, Settings, User } from 'lucide-react';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data: res } = useQuery({ queryKey: ['groups'], queryFn: () => collabService.getGroups() });
  const groups = res?.data?.results || [];

  const addMut = useMutation({ mutationFn: (n) => collabService.createGroup({ name: n }), onSuccess: () => { queryClient.invalidateQueries(['groups']); setName(''); } });

  return (
    <div className="flex-col w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3"><Users size={32} className="text-primary" /> Study Groups</h1>
          <p className="text-muted mt-4">Collaborate, share notes, and study together with your peers.</p>
        </div>
      </div>
      
      <div className="card shadow-sm border rounded-lg mb-8 p-6 bg-bg flex items-center gap-4">
        <div style={{ flex: 1 }}>
          <label className="font-semibold text-sm mb-2 block">Create New Group</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g. CS101 Final Exam Prep" 
            className="w-full"
            style={{ fontSize: '1rem' }}
            onKeyDown={(e) => e.key === 'Enter' && name && addMut.mutate(name)}
          />
        </div>
        <button 
          className="btn-primary flex items-center gap-2 mt-6" 
          onClick={() => { if(name) addMut.mutate(name); }} 
          disabled={!name}
          style={{ padding: '0.75rem 1.5rem' }}
        >
          <Plus size={20} /> Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <UsersRound size={48} className="text-muted mb-4" />
          <h3 className="font-semibold mb-2">No Study Groups</h3>
          <p className="text-muted">You are not in any study groups. Create one above to invite others.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-3 gap-6">
          {groups.map(g => (
            <div key={g.id} className="card shadow-sm border rounded-lg flex-col hover-bg-light transition-all" style={{ height: '100%' }}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary-light rounded-lg">
                    <UsersRound size={24} className="text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{g.name}</h3>
                </div>
                {g.role === 'admin' && (
                  <span className="badge badge-primary gap-1" title="You are an admin">
                    <Shield size={14} /> Admin
                  </span>
                )}
              </div>
              
              <p className="text-muted flex-1 mb-6">
                {g.description || 'No description provided for this group.'}
              </p>
              
              <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="text-sm font-medium text-muted flex items-center gap-2">
                  <User size={14} /> Role: <span style={{ textTransform: 'capitalize' }}>{g.role}</span>
                </span>
                <button className="btn-secondary flex items-center gap-2 text-sm">
                  <Settings size={16} /> Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}