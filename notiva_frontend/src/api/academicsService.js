/**
 * academicsService.js
 *
 * API service for the academic hierarchy: Semester → Subject → Notebook.
 * Uses the shared axiosInstance (JWT tokens injected automatically).
 *
 * All functions return Axios promise objects. Callers handle errors.
 *
 * Cascading filter functions:
 *   - getSubjectsBySemester(semesterId) → GET /subjects/?semester_id=<id>
 *   - getNotebooksBySubject(subjectId)  → GET /notebooks/?subject_id=<id>
 *
 * These are the backbone of the cascading dropdown used in:
 *   Note creation, Note editing, Study/Browse, Advanced Search,
 *   Task creation, Assignment creation, Study Materials (Phase 3+).
 */

import axiosInstance from './axiosInstance'

const BASE = '/academics'

const academicsService = {
  // -------------------------------------------------------------------------
  // Semesters
  // -------------------------------------------------------------------------

  /**
   * Get all semesters owned by the authenticated user.
   * @returns Promise → { count, results: Semester[] }
   */
  getSemesters: () => axiosInstance.get(`${BASE}/semesters/`),

  /**
   * Get a single semester by ID (must belong to the authenticated user).
   * @param {string} id - Semester UUID
   */
  getSemester: (id) => axiosInstance.get(`${BASE}/semesters/${id}/`),

  /**
   * Create a new semester.
   * @param {Object} data - { name, academic_year? }
   */
  createSemester: (data) => axiosInstance.post(`${BASE}/semesters/`, data),

  /**
   * Fully update a semester (PUT).
   * @param {string} id
   * @param {Object} data - { name, academic_year }
   */
  updateSemester: (id, data) => axiosInstance.put(`${BASE}/semesters/${id}/`, data),

  /**
   * Partially update a semester (PATCH).
   * @param {string} id
   * @param {Object} data - Subset of semester fields
   */
  patchSemester: (id, data) => axiosInstance.patch(`${BASE}/semesters/${id}/`, data),

  /**
   * Delete a semester and all its subjects and notebooks.
   * @param {string} id
   */
  deleteSemester: (id) => axiosInstance.delete(`${BASE}/semesters/${id}/`),

  // -------------------------------------------------------------------------
  // Subjects
  // -------------------------------------------------------------------------

  /**
   * Get all subjects belonging to the authenticated user's hierarchy.
   * @returns Promise → { count, results: Subject[] }
   */
  getSubjects: () => axiosInstance.get(`${BASE}/subjects/`),

  /**
   * Get subjects filtered by semester — cascading filter.
   * Only returns subjects if the semester belongs to the authenticated user.
   * @param {string} semesterId - Semester UUID
   */
  getSubjectsBySemester: (semesterId) =>
    axiosInstance.get(`${BASE}/subjects/?semester_id=${semesterId}`),

  /**
   * Get a single subject by ID.
   * @param {string} id - Subject UUID
   */
  getSubject: (id) => axiosInstance.get(`${BASE}/subjects/${id}/`),

  /**
   * Create a new subject under a semester.
   * @param {Object} data - { semester: uuid, name, code?, description? }
   */
  createSubject: (data) => axiosInstance.post(`${BASE}/subjects/`, data),

  /**
   * Fully update a subject (PUT).
   * @param {string} id
   * @param {Object} data
   */
  updateSubject: (id, data) => axiosInstance.put(`${BASE}/subjects/${id}/`, data),

  /**
   * Partially update a subject (PATCH).
   * @param {string} id
   * @param {Object} data
   */
  patchSubject: (id, data) => axiosInstance.patch(`${BASE}/subjects/${id}/`, data),

  /**
   * Delete a subject and all its notebooks.
   * @param {string} id
   */
  deleteSubject: (id) => axiosInstance.delete(`${BASE}/subjects/${id}/`),

  // -------------------------------------------------------------------------
  // Notebooks
  // -------------------------------------------------------------------------

  /**
   * Get all notebooks belonging to the authenticated user's hierarchy.
   * @returns Promise → { count, results: Notebook[] }
   */
  getNotebooks: () => axiosInstance.get(`${BASE}/notebooks/`),

  /**
   * Get notebooks filtered by subject — cascading filter.
   * Only returns notebooks if the subject belongs to the authenticated user.
   * @param {string} subjectId - Subject UUID
   */
  getNotebooksBySubject: (subjectId) =>
    axiosInstance.get(`${BASE}/notebooks/?subject_id=${subjectId}`),

  /**
   * Get a single notebook by ID.
   * @param {string} id - Notebook UUID
   */
  getNotebook: (id) => axiosInstance.get(`${BASE}/notebooks/${id}/`),

  /**
   * Create a new notebook under a subject.
   * @param {Object} data - { subject: uuid, name, description? }
   */
  createNotebook: (data) => axiosInstance.post(`${BASE}/notebooks/`, data),

  /**
   * Fully update a notebook (PUT).
   * @param {string} id
   * @param {Object} data
   */
  updateNotebook: (id, data) => axiosInstance.put(`${BASE}/notebooks/${id}/`, data),

  /**
   * Partially update a notebook (PATCH).
   * @param {string} id
   * @param {Object} data
   */
  patchNotebook: (id, data) => axiosInstance.patch(`${BASE}/notebooks/${id}/`, data),

  /**
   * Delete a notebook.
   * @param {string} id
   */
  deleteNotebook: (id) => axiosInstance.delete(`${BASE}/notebooks/${id}/`),
}

export default academicsService
