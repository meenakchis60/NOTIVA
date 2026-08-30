import axiosInstance from './axiosInstance';

export const collabService = {
  // Groups
  getGroups: () => axiosInstance.get('/collab/groups/'),
  createGroup: (data) => axiosInstance.post('/collab/groups/', data),
  getGroup: (id) => axiosInstance.get(`/collab/groups/${id}/`),
  updateGroup: (id, data) => axiosInstance.patch(`/collab/groups/${id}/`, data),
  deleteGroup: (id) => axiosInstance.delete(`/collab/groups/${id}/`),

  // Members
  getMembers: (groupId) => axiosInstance.get(`/collab/groups/${groupId}/members/`),
  addMember: (groupId, email) => axiosInstance.post(`/collab/groups/${groupId}/members/`, { user_email: email }),
  updateMember: (groupId, memberId, role) => axiosInstance.patch(`/collab/groups/${groupId}/members/${memberId}/`, { role }),
  removeMember: (groupId, memberId) => axiosInstance.delete(`/collab/groups/${groupId}/members/${memberId}/`),

  // Shared Notes
  getSharedNotes: (groupId) => axiosInstance.get(`/collab/groups/${groupId}/shared-notes/`),
  shareNote: (groupId, noteId, permission = 'view') => axiosInstance.post(`/collab/groups/${groupId}/shared-notes/`, { note: noteId, permission }),
  unshareNote: (groupId, sharedNoteId) => axiosInstance.delete(`/collab/groups/${groupId}/shared-notes/${sharedNoteId}/`),

  // Shared Files
  getSharedFiles: (groupId) => axiosInstance.get(`/collab/groups/${groupId}/files/`),
  uploadSharedFile: (groupId, formData) => axiosInstance.post(`/collab/groups/${groupId}/files/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteSharedFile: (groupId, fileId) => axiosInstance.delete(`/collab/groups/${groupId}/files/${fileId}/`),

  // Comments (note-scoped)
  getComments: (noteId) => axiosInstance.get(`/notes/${noteId}/comments/`),
  addComment: (noteId, content, parentId = null) => {
    const payload = { content };
    if (parentId) payload.parent = parentId;
    return axiosInstance.post(`/notes/${noteId}/comments/`, payload);
  },
  updateComment: (noteId, commentId, content) => axiosInstance.patch(`/notes/${noteId}/comments/${commentId}/`, { content }),
  deleteComment: (noteId, commentId) => axiosInstance.delete(`/notes/${noteId}/comments/${commentId}/`),
};

export default collabService;
