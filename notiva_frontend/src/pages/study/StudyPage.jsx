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