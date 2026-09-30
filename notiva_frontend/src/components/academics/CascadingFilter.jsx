import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import academicsService from '../../api/academicsService';

function CascadingFilter({ onFilterChange, initialValues = {} }) {
  const [semesterId, setSemesterId] = useState(initialValues.semester_id || '');
  const [subjectId, setSubjectId] = useState(initialValues.subject_id || '');
  const [notebookId, setNotebookId] = useState(initialValues.notebook_id || '');

  // Helper to safely extract results array from any response shape
  const extractList = (res) => {
    const raw = res?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.results)) return raw.results;
    if (Array.isArray(raw?.data?.results)) return raw.data.results;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  };

  // Semesters
  const { data: semestersRes, isLoading: loadingSemesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => academicsService.getSemesters(),
  });
  const semesters = extractList(semestersRes);

  // Subjects (dependent on Semester)
  const { data: subjectsRes, isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects', semesterId],
    queryFn: () => academicsService.getSubjectsBySemester(semesterId),
    enabled: Boolean(semesterId),
  });
  const subjects = extractList(subjectsRes);

  // Notebooks (dependent on Subject)
  const { data: notebooksRes, isLoading: loadingNotebooks } = useQuery({
    queryKey: ['notebooks', subjectId],
    queryFn: () => academicsService.getNotebooksBySubject(subjectId),
    enabled: Boolean(subjectId),
  });
  const notebooks = extractList(notebooksRes);

  // Synchronize initialValues when they load asynchronously
  useEffect(() => {
    if (initialValues.semester_id !== undefined && initialValues.semester_id !== semesterId) {
      setSemesterId(initialValues.semester_id || '');
    }
    if (initialValues.subject_id !== undefined && initialValues.subject_id !== subjectId) {
      setSubjectId(initialValues.subject_id || '');
    }
    if (initialValues.notebook_id !== undefined && initialValues.notebook_id !== notebookId) {
      setNotebookId(initialValues.notebook_id || '');
    }
  }, [initialValues.semester_id, initialValues.subject_id, initialValues.notebook_id]);

  const handleSemesterChange = (newSem) => {
    setSemesterId(newSem);
    setSubjectId('');
    setNotebookId('');
    if (onFilterChange) {
      onFilterChange({
        semester_id: newSem || undefined,
        subject_id: undefined,
        notebook_id: undefined,
      });
    }
  };

  const handleSubjectChange = (newSub) => {
    setSubjectId(newSub);
    setNotebookId('');
    if (onFilterChange) {
      onFilterChange({
        semester_id: semesterId || undefined,
        subject_id: newSub || undefined,
        notebook_id: undefined,
      });
    }
  };

  const handleNotebookChange = (newNb) => {
    setNotebookId(newNb);
    if (onFilterChange) {
      onFilterChange({
        semester_id: semesterId || undefined,
        subject_id: subjectId || undefined,
        notebook_id: newNb || undefined,
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md-grid-cols-3 gap-3 w-full">
      <div className="flex-col gap-1.5" style={{ minWidth: '160px' }}>
        <label className="text-xs font-semibold text-muted uppercase tracking-wider">Semester</label>
        <select 
          value={semesterId} 
          onChange={(e) => handleSemesterChange(e.target.value)} 
          disabled={loadingSemesters} 
          className="p-2.5 border rounded-lg bg-bg text-sm font-medium w-full focus:outline-primary"
        >
          <option value="">All Semesters</option>
          {semesters.map(s => (
            <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-col gap-1.5" style={{ minWidth: '160px' }}>
        <label className="text-xs font-semibold text-muted uppercase tracking-wider">Subject</label>
        <select 
          value={subjectId} 
          onChange={(e) => handleSubjectChange(e.target.value)} 
          disabled={!semesterId || loadingSubjects} 
          className="p-2.5 border rounded-lg bg-bg text-sm font-medium w-full focus:outline-primary disabled:opacity-50"
        >
          <option value="">{semesterId ? 'All Subjects' : 'Select Semester First'}</option>
          {subjects.map(s => (
            <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-col gap-1.5" style={{ minWidth: '160px' }}>
        <label className="text-xs font-semibold text-muted uppercase tracking-wider">Notebook</label>
        <select 
          value={notebookId} 
          onChange={(e) => handleNotebookChange(e.target.value)} 
          disabled={!subjectId || loadingNotebooks} 
          className="p-2.5 border rounded-lg bg-bg text-sm font-medium w-full focus:outline-primary disabled:opacity-50"
        >
          <option value="">{subjectId ? 'All Notebooks' : 'Select Subject First'}</option>
          {notebooks.map(n => (
            <option key={n.id || n._id} value={n.id || n._id}>{n.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default React.memo(CascadingFilter);
