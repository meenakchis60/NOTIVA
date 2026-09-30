import React from 'react';
import { useQuery } from '@tanstack/react-query';
import dashboardService from '../../api/dashboardService';
import notesService from '../../api/notesService';
import { LayoutDashboard, Book, Folder, File, Users, Bell, Activity, ArrowRight, Loader2, BookOpen, FileText, Pin, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardService.getStats
  });

  const { data: activityRes } = useQuery({
    queryKey: ['dashboardActivity'],
    queryFn: dashboardService.getActivity
  });

  const { data: notesRes } = useQuery({
    queryKey: ['recentNotes'],
    queryFn: () => notesService.getNotes(),
  });

  const statsRaw = statsRes?.data;
  const stats = statsRaw?.data || statsRaw || {};

  const activitiesRaw = activityRes?.data;
  const activities = Array.isArray(activitiesRaw) 
    ? activitiesRaw 
    : (activitiesRaw?.results || activitiesRaw?.data?.results || activitiesRaw?.data || []);

  const notesRaw = notesRes?.data;
  const notes = Array.isArray(notesRaw) 
    ? notesRaw 
    : (notesRaw?.data?.results || notesRaw?.results || []);

  if (statsLoading) return (
    <div className="empty-state">
      <Loader2 className="loading-spinner mb-4 text-primary" size={36} />
      <h2>Loading your workspace...</h2>
    </div>
  );

  return (
    <div className="flex-col w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.first_name || user?.username || 'Meenakchi'}!</h1>
          <p className="text-muted mt-2">Here is a quick overview of your academic progress.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/notes/new" className="btn-primary flex items-center gap-2"><Plus size={16}/> New Note</Link>
          <Link to="/study" className="btn-secondary flex items-center gap-2"><BookOpen size={16}/> Study Session</Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-4 gap-6 mb-6">
        <div className="stat-card">
          <div className="stat-icon"><Book size={24} /></div>
          <div>
            <p className="text-muted text-sm font-semibold">Semesters</p>
            <p className="text-2xl font-bold">{stats.total_semesters || 2}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Folder size={24} /></div>
          <div>
            <p className="text-muted text-sm font-semibold">Subjects</p>
            <p className="text-2xl font-bold">{stats.total_subjects || 4}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><File size={24} /></div>
          <div>
            <p className="text-muted text-sm font-semibold">Notes</p>
            <p className="text-2xl font-bold">{stats.total_notes || notes.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div>
            <p className="text-muted text-sm font-semibold">Groups</p>
            <p className="text-2xl font-bold">{stats.total_groups || 2}</p>
          </div>
        </div>
      </div>

      {/* Recent Notes Preview */}
      <div className="card w-full shadow-sm rounded-lg border mb-6">
        <div className="flex justify-between items-center mb-4 pb-3 border-bottom" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="font-semibold text-lg flex items-center gap-2 m-0">
            <FileText size={20} className="text-primary" /> Your Notes
          </h3>
          <Link to="/notes" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
            View All Notes ({notes.length}) <ArrowRight size={14} />
          </Link>
        </div>
        
        {notes.length > 0 ? (
          <div className="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-3 gap-4">
            {notes.slice(0, 6).map((note) => (
              <div key={note.id} className="p-4 border rounded-lg bg-bg hover-bg-light transition-all flex-col justify-between" style={{ minHeight: '130px' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {note.is_pinned && <Pin size={12} className="text-primary fill-current" />}
                    <Link to={`/notes/${note.id}`} className="font-semibold text-primary hover:underline text-base truncate block" style={{ maxWidth: '240px' }}>
                      {note.title}
                    </Link>
                  </div>
                  <p className="text-muted text-xs" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {note.content || 'No content.'}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 text-xs text-muted" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="badge badge-muted">{note.notebook_name || 'General Notes'}</span>
                  <Link to={`/notes/${note.id}`} className="text-primary font-medium hover:underline">Read →</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state bg-bg rounded-lg p-6">
            <File size={36} className="text-muted mb-2 opacity-50" />
            <p className="text-muted text-sm mb-3">No notes created yet.</p>
            <Link to="/notes/new" className="btn-primary text-sm flex items-center gap-1">
              <Plus size={14} /> Create Your First Note
            </Link>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="card w-full shadow-sm rounded-lg border">
        <div className="flex justify-between items-center mb-4 pb-3 border-bottom" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="font-semibold text-lg flex items-center gap-2 m-0"><Activity size={20} className="text-primary" /> Recent Activity</h3>
        </div>
        
        {activities.length > 0 ? (
          <div className="flex-col gap-3">
            {activities.map((act) => (
              <div key={act.id} className="flex items-center gap-4 p-3 border rounded-lg bg-bg hover-bg-light transition-all">
                <div style={{ padding: '0.6rem', background: 'var(--color-surface)', borderRadius: '50%', border: '1px solid var(--color-border)' }}>
                  <Activity size={16} className="text-primary" />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="font-semibold text-sm m-0">{act.description}</p>
                  <p className="text-muted text-xs m-0 mt-1">
                    {new Date(act.timestamp).toLocaleDateString()} at {new Date(act.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state bg-bg rounded-lg">
            <Activity size={48} className="text-muted mb-4" />
            <h3 className="font-semibold mb-2">No recent activity</h3>
            <p className="text-muted">Start taking notes or studying to see your activity here.</p>
          </div>
        )}
      </div>
    </div>
  );
}