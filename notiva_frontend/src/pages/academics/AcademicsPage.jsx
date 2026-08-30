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