import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notesService from '../../api/notesService';
import CascadingFilter from '../../components/academics/CascadingFilter';

export default function NoteFormPage() {
  const { noteId } = useParams();
  const isEditing = noteId && noteId !== 'new';
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

  // Fetch existing if editing
  const { data: noteRes, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => notesService.getNote(noteId),
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && noteRes?.data) {
      const n = noteRes.data;
      setFormData({
        title: n.title,
        content: n.content,
        notebook_id: n.notebook_id,
        is_study_material: n.is_study_material,
        difficulty: n.difficulty || 'BEGINNER',
      });
      // Actually we'd need to fetch the hierarchy for the notebook to pre-populate CascadingFilter, 
      // but if the backend returns notebook_id we can just allow the user to keep it or re-select.
      setHierarchy(prev => ({ ...prev, notebook_id: n.notebook_id }));
    }
  }, [isEditing, noteRes]);

  const mutation = useMutation({
    mutationFn: (data) => {
      // The API expects 'notebook' (uuid) instead of 'notebook_id'
      const payload = { ...data, notebook: hierarchy.notebook_id || formData.notebook_id };
      delete payload.notebook_id;

      if (isEditing) {
        return notesService.updateNote(noteId, payload);
      } else {
        return notesService.createNote(payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['notes']);
      navigate(`/notes/${res.data.id}`);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save note');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!hierarchy.notebook_id && !formData.notebook_id) {
      setErrorMsg('Please select a Notebook.');
      return;
    }
    mutation.mutate(formData);
  };

  const handleCascadeChange = (vals) => {
    setHierarchy(vals);
  };

  if (isEditing && isLoading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{isEditing ? 'Edit Note' : 'Create Note'}</h1>
      
      {errorMsg && <div className="form-error">{errorMsg}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ background: 'var(--color-surface-raised)', padding: '15px', borderRadius: '8px' }}>
          <h4>Location</h4>
          <CascadingFilter onFilterChange={handleCascadeChange} initialValues={hierarchy} />
          {!hierarchy.notebook_id && formData.notebook_id && <p>Keeping current notebook. Use the filters to move.</p>}
        </div>

        <div className="form-group">
          <label>Title</label>
          <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
        </div>

        <div className="form-group">
          <label>Content</label>
          <textarea 
            required 
            rows="10" 
            style={{ width: '100%', padding: '10px', fontFamily: 'inherit', border: '1px solid var(--color-input-border)', borderRadius: '8px' }}
            value={formData.content} 
            onChange={e => setFormData({...formData, content: e.target.value})} 
          />
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'var(--color-surface-raised)', padding: '15px', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input type="checkbox" checked={formData.is_study_material} onChange={e => setFormData({...formData, is_study_material: e.target.checked})} />
            Is Study Material
          </label>

          {formData.is_study_material && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              Difficulty:
              <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} style={{ padding: '5px' }}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Note'}
          </button>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '10px 20px' }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
