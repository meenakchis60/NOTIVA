import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyService, goalsService } from '../../api/studyService';
import CascadingFilter from '../../components/academics/CascadingFilter';
import { Play, Square, History, Target, Clock, X, Timer } from 'lucide-react';

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
    <div className="flex-col w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">Study Workspace</h1>
          <p className="text-muted mt-4">Track your focus sessions and academic goals.</p>
        </div>
      </div>
      
      <div className="card shadow-md border rounded-lg mb-6" style={{ borderLeft: '4px solid var(--color-primary)' }}>
        <h2 className="flex items-center gap-2 mb-4 font-semibold text-xl"><Timer className="text-primary" size={24} /> Active Session</h2>
        
        {activeSession ? (
          <div className="bg-bg p-6 rounded-lg border flex flex-col md-flex-row justify-between items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-primary mb-2">In Progress</p>
              <p className="text-muted flex items-center gap-2"><Clock size={16}/> Started at {new Date(activeSession.started_at).toLocaleTimeString()}</p>
              {activeSession.note_title && (
                <div className="mt-4 p-3 bg-surface border rounded-lg">
                  <p className="text-sm text-muted">Currently Studying</p>
                  <p className="font-semibold">{activeSession.note_title}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button 
                className="btn-primary flex items-center gap-2" 
                onClick={() => compMut.mutate(activeSession.id)}
                style={{ background: 'var(--color-success)', padding: '1rem 2rem', fontSize: '1.125rem' }}
              >
                <Square size={20} /> Complete Session
              </button>
              <button 
                className="btn-secondary flex items-center gap-2" 
                onClick={() => { if(window.confirm('Cancel this session? Time will not be recorded.')) cancMut.mutate(activeSession.id); }}
                style={{ padding: '1rem' }}
              >
                <X size={20} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state bg-bg p-8" style={{ border: '2px dashed var(--color-border)', borderRadius: '12px' }}>
            <Timer size={48} className="text-muted mb-4" />
            <h3 className="font-semibold mb-2">Ready to focus?</h3>
            <p className="text-muted mb-6">Start a new study session to track your time and progress.</p>
            <button 
              className="btn-primary flex items-center gap-2" 
              onClick={() => startMut.mutate()}
              style={{ padding: '0.75rem 2rem', fontSize: '1.125rem' }}
            >
              <Play size={20} /> Start Study Session
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg-grid-cols-3 gap-6">
        <div className="card shadow-sm border rounded-lg" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="flex items-center gap-2 font-semibold text-lg"><History className="text-primary" size={20} /> Study History</h2>
          </div>
          
          <div className="mb-6 p-4 bg-bg rounded-lg border">
            <h4 className="text-sm font-semibold text-muted mb-3">Filter History</h4>
            <div className="w-full">
              <CascadingFilter onFilterChange={setSessionFilters} />
            </div>
          </div>
          
          <div className="flex-col gap-4">
            {history.length > 0 ? history.map(s => (
              <div key={s.id} className="flex justify-between items-center p-4 border rounded-lg hover-bg-light transition-all" style={{ background: 'var(--color-surface)' }}>
                <div>
                  <strong className="text-lg">{new Date(s.started_at).toLocaleDateString()}</strong>
                  <div className="text-muted mt-1 flex items-center gap-2">
                    <Clock size={14} /> {new Date(s.started_at).toLocaleTimeString()}
                  </div>
                  <div className="mt-2 font-medium">{s.note_title || 'General Study Session'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{s.duration_seconds > 0 ? Math.round(s.duration_seconds / 60) + ' min' : '-'}</div>
                  <div className={`mt-2 badge ${s.status === 'COMPLETED' ? 'badge-success' : 'badge-muted'}`}>
                    {s.status}
                  </div>
                </div>
              </div>
            )) : (
              <div className="empty-state p-8">
                <History size={32} className="mb-4" />
                <p>No study sessions match your filters.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card shadow-sm border rounded-lg">
          <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Target className="text-primary" size={20} />
            <h2 className="font-semibold text-lg">Active Goals</h2>
          </div>
          
          <div className="flex-col gap-4">
            {goals.length > 0 ? goals.map(g => {
              const progress = Math.min(100, (g.current_value / g.target_value) * 100);
              return (
                <div key={g.id} className="p-4 border rounded-lg bg-bg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{g.title}</h4>
                    <span className="badge badge-primary">{g.goal_type}</span>
                  </div>
                  
                  <div className="w-full bg-surface border rounded-lg overflow-hidden mt-4" style={{ height: '8px' }}>
                    <div style={{ width: `${progress}%`, background: 'var(--color-primary)', height: '100%', transition: 'width 0.5s ease' }} />
                  </div>
                  
                  <div className="flex justify-between items-center mt-2 text-sm text-muted">
                    <span>{g.current_value}</span>
                    <span>{progress.toFixed(0)}%</span>
                    <span>{g.target_value} {g.goal_type === 'MINUTES' ? 'min' : 'sessions'}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="empty-state p-6">
                <Target size={32} className="mb-4" />
                <p>No active goals configured.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}