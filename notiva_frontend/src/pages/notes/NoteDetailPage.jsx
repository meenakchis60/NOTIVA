import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notesService from '../../api/notesService';
import axiosInstance from '../../api/axiosInstance';
import { 
  ArrowLeft, Edit, Trash2, Pin, Star, Clock, Paperclip, 
  FileText, Download, Loader2, Tag, BookOpen, AlertCircle, 
  Plus, X, FileCode, Archive, UploadCloud, CheckCircle2 
} from 'lucide-react';

export default function NoteDetailPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('pdf');
  const [newFileSize, setNewFileSize] = useState('1.8 MB');

  const { data: noteRes, isLoading, error } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => notesService.getNote(noteId),
    enabled: Boolean(noteId && noteId !== 'undefined')
  });
  const noteRaw = noteRes?.data;
  const note = (noteRaw && noteRaw.data) ? noteRaw.data : noteRaw;

  const delMut = useMutation({
    mutationFn: () => notesService.deleteNote(noteId),
    onSuccess: () => navigate('/notes')
  });

  const actionMut = useMutation({
    mutationFn: (action) => notesService[action](noteId),
    onSuccess: () => queryClient.invalidateQueries(['note', noteId])
  });

  const addAttachmentMut = useMutation({
    mutationFn: (newAtt) => axiosInstance.post(`/notes/${noteId}/attachments/`, newAtt),
    onSuccess: () => {
      queryClient.invalidateQueries(['note', noteId]);
      queryClient.invalidateQueries(['notes']);
      setShowAttachModal(false);
      setNewFileName('');
    }
  });

  const deleteAttachmentMut = useMutation({
    mutationFn: (attId) => axiosInstance.delete(`/notes/${noteId}/attachments/${attId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries(['note', noteId]);
      queryClient.invalidateQueries(['notes']);
    }
  });

  const handleDownload = (att) => {
    const fileHeader = `==========================================================\n` +
      `NOTIVA ACADEMIC STUDY RESOURCE\n` +
      `File: ${att.name}\n` +
      `Subject Note: ${note.title}\n` +
      `Notebook: ${note.notebook_name || 'General'}\n` +
      `Date Uploaded: ${new Date(att.uploaded_at || Date.now()).toLocaleDateString()}\n` +
      `==========================================================\n\n` +
      `[CONTENT PREVIEW FOR ${att.name.toUpperCase()}]\n\n` +
      `${note.content}\n\n` +
      `End of file: ${att.name}`;

    const blob = new Blob([fileHeader], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFileBadge = (fileType, fileName = '') => {
    const ext = (fileType || fileName.split('.').pop() || 'pdf').toLowerCase();
    if (ext === 'pdf') {
      return {
        icon: <FileText size={20} className="text-red-500" />,
        bg: 'rgba(239, 68, 68, 0.1)',
        color: '#ef4444',
        label: 'PDF'
      };
    }
    if (['py', 'js', 'json', 'ts', 'java', 'cpp', 'html', 'css', 'sql'].includes(ext)) {
      return {
        icon: <FileCode size={20} className="text-blue-500" />,
        bg: 'rgba(59, 130, 246, 0.1)',
        color: '#3b82f6',
        label: ext.toUpperCase()
      };
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
      return {
        icon: <Archive size={20} className="text-amber-500" />,
        bg: 'rgba(245, 158, 11, 0.1)',
        color: '#f59e0b',
        label: 'ZIP'
      };
    }
    return {
      icon: <FileText size={20} className="text-emerald-500" />,
      bg: 'rgba(16, 185, 129, 0.1)',
      color: '#10b981',
      label: ext.toUpperCase()
    };
  };

  if (isLoading) return (
    <div className="empty-state">
      <Loader2 className="loading-spinner mb-4" />
      <h3 className="font-semibold">Loading note...</h3>
    </div>
  );
  
  if (error || !note) return (
    <div className="empty-state">
      <AlertCircle size={48} className="text-danger mb-4" />
      <h3 className="font-semibold text-danger">Error loading note</h3>
      <p className="text-muted">The note may have been deleted or you don't have permission to view it.</p>
      <button className="btn-primary mt-4" onClick={() => navigate('/notes')}>Back to Notes</button>
    </div>
  );

  const attachments = note.attachments || [];

  return (
    <div className="flex-col w-full" style={{ maxWidth: '1050px', margin: '0 auto', gap: '1.5rem' }}>
      <button 
        onClick={() => navigate('/notes')} 
        className="btn-secondary flex items-center gap-2" 
        style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', padding: '0', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
      >
        <ArrowLeft size={16} /> Back to Notes
      </button>

      {/* Main Note Card */}
      <div className="card shadow-sm border rounded-lg p-0 bg-surface overflow-hidden">
        {/* Header */}
        <div className="p-6 border-bottom" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
            <div className="flex-col gap-2">
              <div className="flex items-center gap-2 text-muted text-sm font-medium">
                <BookOpen size={14} /> {note.notebook_name || 'No Notebook'}
                <span>•</span>
                <Clock size={14} /> Updated {new Date(note.updated_at || Date.now()).toLocaleDateString()}
              </div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2 m-0">
                {note.title}
              </h1>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => actionMut.mutate(note.is_pinned ? 'unpinNote' : 'pinNote')} 
                className="btn-icon" 
                title={note.is_pinned ? 'Unpin' : 'Pin'}
                style={{ color: note.is_pinned ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
              >
                <Pin size={20} />
              </button>
              <button 
                onClick={() => actionMut.mutate(note.is_starred ? 'unstarNote' : 'starNote')} 
                className="btn-icon" 
                title={note.is_starred ? 'Unstar' : 'Star'}
                style={{ color: note.is_starred ? '#eab308' : 'var(--color-text-muted)', fill: note.is_starred ? '#eab308' : 'none' }}
              >
                <Star size={20} />
              </button>
              <Link to={`/notes/${note.id}/edit`} className="btn-secondary flex items-center gap-2">
                <Edit size={16} /> <span className="hidden md:inline">Edit</span>
              </Link>
              <button 
                onClick={() => { if(window.confirm('Move to trash?')) delMut.mutate(); }} 
                className="btn-secondary flex items-center gap-2" 
                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              >
                <Trash2 size={16} /> <span className="hidden md:inline">Delete</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {note.is_study_material && (
              <span className="badge badge-primary gap-1"><BookOpen size={12}/> Study Material</span>
            )}
            {note.difficulty && (
              <span className="badge badge-muted">Difficulty: {note.difficulty}</span>
            )}
            {note.study_status && (
              <span className="badge badge-muted">Status: {note.study_status}</span>
            )}
            {attachments.length > 0 && (
              <span className="badge badge-muted gap-1 text-primary">
                <Paperclip size={12} /> {attachments.length} Attached File{attachments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 bg-bg" style={{ minHeight: '380px' }}>
          <div 
            className="prose max-w-none" 
            style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.8', 
              fontSize: '1.02rem', 
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit'
            }}
          >
            {note.content || <span className="text-muted italic">This note has no content yet. Click Edit to add notes.</span>}
          </div>
          
          {note.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Tag size={16} className="text-muted mt-1" />
              {note.tags.map(t => (
                <span key={t.id || t.name} className="badge badge-muted">{t.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Attached Files & Study Documents Section */}
      <div className="card shadow-sm border rounded-lg bg-surface p-6">
        <div className="flex justify-between items-center mb-6 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Paperclip size={20} className="text-primary" />
            <h2 className="text-lg font-bold m-0 text-primary">
              Attached Files & Resources
            </h2>
            <span className="badge badge-muted ml-2">
              {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <button 
            onClick={() => setShowAttachModal(true)} 
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Attach File
          </button>
        </div>

        {attachments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attachments.map((att, idx) => {
              const badge = getFileBadge(att.file_type, att.name);
              return (
                <div 
                  key={att.id || att._id || idx} 
                  className="p-4 border rounded-lg bg-bg flex justify-between items-center gap-3 hover-bg-light transition-all"
                >
                  <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                    <div 
                      className="flex items-center justify-center rounded-lg"
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        background: badge.bg, 
                        flexShrink: 0 
                      }}
                    >
                      {badge.icon}
                    </div>
                    <div className="flex-col gap-1" style={{ minWidth: 0 }}>
                      <p className="font-semibold text-sm m-0 text-truncate" title={att.name} style={{ maxWidth: '240px' }}>
                        {att.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-medium" style={{ color: badge.color }}>{badge.label}</span>
                        <span>•</span>
                        <span>{att.file_size || '1.5 MB'}</span>
                        <span>•</span>
                        <span>{new Date(att.uploaded_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                    <button 
                      onClick={() => handleDownload(att)} 
                      className="btn-secondary flex items-center gap-1 text-xs py-1 px-3"
                      title="Download file"
                    >
                      <Download size={14} /> Download
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Remove attachment ${att.name}?`)) {
                          deleteAttachmentMut.mutate(att.id || att._id);
                        }
                      }} 
                      className="btn-icon text-muted hover:text-danger p-1"
                      title="Remove file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-8 border rounded-lg bg-bg" style={{ borderStyle: 'dashed' }}>
            <UploadCloud size={40} className="text-muted mx-auto mb-3 opacity-60" />
            <h4 className="font-semibold text-base mb-1">No files attached to this note</h4>
            <p className="text-muted text-sm max-w-md mx-auto mb-4">
              Attach lecture slides, reference whitepapers, datasets, Python scripts, or lab assignments directly to this note.
            </p>
            <button 
              onClick={() => setShowAttachModal(true)} 
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              <Plus size={15} /> Attach Study Resource
            </button>
          </div>
        )}
      </div>

      {/* Attach File Modal */}
      {showAttachModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
        >
          <div className="card shadow-lg bg-surface border rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4 pb-2 border-bottom" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Paperclip size={18} className="text-primary" />
                <h3 className="font-bold text-lg m-0">Attach Study File</h3>
              </div>
              <button 
                onClick={() => setShowAttachModal(false)}
                className="btn-icon p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newFileName.trim()) return;
                const extension = newFileType;
                let fullName = newFileName.trim();
                if (!fullName.includes('.')) {
                  fullName = `${fullName}.${extension}`;
                }
                addAttachmentMut.mutate({
                  name: fullName,
                  file_type: extension,
                  file_size: newFileSize,
                  url: '#'
                });
              }}
              className="flex-col gap-4"
            >
              <div>
                <label className="text-sm font-semibold mb-1 block">File Name / Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. HDFS_Cluster_Lab_Manual"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-bg text-sm focus:outline-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-1 block">File Type</label>
                  <select 
                    value={newFileType} 
                    onChange={e => setNewFileType(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-bg text-sm"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="py">Python Script (.py)</option>
                    <option value="json">JSON Config (.json)</option>
                    <option value="zip">ZIP Archive (.zip)</option>
                    <option value="csv">Dataset CSV (.csv)</option>
                    <option value="docx">Word Document (.docx)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Estimated Size</label>
                  <select 
                    value={newFileSize} 
                    onChange={e => setNewFileSize(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-bg text-sm"
                  >
                    <option value="450 KB">450 KB</option>
                    <option value="1.2 MB">1.2 MB</option>
                    <option value="2.4 MB">2.4 MB</option>
                    <option value="4.8 MB">4.8 MB</option>
                    <option value="12.5 MB">12.5 MB</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-bg rounded-lg border text-xs text-muted flex items-start gap-2 mt-2">
                <CheckCircle2 size={16} className="text-primary mt-0.5" style={{ flexShrink: 0 }} />
                <span>The file will be linked to this note, enabling download and study tracking.</span>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAttachModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addAttachmentMut.isPending}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {addAttachmentMut.isPending && <Loader2 size={14} className="loading-spinner" />}
                  Attach File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}