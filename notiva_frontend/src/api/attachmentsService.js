import axiosInstance from './axiosInstance'

const attachmentsService = {
  getAttachments: (noteId) => axiosInstance.get(`/notes/${noteId}/attachments/`),
  createAttachment: (noteId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return axiosInstance.post(`/notes/${noteId}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  getAttachment: (id) => axiosInstance.get(`/attachments/${id}/`),
  deleteAttachment: (id) => axiosInstance.delete(`/attachments/${id}/`),
}

export default attachmentsService
