import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notesService from '../../api/notesService';
import CascadingFilter from '../../components/academics/CascadingFilter';
import { Edit, Save, ArrowLeft, Loader2, BookOpen, AlertCircle, FileText } from 'lucide-react';

export default function NoteFormPage() {
  const { noteId } = useParams();
  const isEditing = Boolean(noteId && noteId !== 'new' && noteId !== 'undefined');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    notebook_id: '',
    is_study_material: false,
    difficulty: 'BEGINNER',
  });
  
  const [hierarchy, setHierarchy] = useState({ semester_id: '', subject_id: '', notebook_id: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const { data: noteRes, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => notesService.getNote(noteId),
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && noteRes?.data) {
      const n = noteRes.data.data || noteRes.data;
      setFormData({
        title: n.title,
        content: n.content,
        notebook_id: n.notebook_id,
        is_study_material: n.is_study_material,
        difficulty: n.difficulty || 'BEGINNER',
      });
      setHierarchy({
        semester_id: n.semester_id || '',
        subject_id: n.subject_id || '',
        notebook_id: n.notebook_id || ''
      });
    }
  }, [isEditing, noteRes]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, notebook: hierarchy.notebook_id || formData.notebook_id };
      delete payload.notebook_id;

      if (isEditing) {
        return notesService.updateNote(noteId, payload);
      } else {
        return notesService.createNote(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      navigate('/notes');
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save note');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    mutation.mutate(formData);
  };

  const handleCascadeChange = React.useCallback((vals) => {
    setHierarchy(vals);
  }, []);

  if (isEditing && isLoading) return (
    <div className="empty-state">
      <Loader2 className="loading-spinner mb-4" />
      <h3 className="font-semibold">Loading note...</h3>
    </div>
  );

  return (
    <div className="flex-col w-full" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn-secondary flex items-center gap-2 mb-6" style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', padding: '0', color: 'var(--color-text-secondary)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="page-header mb-6">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <FileText size={32} className="text-primary" /> {isEditing ? 'Edit Note' : 'Create New Note'}
          </h1>
        </div>
      </div>
      
      {errorMsg && (
        <div className="p-4 mb-6 rounded-lg bg-danger border font-medium text-danger flex items-center gap-2">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-col gap-6">
        <div className="card shadow-sm border rounded-lg p-6 bg-surface">
          <h4 className="font-semibold mb-4 border-bottom pb-2">1. Academic Location</h4>
          <div className="w-full">
            <CascadingFilter onFilterChange={handleCascadeChange} initialValues={hierarchy} />
          </div>
          {!hierarchy.notebook_id && formData.notebook_id && (
            <p className="text-muted mt-4 text-sm bg-bg p-3 rounded-lg border inline-block">
              Currently keeping existing notebook. Use the filters above if you want to move this note.
            </p>
          )}
        </div>

        <div className="card shadow-sm border rounded-lg p-6 bg-surface flex-col gap-4">
          <h4 className="font-semibold mb-2 border-bottom pb-2">2. Note Content</h4>
          
          <div className="form-group flex-col gap-2">
            <label className="font-medium text-sm">Title</label>
            <input 
              required 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              placeholder="e.g. Introduction to Thermodynamics"
              className="p-3 border rounded-lg w-full text-lg font-medium"
            />
          </div>

          <div className="form-group flex-col gap-2">
            <label className="font-medium text-sm">Content</label>
            <textarea 
              required 
              rows="12" 
              className="p-4 border rounded-lg w-full font-mono text-sm"
              style={{ resize: 'vertical', lineHeight: '1.6' }}
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              placeholder="# Markdown supported..."
            />
          </div>
        </div>

        <div className="card shadow-sm border rounded-lg p-6 bg-surface flex items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer font-medium p-3 bg-bg border rounded-lg hover-bg-light transition-all">
            <input 
              type="checkbox" 
              checked={formData.is_study_material} 
              onChange={e => setFormData({...formData, is_study_material: e.target.checked})} 
              className="w-5 h-5 cursor-pointer"
            />
            <BookOpen size={18} className="text-primary"/> Mark as Study Material
          </label>

          {formData.is_study_material && (
            <div className="flex items-center gap-3">
              <label className="font-medium text-sm">Difficulty:</label>
              <select 
                value={formData.difficulty} 
                onChange={e => setFormData({...formData, difficulty: e.target.value})} 
                className="p-2 border rounded-lg bg-bg"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 mt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={mutation.isPending} style={{ padding: '0.75rem 2rem' }}>
            {mutation.isPending ? <Loader2 className="loading-spinner w-4 h-4" /> : <Save size={18} />}
            {mutation.isPending ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
