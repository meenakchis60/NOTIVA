import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import academicsService from '../../api/academicsService';

export default function CascadingFilter({ onFilterChange, initialValues = {} }) {
  const [semesterId, setSemesterId] = useState(initialValues.semester_id || '');
  const [subjectId, setSubjectId] = useState(initialValues.subject_id || '');
  const [notebookId, setNotebookId] = useState(initialValues.notebook_id || '');

  // Semesters
  const { data: semestersRes, isLoading: loadingSemesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => academicsService.getSemesters(),
  });
  const semesters = semestersRes?.data?.results || [];

  // Subjects (dependent on Semester)
  const { data: subjectsRes, isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects', semesterId],
    queryFn: () => academicsService.getSubjectsBySemester(semesterId),
    enabled: !!semesterId,
  });
  const subjects = subjectsRes?.data?.results || [];

  // Notebooks (dependent on Subject)
  const { data: notebooksRes, isLoading: loadingNotebooks } = useQuery({
    queryKey: ['notebooks', subjectId],
    queryFn: () => academicsService.getNotebooksBySubject(subjectId),
    enabled: !!subjectId,
  });
  const notebooks = notebooksRes?.data?.results || [];

  // Cascade resets
  useEffect(() => {
    if (semesterId) {
      if (!subjects.find(s => s.id === subjectId)) {
        setSubjectId('');
      }
    } else {
      setSubjectId('');
    }
  }, [semesterId, subjects]);

  useEffect(() => {
    if (subjectId) {
      if (!notebooks.find(n => n.id === notebookId)) {
        setNotebookId('');
      }
    } else {
      setNotebookId('');
    }
  }, [subjectId, notebooks]);

  // Report changes
  useEffect(() => {
    onFilterChange({
      semester_id: semesterId || undefined,
      subject_id: subjectId || undefined,
      notebook_id: notebookId || undefined,
    });
  }, [semesterId, subjectId, notebookId]);

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label>Semester</label>
        <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} disabled={loadingSemesters} style={{ padding: '8px' }}>
          <option value="">All Semesters</option>
          {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label>Subject</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!semesterId || loadingSubjects} style={{ padding: '8px' }}>
          <option value="">{semesterId ? 'All Subjects' : 'Select Semester First'}</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label>Notebook</label>
        <select value={notebookId} onChange={(e) => setNotebookId(e.target.value)} disabled={!subjectId || loadingNotebooks} style={{ padding: '8px' }}>
          <option value="">{subjectId ? 'All Notebooks' : 'Select Subject First'}</option>
          {notebooks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>
    </div>
  );
}
