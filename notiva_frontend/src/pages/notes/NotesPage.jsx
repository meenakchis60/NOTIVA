import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import notesService from '../../api/notesService';
import academicsService from '../../api/academicsService';
import { Search, Filter, BookOpen, Clock, Pin, Star, Archive, Trash2, Bell, Tag, FileText, Plus, Loader2, Check, Paperclip } from 'lucide-react';

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pinned', 'starred'
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedNb, setSelectedNb] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  // 1. Fetch Notes
  const { data: notesRes, isLoading: notesLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesService.getNotes(),
  });
  const notesRaw = notesRes?.data;
  const notes = Array.isArray(notesRaw)
    ? notesRaw
    : (notesRaw?.data?.results || notesRaw?.results || []);

  // 2. Fetch Academic Hierarchy for Filters
  const { data: semsRes } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => academicsService.getSemesters(),
  });
  const semsRaw = semsRes?.data;
  const semesters = Array.isArray(semsRaw)
    ? semsRaw
    : (semsRaw?.data?.results || semsRaw?.results || []);

  const { data: subsRes } = useQuery({
    queryKey: ['subjects', selectedSem],
    queryFn: () => academicsService.getSubjectsBySemester(selectedSem),
    enabled: Boolean(selectedSem)
  });
  const subsRaw = subsRes?.data;
  const subjects = Array.isArray(subsRaw)
    ? subsRaw
    : (subsRaw?.data?.results || subsRaw?.results || []);

  const { data: nbsRes } = useQuery({
    queryKey: ['notebooks', selectedSub],
    queryFn: () => academicsService.getNotebooksBySubject(selectedSub),
    enabled: Boolean(selectedSub)
  });
  const nbsRaw = nbsRes?.data;
  const notebooks = Array.isArray(nbsRaw)
    ? nbsRaw
    : (nbsRaw?.data?.results || nbsRaw?.results || []);

  // Filter Notes Logic
  const filteredNotes = notes.filter(n => {
    // Quick link state filter
    if (activeFilter === 'pinned' && !n.is_pinned) return false;
    if (activeFilter === 'starred' && !n.is_starred) return false;

    // Academic cascading filters (Semester -> Subject -> Notebook)
    if (selectedNb) {
      if (String(n.notebook_id) !== String(selectedNb)) return false;
    } else if (selectedSub) {
      const matchesSub = (n.subject_id && String(n.subject_id) === String(selectedSub)) ||
        notebooks.some(nb => String(nb.id || nb._id) === String(n.notebook_id));
      if (!matchesSub) return false;
    } else if (selectedSem) {
      const matchesSem = (n.semester_id && String(n.semester_id) === String(selectedSem)) ||
        subjects.some(sub => String(sub.id || sub._id) === String(n.subject_id));
      if (!matchesSem) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title && n.title.toLowerCase().includes(q);
      const matchContent = n.content && n.content.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }

    // Tag filter
    if (selectedTags.length > 0) {
      const contentStr = ((n.title || '') + ' ' + (n.content || '')).toLowerCase();
      const hasAnyTag = selectedTags.some(t => contentStr.includes(t.toLowerCase()));
      if (!hasAnyTag) return false;
    }

    return true;
  });

  const toggleTag = (tagName) => {
    setSelectedTags(prev => 
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const clearAllFilters = () => {
    setActiveFilter('all');
    setSelectedSem('');
    setSelectedSub('');
    setSelectedNb('');
    setSelectedTags([]);
    setSearchQuery('');
  };

  return (
    <div className="grid grid-cols-1 lg-grid-cols-4 gap-6 w-full h-full">
      
      {/* Left Sidebar (Col 1) */}
      <div className="flex-col gap-6 lg-col-span-1" style={{ gridColumn: 'span 1' }}>
        <div className="card shadow-sm border rounded-lg p-5 bg-surface">
          <div className="flex justify-between items-center mb-4 border-bottom pb-2">
            <h3 className="font-semibold text-lg flex items-center gap-2 m-0">
              <Filter size={18} className="text-primary"/> Academic Filters
            </h3>
            {(selectedSem || selectedSub || selectedNb) && (
              <button onClick={clearAllFilters} className="text-xs text-primary hover:underline">Reset</button>
            )}
          </div>
          
          <div className="form-group flex-col gap-2 mb-4">
            <label className="font-medium text-sm">Semester</label>
            <select 
              value={selectedSem} 
              onChange={e => { setSelectedSem(e.target.value); setSelectedSub(''); setSelectedNb(''); }}
              className="p-2 border rounded-lg bg-bg w-full"
            >
              <option value="">All Semesters</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group flex-col gap-2 mb-4">
            <label className="font-medium text-sm">Subject</label>
            <select 
              value={selectedSub} 
              onChange={e => { setSelectedSub(e.target.value); setSelectedNb(''); }}
              disabled={!selectedSem}
              className="p-2 border rounded-lg bg-bg w-full"
            >
              <option value="">{selectedSem ? 'All Subjects' : 'Select Semester first'}</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group flex-col gap-2">
            <label className="font-medium text-sm">Notebook</label>
            <select 
              value={selectedNb} 
              onChange={e => setSelectedNb(e.target.value)}
              disabled={!selectedSub}
              className="p-2 border rounded-lg bg-bg w-full"
            >
              <option value="">{selectedSub ? 'All Notebooks' : 'Select Subject first'}</option>
              {notebooks.map(nb => (
                <option key={nb.id} value={nb.id}>{nb.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card shadow-sm border rounded-lg p-5 bg-surface">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 border-bottom pb-2">
            <BookOpen size={18} className="text-primary"/> Quick Links
          </h3>
          <ul className="flex-col gap-3">
            <li>
              <button 
                onClick={() => { setActiveFilter('all'); clearAllFilters(); }}
                className={`flex items-center gap-2 font-medium w-full text-left ${activeFilter === 'all' && !selectedNb ? 'text-primary font-bold' : 'text-muted hover:text-primary'}`}
              >
                <FileText size={16}/> All Notes ({notes.length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveFilter('pinned')}
                className={`flex items-center gap-2 font-medium w-full text-left ${activeFilter === 'pinned' ? 'text-primary font-bold' : 'text-muted hover:text-primary'}`}
              >
                <Pin size={16}/> Pinned ({notes.filter(n => n.is_pinned).length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveFilter('starred')}
                className={`flex items-center gap-2 font-medium w-full text-left ${activeFilter === 'starred' ? 'text-primary font-bold' : 'text-muted hover:text-primary'}`}
              >
                <Star size={16}/> Starred ({notes.filter(n => n.is_starred).length})
              </button>
            </li>
            <li>
              <Link to="/notebooks" className="flex items-center gap-2 text-muted hover:text-primary transition-colors">
                <BookOpen size={16}/> Manage Notebooks
              </Link>
            </li>
            <li>
              <Link to="/trash" className="flex items-center gap-2 text-danger hover:underline">
                <Trash2 size={16}/> Trash
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Center Panel (Col 2 & 3) */}
      <div className="card shadow-sm border rounded-lg p-6 bg-surface flex-col lg-col-span-2" style={{ gridColumn: 'span 2', minHeight: '600px' }}>
        <div className="flex justify-between items-center mb-6 pb-4 border-bottom" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold uppercase tracking-wide m-0">NOTES</h2>
            {activeFilter !== 'all' && (
              <span className="badge badge-primary uppercase text-xs">{activeFilter}</span>
            )}
          </div>
          
          <div className="flex gap-3 items-center">
            <div className="relative" style={{ minWidth: '220px' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={16} style={{ top: '50%', transform: 'translateY(-50%)', left: '12px', position: 'absolute' }}/>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes..." 
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-bg focus:outline-primary"
                style={{ paddingLeft: '35px' }}
              />
            </div>
            <Link to="/notes/new" className="btn-primary flex items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} /> New Note
            </Link>
          </div>
        </div>

        {/* Content list */}
        {notesLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="loading-spinner text-primary" size={32} />
          </div>
        ) : filteredNotes.length > 0 ? (
          <div className="flex-col gap-4">
            {filteredNotes.map(note => (
              <div key={note.id} className="p-4 border rounded-lg bg-bg hover-bg-light transition-all flex justify-between items-start">
                <div className="flex-col gap-1" style={{ flex: 1 }}>
                  <div className="flex items-center gap-2">
                    {note.is_pinned && <Pin size={14} className="text-primary fill-current" />}
                    {note.is_starred && <Star size={14} className="text-amber-500 fill-current" />}
                    <Link to={`/notes/${note.id}`} className="font-semibold text-lg text-primary hover:underline">
                      {note.title}
                    </Link>
                  </div>
                  <p className="text-muted text-sm" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {note.content || 'No content provided.'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted flex-wrap">
                    {note.notebook_name && (
                      <span className="badge badge-muted">{note.notebook_name}</span>
                    )}
                    {note.attachments && note.attachments.length > 0 && (
                      <span className="badge badge-primary gap-1" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        <Paperclip size={12} /> {note.attachments.length} {note.attachments.length === 1 ? 'file' : 'files'}
                      </span>
                    )}
                    {note.is_study_material && (
                      <span className="badge badge-muted">Study Material</span>
                    )}
                    <span>{new Date(note.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link to={`/notes/${note.id}`} className="btn-secondary text-sm">View</Link>
                  <Link to={`/notes/${note.id}/edit`} className="btn-primary text-sm">Edit</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state flex-1 flex-col justify-center items-center h-full p-8 rounded-lg" style={{ border: '2px dashed var(--color-border)' }}>
            <FileText size={64} className="text-muted mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No notes match your filters.</h3>
            <p className="text-muted text-center max-w-md mb-6">
              {searchQuery || selectedTags.length > 0 || selectedSem || selectedSub || selectedNb
                ? 'Try resetting your search or academic filters to see all notes.'
                : 'Create your notes to build your academic knowledge base.'}
            </p>
            {searchQuery || selectedTags.length > 0 || selectedSem ? (
              <button onClick={clearAllFilters} className="btn-secondary">Clear Filters</button>
            ) : (
              <Link to="/notes/new" className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Create Your First Note
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar (Col 4) */}
      <div className="flex-col gap-6 lg-col-span-1" style={{ gridColumn: 'span 1' }}>
        <div className="card shadow-sm border rounded-lg p-5 bg-surface">
          <div className="flex justify-between items-center mb-4 border-bottom pb-2">
            <h3 className="font-semibold text-lg flex items-center gap-2 m-0">
              <Tag size={18} className="text-primary"/> Tags
            </h3>
            {selectedTags.length > 0 && (
              <button onClick={() => setSelectedTags([])} className="text-xs text-primary hover:underline">Clear</button>
            )}
          </div>
          
          <div className="flex-col gap-3 mb-6">
            {['Hadoop', 'MapReduce', 'Cloud', 'React', 'MongoDB', 'NoSQL'].map(tag => {
              const isChecked = selectedTags.includes(tag);
              return (
                <label key={tag} className="flex items-center gap-3 cursor-pointer p-2 hover-bg-light rounded-lg transition-colors border border-transparent">
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => toggleTag(tag)}
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" 
                  />
                  <span className={`font-medium text-sm ${isChecked ? 'text-primary font-bold' : ''}`}>{tag}</span>
                </label>
              );
            })}
          </div>
          
          <button 
            onClick={() => {}} 
            className="btn-secondary w-full py-2 flex items-center justify-center gap-2 font-medium text-sm"
          >
            <Tag size={16} /> Filter by Tags ({selectedTags.length})
          </button>
        </div>

        <div className="card shadow-sm border rounded-lg p-5 bg-surface">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 border-bottom pb-2">
            <Bell size={18} className="text-primary"/> Reminders
          </h3>
          
          <Link to="/reminders" className="btn-primary w-full py-2 mb-6 flex items-center justify-center gap-2">
            <Clock size={16} /> View Reminders
          </Link>
          
          <div className="p-4 bg-bg border rounded-lg text-center">
            <p className="font-medium mb-1">Active Study Session</p>
            <p className="text-sm text-muted">Big Data Analysis - Unit 1</p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
