import axiosInstance from './axiosInstance'

const BASE = '/notes'

const notesService = {
  // Base CRUD
  getNotes: (filters = {}) => {
    const params = new URLSearchParams()
    
    // Academic hierarchy
    if (filters.semester_id) params.append('semester_id', filters.semester_id)
    if (filters.subject_id) params.append('subject_id', filters.subject_id)
    if (filters.notebook_id) params.append('notebook_id', filters.notebook_id)
    
    // Phase 4 filters
    if (filters.tag_id) params.append('tag_id', filters.tag_id)
    if (filters.study_material !== undefined) params.append('study_material', filters.study_material)
    if (filters.difficulty) params.append('difficulty', filters.difficulty)

    // States
    if (filters.archived !== undefined) params.append('archived', filters.archived)
    if (filters.deleted !== undefined) params.append('deleted', filters.deleted)
    if (filters.pinned !== undefined) params.append('pinned', filters.pinned)
    if (filters.starred !== undefined) params.append('starred', filters.starred)
    
    // Ordering
    if (filters.ordering) params.append('ordering', filters.ordering)
    
    const queryString = params.toString()
    const url = queryString ? `${BASE}/?${queryString}` : `${BASE}/`
    return axiosInstance.get(url)
  },

  getNote: (id) => axiosInstance.get(`${BASE}/${id}/`),
  createNote: (data) => axiosInstance.post(`${BASE}/`, data),
  updateNote: (id, data) => axiosInstance.put(`${BASE}/${id}/`, data),
  patchNote: (id, data) => axiosInstance.patch(`${BASE}/${id}/`, data),
  deleteNote: (id) => axiosInstance.delete(`${BASE}/${id}/`), // Soft delete

  // Actions
  restoreNote: (id) => axiosInstance.post(`${BASE}/${id}/restore/`),
  permanentlyDeleteNote: (id) => axiosInstance.delete(`${BASE}/${id}/permanent/`),
  archiveNote: (id) => axiosInstance.post(`${BASE}/${id}/archive/`),
  unarchiveNote: (id) => axiosInstance.post(`${BASE}/${id}/unarchive/`),
  pinNote: (id) => axiosInstance.post(`${BASE}/${id}/pin/`),
  unpinNote: (id) => axiosInstance.post(`${BASE}/${id}/unpin/`),
  starNote: (id) => axiosInstance.post(`${BASE}/${id}/star/`),
  unstarNote: (id) => axiosInstance.post(`${BASE}/${id}/unstar/`),
  duplicateNote: (id) => axiosInstance.post(`${BASE}/${id}/duplicate/`),
  moveNote: (id, notebookId) => axiosInstance.post(`${BASE}/${id}/move/`, { notebook: notebookId }),

  // Tags
  addTags: (id, tagIds) => axiosInstance.post(`${BASE}/${id}/tags/`, { tag_ids: tagIds }),
  removeTags: (id, tagIds) => axiosInstance.delete(`${BASE}/${id}/tags/`, { data: { tag_ids: tagIds } }),
}

export default notesService
