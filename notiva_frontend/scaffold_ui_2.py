import os

base_dir = r"C:\Users\meena\OneDrive\Desktop\New folder (2)\notiva_frontend\src"

files = {
    "pages/dashboard/DashboardPage.jsx": """
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
""",
    "pages/academics/AcademicsPage.jsx": """
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import academicsService from '../../api/academicsService';
import { Book, Folder, File, Trash2, Plus } from 'lucide-react';

export default function AcademicsPage() {
  const queryClient = useQueryClient();
  const [selSem, setSelSem] = useState(null);
  const [selSub, setSelSub] = useState(null);
  const [newSem, setNewSem] = useState('');
  const [newSub, setNewSub] = useState('');
  const [newNot, setNewNot] = useState('');

  const { data: semRes } = useQuery({ queryKey: ['semesters'], queryFn: () => academicsService.getSemesters() });
  const { data: subRes } = useQuery({ queryKey: ['subjects', selSem], queryFn: () => academicsService.getSubjectsBySemester(selSem), enabled: !!selSem });
  const { data: notRes } = useQuery({ queryKey: ['notebooks', selSub], queryFn: () => academicsService.getNotebooksBySubject(selSub), enabled: !!selSub });

  const addSemMut = useMutation({ mutationFn: (name) => academicsService.createSemester({ name }), onSuccess: () => { queryClient.invalidateQueries(['semesters']); setNewSem(''); } });
  const delSemMut = useMutation({ mutationFn: (id) => academicsService.deleteSemester(id), onSuccess: () => { queryClient.invalidateQueries(['semesters']); setSelSem(null); } });
  
  const addSubMut = useMutation({ mutationFn: (name) => academicsService.createSubject({ semester: selSem, name }), onSuccess: () => { queryClient.invalidateQueries(['subjects']); setNewSub(''); } });
  const delSubMut = useMutation({ mutationFn: (id) => academicsService.deleteSubject(id), onSuccess: () => { queryClient.invalidateQueries(['subjects']); setSelSub(null); } });

  const addNotMut = useMutation({ mutationFn: (name) => academicsService.createNotebook({ subject: selSub, name }), onSuccess: () => { queryClient.invalidateQueries(['notebooks']); setNewNot(''); } });
  const delNotMut = useMutation({ mutationFn: (id) => academicsService.deleteNotebook(id), onSuccess: () => { queryClient.invalidateQueries(['notebooks']); } });

  const sems = semRes?.data?.results || [];
  const subs = subRes?.data?.results || [];
  const nots = notRes?.data?.results || [];

  const Col = ({ title, icon, items, selId, onSel, onDel, newVal, setVal, onAdd, placeholder }) => (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '600px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>{icon} {title}</h3>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map(item => (
          <div key={item.id} onClick={() => onSel(item.id)} style={{ padding: '0.75rem', borderRadius: '6px', background: selId === item.id ? 'var(--color-primary-light)' : 'var(--color-bg)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{item.name}</span>
            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete?')) onDel(item.id); }} style={{ color: 'var(--color-danger)' }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <input value={newVal} onChange={e => setVal(e.target.value)} placeholder={placeholder} style={{ flex: 1 }} />
        <button className="btn-primary" onClick={() => { if(newVal) onAdd(newVal); }}><Plus size={20} /></button>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Academics</h1>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <Col title="Semesters" icon={<Book />} items={sems} selId={selSem} onSel={(id) => { setSelSem(id); setSelSub(null); }} onDel={(id) => delSemMut.mutate(id)} newVal={newSem} setVal={setNewSem} onAdd={(name) => addSemMut.mutate(name)} placeholder="New Semester" />
        {selSem ? <Col title="Subjects" icon={<Folder />} items={subs} selId={selSub} onSel={setSelSub} onDel={(id) => delSubMut.mutate(id)} newVal={newSub} setVal={setNewSub} onAdd={(name) => addSubMut.mutate(name)} placeholder="New Subject" /> : <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Select a semester</div>}
        {selSub ? <Col title="Notebooks" icon={<File />} items={nots} selId={null} onSel={()=>{}} onDel={(id) => delNotMut.mutate(id)} newVal={newNot} setVal={setNewNot} onAdd={(name) => addNotMut.mutate(name)} placeholder="New Notebook" /> : <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Select a subject</div>}
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
        
print("Scaffolding 2 complete.")
