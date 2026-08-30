import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import collabService from '../../api/collabService';
import { Users, Plus, Shield } from 'lucide-react';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data: res } = useQuery({ queryKey: ['groups'], queryFn: () => collabService.getGroups() });
  const groups = res?.data?.results || [];

  const addMut = useMutation({ mutationFn: (n) => collabService.createGroup({ name: n }), onSuccess: () => { queryClient.invalidateQueries(['groups']); setName(''); } });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users /> Study Groups</h1>
      
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="New Group Name" style={{ flex: 1 }} />
        <button className="btn-primary" onClick={() => { if(name) addMut.mutate(name); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={16} /> Create Group</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {groups.map(g => (
          <div key={g.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              {g.name}
              {g.role === 'admin' && <Shield size={16} color="var(--color-primary)" title="Admin" />}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', flex: 1, marginBottom: '1rem' }}>{g.description || 'No description'}</p>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Role: {g.role}</span>
              <button className="btn-primary" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>View Details</button>
            </div>
          </div>
        ))}
        {groups.length === 0 && <p style={{ color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>You are not in any study groups.</p>}
      </div>
    </div>
  );
}