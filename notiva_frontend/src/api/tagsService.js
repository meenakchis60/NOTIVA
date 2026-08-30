import axiosInstance from './axiosInstance'

const BASE = '/tags'

const tagsService = {
  getTags: () => axiosInstance.get(`${BASE}/`),
  getTag: (id) => axiosInstance.get(`${BASE}/${id}/`),
  createTag: (data) => axiosInstance.post(`${BASE}/`, data),
  updateTag: (id, data) => axiosInstance.put(`${BASE}/${id}/`, data),
  patchTag: (id, data) => axiosInstance.patch(`${BASE}/${id}/`, data),
  deleteTag: (id) => axiosInstance.delete(`${BASE}/${id}/`),
}

export default tagsService
