import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notesService from '../../api/notesService';

export default function TrashPage() {
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['trashNotes'],
    queryFn: () => notesService.getNotes({ deleted: true }),
  });
  const notes = res?.data?.results || [];

  const restoreMut = useMutation({
    mutationFn: (id) => notesService.restoreNote(id),
    onSuccess: () => queryClient.invalidateQueries(['trashNotes', 'notes'])
  });

  const permDelMut = useMutation({
    mutationFn: (id) => notesService.permanentlyDeleteNote(id),
    onSuccess: () => queryClient.invalidateQueries(['trashNotes'])
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1>Trash</h1>
      <p style={{ color: 'gray' }}>Deleted notes appear here.</p>

      {isLoading ? <p>Loading...</p> : (
        <table style={{ width: '100%', textAlign: 'left', marginTop: '20px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: '10px' }}>Title</th>
              <th style={{ padding: '10px' }}>Deleted At</th>
              <th style={{ padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 && <tr><td colSpan="3" style={{ padding: '10px' }}>No notes in trash.</td></tr>}
            {notes.map(note => (
              <tr key={note.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{note.title}</td>
                <td style={{ padding: '10px' }}>{new Date(note.deleted_at).toLocaleDateString()}</td>
                <td style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                  <button onClick={() => restoreMut.mutate(note.id)}>Restore</button>
                  <button style={{ color: 'red' }} onClick={() => { if(window.confirm('Permanently delete this note? This action cannot be undone.')) permDelMut.mutate(note.id) }}>Delete Permanently</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
