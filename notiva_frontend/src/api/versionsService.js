import axiosInstance from './axiosInstance'

const versionsService = {
  getVersions: (noteId) => axiosInstance.get(`/notes/${noteId}/versions/`),
  getVersion: (id) => axiosInstance.get(`/versions/${id}/`),
  restoreVersion: (id) => axiosInstance.post(`/versions/${id}/restore/`),
}

export default versionsService
