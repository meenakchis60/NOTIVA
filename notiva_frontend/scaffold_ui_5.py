import os

base_dir = r"C:\Users\meena\OneDrive\Desktop\New folder (2)\notiva_frontend\src"

files = {
    "pages/study/StudyPage.jsx": """
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyService, goalsService } from '../../api/studyService';
import CascadingFilter from '../../components/academics/CascadingFilter';
import { Play, Square, History, Target, Clock } from 'lucide-react';

export default function StudyPage() {
  const queryClient = useQueryClient();
  const [sessionFilters, setSessionFilters] = useState({});

  const { data: actRes } = useQuery({ queryKey: ['activeSession'], queryFn: () => studyService.getSessions({ status: 'ACTIVE' }) });
  const activeSessions = actRes?.data?.results || [];
  const activeSession = activeSessions.length > 0 ? activeSessions[0] : null;

  const { data: histRes } = useQuery({ queryKey: ['studyHistory', sessionFilters], queryFn: () => studyService.getSessions(sessionFilters) });
  const history = histRes?.data?.results || [];

  const { data: goalRes } = useQuery({ queryKey: ['goals'], queryFn: () => goalsService.getGoals() });
  const goals = goalRes?.data?.results || [];

  const startMut = useMutation({ mutationFn: () => studyService.createSession({}), onSuccess: () => queryClient.invalidateQueries(['activeSession']) });
  const compMut = useMutation({ mutationFn: (id) => studyService.completeSession(id), onSuccess: () => { queryClient.invalidateQueries(['activeSession']); queryClient.invalidateQueries(['studyHistory']); queryClient.invalidateQueries(['goals']); } });
  const cancMut = useMutation({ mutationFn: (id) => studyService.cancelSession(id), onSuccess: () => { queryClient.invalidateQueries(['activeSession']); queryClient.invalidateQueries(['studyHistory']); } });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Study Workspace</h1>
      
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Play size={20} /> Active Session</h2>
        {activeSession ? (
          <div>
            <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Started at {new Date(activeSession.started_at).toLocaleTimeString()}</p>
            {activeSession.note_title && <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Studying: {activeSession.note_title}</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" onClick={() => compMut.mutate(activeSession.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-success)' }}><Square size={16} /> Complete Session</button>
              <button className="btn-danger" onClick={() => cancMut.mutate(activeSession.id)}>Cancel Session</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No active study session.</p>
            <button className="btn-primary" onClick={() => startMut.mutate()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Play size={16} /> Start Session</button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><History size={20} /> History</h2>
          <CascadingFilter onFilterChange={setSessionFilters} />
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.map(s => (
              <div key={s.id} style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{new Date(s.started_at).toLocaleDateString()}</strong>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{s.note_title || 'General Session'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{s.duration_seconds > 0 ? Math.round(s.duration_seconds / 60) + ' min' : '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: s.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{s.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Target size={20} /> Goals</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {goals.map(g => (
              <div key={g.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>{g.title}</h4>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{g.goal_type}</div>
                <div style={{ width: '100%', background: 'var(--color-bg-secondary)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (g.current_value / g.target_value) * 100)}%`, background: 'var(--color-primary)', height: '100%' }} />
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'right' }}>{g.current_value} / {g.target_value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
""",
    "pages/groups/GroupsPage.jsx": """
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
"""
}

for path, content in files.items():
    full_path = os.path.join(base_dir, path.replace("/", "\\"))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip())
        
print("Scaffolding 5 complete.")
