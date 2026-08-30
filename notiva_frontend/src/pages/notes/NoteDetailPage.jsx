import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2, Pin, Star, Copy, FileText, CheckSquare, Paperclip, Clock, MessageSquare, Plus, Download } from 'lucide-react';
import notesService from '../../api/notesService';
import checklistsService from '../../api/checklistsService';
import attachmentsService from '../../api/attachmentsService';
import versionsService from '../../api/versionsService';
import collabService from '../../api/collabService';

export default function NoteDetailPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('content');

  const { data: res, isLoading, error } = useQuery({ queryKey: ['note', noteId], queryFn: () => notesService.getNote(noteId) });
  const note = res?.data;

  const { data: chkRes } = useQuery({ queryKey: ['checklists', noteId], queryFn: () => checklistsService.getChecklists(noteId) });
  const checklists = chkRes?.data?.results || [];

  const { data: attRes } = useQuery({ queryKey: ['attachments', noteId], queryFn: () => attachmentsService.getAttachments(noteId) });
  const attachments = attRes?.data?.results || [];

  const { data: verRes } = useQuery({ queryKey: ['versions', noteId], queryFn: () => versionsService.getVersions(noteId) });
  const versions = verRes?.data?.results || [];

  const { data: comRes } = useQuery({ queryKey: ['comments', noteId], queryFn: () => collabService.getComments(noteId) });
  const comments = comRes?.data?.results || [];

  // Mutations
  const actionMut = useMutation({
    mutationFn: (action) => notesService[action](noteId),
    onSuccess: () => queryClient.invalidateQueries(['note', noteId])
  });

  const delMut = useMutation({
    mutationFn: () => notesService.deleteNote(noteId),
    onSuccess: () => navigate('/notes')
  });

  // Comments Mutation
  const [newComment, setNewComment] = useState('');
  const commentMut = useMutation({
    mutationFn: (content) => collabService.addComment(noteId, content),
    onSuccess: () => { queryClient.invalidateQueries(['comments', noteId]); setNewComment(''); }
  });

  // Attachments Mutation
  const attachMut = useMutation({
    mutationFn: (file) => attachmentsService.createAttachment(noteId, file),
    onSuccess: () => queryClient.invalidateQueries(['attachments', noteId])
  });

  // Restore Version
  const restoreMut = useMutation({
    mutationFn: (vId) => versionsService.restoreVersion(vId),
    onSuccess: () => { queryClient.invalidateQueries(['note', noteId]); queryClient.invalidateQueries(['versions', noteId]); }
  });

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading note...</div>;
  if (error || !note) return <div style={{ padding: '2rem', color: 'red' }}>Error loading note.</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--color-surface)', borderRadius: '8px', minHeight: '80vh', border: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button onClick={() => navigate('/notes')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', width: 'max-content' }}>
          <ArrowLeft size={16} /> Back to Notes
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              Notebook: {note.notebook_name} | Created: {new Date(note.created_at).toLocaleDateString()}
            </div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2rem' }}>
              {note.is_pinned && <Pin size={24} color="var(--color-primary)" />}
              {note.title}
              {note.is_starred && <Star size={24} color="gold" fill="gold" />}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => actionMut.mutate(note.is_pinned ? 'unpinNote' : 'pinNote')} title="Pin" style={{ padding: '0.5rem', background: 'var(--color-bg)', borderRadius: '6px' }}><Pin size={18} /></button>
            <button onClick={() => actionMut.mutate(note.is_starred ? 'unstarNote' : 'starNote')} title="Star" style={{ padding: '0.5rem', background: 'var(--color-bg)', borderRadius: '6px' }}><Star size={18} /></button>
            <Link to={`/notes/${note.id}/edit`} style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: 'white', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Edit size={16} /> Edit</Link>
            <button onClick={() => { if(window.confirm('Move to trash?')) delMut.mutate(); }} style={{ padding: '0.5rem 1rem', background: 'var(--color-danger)', color: 'white', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trash2 size={16} /> Delete</button>
          </div>
        </div>

        {note.is_study_material && (
          <div style={{ display: 'flex', gap: '1rem', background: 'var(--color-primary-light)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--color-primary)' }}>
            <span><strong>Difficulty:</strong> {note.difficulty}</span>
            <span><strong>Status:</strong> {note.study_status || 'NOT_STARTED'}</span>
            {note.estimated_read_time && <span><strong>Est. Time:</strong> {note.estimated_read_time} min</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
        {[
          { id: 'content', label: 'Content', icon: <FileText size={16} /> },
          { id: 'checklists', label: `Checklists (${checklists.length})`, icon: <CheckSquare size={16} /> },
          { id: 'attachments', label: `Attachments (${attachments.length})`, icon: <Paperclip size={16} /> },
          { id: 'comments', label: `Comments (${comments.length})`, icon: <MessageSquare size={16} /> },
          { id: 'versions', label: `History (${versions.length})`, icon: <Clock size={16} /> }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : 'none', color: activeTab === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: activeTab === t.id ? 600 : 400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '2rem' }}>
        {activeTab === 'content' && (
          <>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
              {note.content}
            </div>
            {note.tags?.length > 0 && (
              <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
                {note.tags.map(t => <span key={t.id} style={{ padding: '0.25rem 0.75rem', background: 'var(--color-bg-secondary)', borderRadius: '999px', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}>{t.name}</span>)}
              </div>
            )}
          </>
        )}

        {activeTab === 'checklists' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Checklists</h3>
            {checklists.map(c => (
              <div key={c.id} className="card" style={{ marginBottom: '1rem' }}>
                <h4>{c.title}</h4>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Attachments</h3>
            <input type="file" onChange={(e) => { if(e.target.files[0]) attachMut.mutate(e.target.files[0]); }} style={{ marginBottom: '1rem' }} />
            {attachments.map(a => (
              <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> {a.filename}</span>
                <a href={a.file} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}><Download size={16} /></a>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'comments' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Comments</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1 }} />
              <button className="btn-primary" onClick={() => { if(newComment) commentMut.mutate(newComment); }}>Post</button>
            </div>
            {comments.map(c => (
              <div key={c.id} style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{c.user_name}</strong>
                <p style={{ marginTop: '0.25rem' }}>{c.content}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'versions' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Version History</h3>
            {versions.map(v => (
              <div key={v.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong>{new Date(v.created_at).toLocaleString()}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Created by Note Update</div>
                </div>
                <button className="btn-primary" onClick={() => { if(window.confirm('Restore this version? Current note will be replaced.')) restoreMut.mutate(v.id); }}>Restore</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}