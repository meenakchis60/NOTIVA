import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notesService from '../../api/notesService';
import CascadingFilter from '../../components/academics/CascadingFilter';
import { Link, useNavigate } from 'react-router-dom';

export default function NotesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    semester_id: undefined,
    subject_id: undefined,
    notebook_id: undefined,
    archived: false,
    deleted: false,
    pinned: undefined,
    starred: undefined,
    study_material: undefined,
    difficulty: undefined,
    ordering: '-updated_at',
  });

  const { data: notesRes, isLoading, error } = useQuery({
    queryKey: ['notes', filters],
    queryFn: () => notesService.getNotes(filters),
  });
  
  const notes = notesRes?.data?.results || [];

  const handleCascadeChange = (vals) => {
    setFilters(prev => ({ ...prev, ...vals }));
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === 'checkbox' ? checked : value;
    if (val === 'undefined' || val === '') val = undefined;
    setFilters(prev => ({ ...prev, [name]: val }));
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>My Notes</h1>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/notes/new')}>Create Note</button>
      </div>

      <div style={{ background: 'var(--color-surface-raised)', padding: '15px', marginTop: '20px', borderRadius: '8px' }}>
        <h3>Filters</h3>
        <CascadingFilter onFilterChange={handleCascadeChange} initialValues={filters} />
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <label>
            Ordering:
            <select name="ordering" value={filters.ordering} onChange={handleFilterChange}>
              <option value="-updated_at">Recently Updated</option>
              <option value="-created_at">Newest</option>
              <option value="created_at">Oldest</option>
              <option value="title">Title A-Z</option>
              <option value="-title">Title Z-A</option>
            </select>
          </label>
          <label>
            Study Material:
            <select name="study_material" value={filters.study_material ?? ''} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>
            Difficulty:
            <select name="difficulty" value={filters.difficulty ?? ''} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <label>
            <input type="checkbox" name="pinned" checked={filters.pinned || false} onChange={handleFilterChange} /> Pinned Only
          </label>
          <label>
            <input type="checkbox" name="starred" checked={filters.starred || false} onChange={handleFilterChange} /> Starred Only
          </label>
          <label>
            <input type="checkbox" name="archived" checked={filters.archived || false} onChange={handleFilterChange} /> Show Archived
          </label>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        {isLoading && <p>Loading notes...</p>}
        {error && <p className="form-error">Error loading notes: {error.message}</p>}
        {!isLoading && notes.length === 0 && <p>No notes found.</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
          {notes.map(note => (
            <div key={note.id} style={{ border: '1px solid var(--color-border)', padding: '15px', borderRadius: '8px', background: 'var(--color-surface)' }}>
              <h4><Link to={`/notes/${note.id}`}>{note.title}</Link></h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {note.notebook_name}
              </p>
              <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>
                {note.is_pinned && <span style={{ marginRight: '5px' }}>📌</span>}
                {note.is_starred && <span style={{ marginRight: '5px' }}>⭐</span>}
                {note.is_study_material && <span style={{ background: 'var(--color-primary-light)', padding: '2px 5px', borderRadius: '4px' }}>Study</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
