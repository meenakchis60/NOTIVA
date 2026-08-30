import axiosInstance from './axiosInstance'

const checklistsService = {
  getChecklists: (noteId) => axiosInstance.get(`/notes/${noteId}/checklists/`),
  createChecklist: (noteId, data) => axiosInstance.post(`/notes/${noteId}/checklists/`, data),
  getChecklist: (id) => axiosInstance.get(`/checklists/${id}/`),
  patchChecklist: (id, data) => axiosInstance.patch(`/checklists/${id}/`, data),
  deleteChecklist: (id) => axiosInstance.delete(`/checklists/${id}/`),

  getItems: (checklistId) => axiosInstance.get(`/checklists/${checklistId}/items/`),
  createItem: (checklistId, data) => axiosInstance.post(`/checklists/${checklistId}/items/`, data),
  patchItem: (id, data) => axiosInstance.patch(`/checklist-items/${id}/`, data),
  deleteItem: (id) => axiosInstance.delete(`/checklist-items/${id}/`),
}

export default checklistsService
