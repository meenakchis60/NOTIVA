import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notesService from '../../api/notesService';
import { Trash2, RefreshCcw, AlertTriangle, FileText, Loader2 } from 'lucide-react';

export default function TrashPage() {
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['trashNotes'],
    queryFn: () => notesService.getNotes({ deleted: true }),
  });
  const notesRaw = res?.data;
  const notes = Array.isArray(notesRaw) ? notesRaw : (notesRaw?.data?.results || notesRaw?.results || []);

  const restoreMut = useMutation({
    mutationFn: (id) => notesService.restoreNote(id),
    onSuccess: () => queryClient.invalidateQueries(['trashNotes', 'notes'])
  });

  const permDelMut = useMutation({
    mutationFn: (id) => notesService.permanentlyDeleteNote(id),
    onSuccess: () => queryClient.invalidateQueries(['trashNotes'])
  });

  return (
    <div className="flex-col w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Trash2 size={28} className="text-danger" /> Trash</h1>
          <p className="text-muted mt-4">Notes in the trash can be restored or permanently deleted.</p>
        </div>
      </div>

      <div className="card shadow-sm border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="loading-spinner mb-4" />
            <h3 className="font-semibold">Loading trash...</h3>
          </div>
        ) : notes.length === 0 ? (
          <div className="empty-state">
            <Trash2 size={48} className="text-muted mb-4" />
            <h3 className="font-semibold mb-2">Trash is empty</h3>
            <p className="text-muted">You have no deleted notes.</p>
          </div>
        ) : (
          <div className="flex-col">
            <div className="grid grid-cols-4 p-4 bg-bg border-bottom font-semibold text-muted text-sm uppercase" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="col-span-2" style={{ gridColumn: 'span 2' }}>Note Title</div>
              <div>Deleted Date</div>
              <div className="text-right">Actions</div>
            </div>
            
            <div className="flex-col">
              {notes.map(note => (
                <div key={note.id} className="grid grid-cols-4 p-4 items-center hover-bg-light transition-all" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="col-span-2 flex items-center gap-3" style={{ gridColumn: 'span 2' }}>
                    <div className="p-2 bg-bg rounded-lg border">
                      <FileText size={16} className="text-muted" />
                    </div>
                    <span className="font-medium text-lg">{note.title}</span>
                  </div>
                  
                  <div className="text-muted">
                    {note.deleted_at ? new Date(note.deleted_at).toLocaleDateString() : 'Unknown'}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => restoreMut.mutate(note.id)} 
                      className="btn-secondary flex items-center gap-2"
                    >
                      <RefreshCcw size={16} /> <span className="hidden md:inline">Restore</span>
                    </button>
                    <button 
                      className="btn-secondary flex items-center gap-2"
                      style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                      onClick={() => { if(window.confirm('Permanently delete this note? This action cannot be undone.')) permDelMut.mutate(note.id) }}
                    >
                      <Trash2 size={16} /> <span className="hidden md:inline">Delete Forever</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
