import React from 'react';
import { useQuery } from '@tanstack/react-query';
import dashboardService from '../../api/dashboardService';
import { Activity, Book, Folder, FileText, Users, Bell } from 'lucide-react';

export default function DashboardPage() {
  const { data: statsData } = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: async () => (await dashboardService.getStats()).data });
  const { data: activityData } = useQuery({ queryKey: ['dashboard', 'activity'], queryFn: async () => (await dashboardService.getActivity()).data });

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>
      
      {statsData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {[
            { label: 'Semesters', value: statsData.total_semesters || 0, icon: <Book size={24} /> },
            { label: 'Subjects', value: statsData.total_subjects || 0, icon: <Folder size={24} /> },
            { label: 'Notebooks', value: statsData.total_notebooks || 0, icon: <Book size={24} /> },
            { label: 'Notes', value: statsData.total_notes || 0, icon: <FileText size={24} /> },
            { label: 'Groups', value: statsData.total_groups || 0, icon: <Users size={24} /> },
            { label: 'Notifications', value: statsData.unread_notifications || 0, icon: <Bell size={24} /> }
          ].map((stat, i) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '1rem', borderRadius: '8px' }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{stat.label}</p>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={20} /> Recent Activity</h2>
        {activityData?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activityData.map((act, i) => (
              <div key={i} style={{ paddingBottom: '1rem', borderBottom: i !== activityData.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <p>{act.action}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(act.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--color-text-muted)' }}>No recent activity.</p>}
      </div>
    </div>
  );
}