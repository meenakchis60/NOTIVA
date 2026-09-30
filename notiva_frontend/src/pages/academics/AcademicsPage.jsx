import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import academicsService from '../../api/academicsService';
import { Book, Folder, File, Trash2, Plus, Loader2 } from 'lucide-react';

// Standalone component defined outside AcademicsPage so React preserves DOM node and active focus across renders
function AcademicColumn({ title, icon, items, selId, onSel, onDel, newVal, setVal, onAdd, placeholder, loading }) {
  return (
    <div className="card shadow-sm border rounded-lg flex-col" style={{ flex: 1, height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      <div className="flex items-center gap-2 mb-4 p-4" style={{ borderBottom: '1px solid var(--color-border)', margin: '-1rem -1rem 1rem -1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px 8px 0 0' }}>
        <div className="text-primary">{icon}</div>
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      
      <div className="flex-col gap-2" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="loading-spinner text-primary" /></div>
        ) : items.length > 0 ? (
          items.map(item => {
            const itemId = item.id || item._id;
            const isSelected = selId === itemId;
            return (
              <div 
                key={itemId} 
                onClick={() => onSel(itemId)} 
                className="flex justify-between items-center cursor-pointer border rounded-lg p-4 transition-all"
                style={{ 
                  background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)'
                }}
              >
                <span className="font-medium" style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  {item.name}
                </span>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (window.confirm(`Delete ${item.name}?`)) onDel(itemId); 
                  }} 
                  className="btn-icon danger"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty-state p-6 m-0 border-0">
            <p>No {title.toLowerCase()} found.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <input 
          value={newVal} 
          onChange={e => setVal(e.target.value)} 
          placeholder={placeholder} 
          className="p-2.5 border rounded-lg bg-bg w-full text-sm font-medium focus:outline-primary"
          onKeyDown={(e) => e.key === 'Enter' && newVal.trim() && onAdd(newVal.trim())}
          autoComplete="off"
        />
        <button 
          className="btn-primary flex items-center justify-center rounded-lg" 
          style={{ width: '42px', height: '42px', padding: 0, flexShrink: 0 }}
          onClick={() => { if (newVal.trim()) onAdd(newVal.trim()); }}
          disabled={!newVal.trim()}
          title={`Add ${placeholder}`}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

export default function AcademicsPage() {
  const queryClient = useQueryClient();
  const [selSem, setSelSem] = useState(null);
  const [selSub, setSelSub] = useState(null);
  const [newSem, setNewSem] = useState('');
  const [newSub, setNewSub] = useState('');
  const [newNot, setNewNot] = useState('');

  const { data: semRes, isLoading: semsLoading } = useQuery({ 
    queryKey: ['semesters'], 
    queryFn: () => academicsService.getSemesters() 
  });
  const { data: subRes, isLoading: subsLoading } = useQuery({ 
    queryKey: ['subjects', selSem], 
    queryFn: () => academicsService.getSubjectsBySemester(selSem), 
    enabled: Boolean(selSem) 
  });
  const { data: notRes, isLoading: notsLoading } = useQuery({ 
    queryKey: ['notebooks', selSub], 
    queryFn: () => academicsService.getNotebooksBySubject(selSub), 
    enabled: Boolean(selSub) 
  });

  const addSemMut = useMutation({ 
    mutationFn: (name) => academicsService.createSemester({ name }), 
    onSuccess: () => { 
      queryClient.invalidateQueries(['semesters']); 
      setNewSem(''); 
    } 
  });
  const delSemMut = useMutation({ 
    mutationFn: (id) => academicsService.deleteSemester(id), 
    onSuccess: () => { 
      queryClient.invalidateQueries(['semesters']); 
      setSelSem(null); 
    } 
  });
  
  const addSubMut = useMutation({ 
    mutationFn: (name) => academicsService.createSubject({ semester: selSem, name }), 
    onSuccess: () => { 
      queryClient.invalidateQueries(['subjects']); 
      setNewSub(''); 
    } 
  });
  const delSubMut = useMutation({ 
    mutationFn: (id) => academicsService.deleteSubject(id), 
    onSuccess: () => { 
      queryClient.invalidateQueries(['subjects']); 
      setSelSub(null); 
    } 
  });

  const addNotMut = useMutation({ 
    mutationFn: (name) => academicsService.createNotebook({ subject: selSub, name }), 
    onSuccess: () => { 
      queryClient.invalidateQueries(['notebooks']); 
      setNewNot(''); 
    } 
  });
  const delNotMut = useMutation({ 
    mutationFn: (id) => academicsService.deleteNotebook(id), 
    onSuccess: () => { 
      queryClient.invalidateQueries(['notebooks']); 
    } 
  });

  const semsRaw = semRes?.data;
  const sems = Array.isArray(semsRaw) ? semsRaw : (semsRaw?.data?.results || semsRaw?.results || []);

  const subsRaw = subRes?.data;
  const subs = Array.isArray(subsRaw) ? subsRaw : (subsRaw?.data?.results || subsRaw?.results || []);

  const notsRaw = notRes?.data;
  const nots = Array.isArray(notsRaw) ? notsRaw : (notsRaw?.data?.results || notsRaw?.results || []);

  return (
    <div className="flex-col w-full">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title text-2xl font-bold text-primary m-0">Academics Hierarchy</h1>
          <p className="text-muted mt-2">Organize your academic syllabus by Semesters, Subjects, and Notebooks.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md-grid-cols-3 gap-6">
        <AcademicColumn 
          title="Semesters" 
          icon={<Book size={20} />} 
          items={sems} 
          loading={semsLoading}
          selId={selSem} 
          onSel={(id) => { setSelSem(id); setSelSub(null); }} 
          onDel={(id) => delSemMut.mutate(id)} 
          newVal={newSem} 
          setVal={setNewSem} 
          onAdd={(name) => addSemMut.mutate(name)} 
          placeholder="New Semester" 
        />
        
        {selSem ? (
          <AcademicColumn 
            title="Subjects" 
            icon={<Folder size={20} />} 
            items={subs} 
            loading={subsLoading}
            selId={selSub} 
            onSel={setSelSub} 
            onDel={(id) => delSubMut.mutate(id)} 
            newVal={newSub} 
            setVal={setNewSub} 
            onAdd={(name) => addSubMut.mutate(name)} 
            placeholder="New Subject" 
          />
        ) : (
          <div className="empty-state card shadow-sm border rounded-lg flex-col justify-center items-center p-8 text-center" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
            <Folder size={48} className="text-muted opacity-50 mb-3" />
            <h3 className="font-semibold text-lg mb-1">No Semester Selected</h3>
            <p className="text-muted text-sm max-w-xs">Select a semester on the left to view and add subjects.</p>
          </div>
        )}
        
        {selSub ? (
          <AcademicColumn 
            title="Notebooks" 
            icon={<File size={20} />} 
            items={nots} 
            loading={notsLoading}
            selId={null} 
            onSel={() => {}} 
            onDel={(id) => delNotMut.mutate(id)} 
            newVal={newNot} 
            setVal={setNewNot} 
            onAdd={(name) => addNotMut.mutate(name)} 
            placeholder="New Notebook" 
          />
        ) : (
          <div className="empty-state card shadow-sm border rounded-lg flex-col justify-center items-center p-8 text-center" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
            <File size={48} className="text-muted opacity-50 mb-3" />
            <h3 className="font-semibold text-lg mb-1">No Subject Selected</h3>
            <p className="text-muted text-sm max-w-xs">Select a subject in the middle column to view and add notebooks.</p>
          </div>
        )}
      </div>
    </div>
  );
}