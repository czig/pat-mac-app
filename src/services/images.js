import api from './api';

export default {
  getImages() {
    return api.get('/images');
  },

  createImage(data) {
    return api.post('/images', data);
  },

  confirmUpload(id) {
    return api.put(`/images/${id}/confirm`);
  },

  deleteImage(id) {
    return api.delete(`/images/${id}`);
  },

  reorderImages(orderedIds) {
    return api.put('/images/reorder', { orderedIds });
  }
};
