<template>
  <v-card flat class="mt-4">
    <v-card-title>Manage Gallery</v-card-title>
    <v-card-text>
      <v-alert v-if="error" type="error" dense class="mb-4">{{ error }}</v-alert>

      <v-row v-if="loading" justify="center" class="my-4">
        <v-progress-circular indeterminate color="primary" />
      </v-row>

      <draggable
        v-else
        v-model="images"
        handle=".drag-handle"
        @end="saveOrder"
      >
        <v-card
          v-for="image in images"
          :key="image.imageId"
          outlined
          elevation="2"
          class="mb-2"
        >
          <v-list-item>
            <v-list-item-avatar tile size="64">
              <v-img :src="imageSrc(image)" />
            </v-list-item-avatar>

            <v-list-item-content>
              <v-list-item-title>{{ image.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ image.alt }}</v-list-item-subtitle>
            </v-list-item-content>

            <v-list-item-action class="flex-row align-center">
              <v-btn icon class="drag-handle" title="Drag to reorder">
                <v-icon>mdi-drag-vertical</v-icon>
              </v-btn>
              <v-btn icon color="error" @click="confirmDelete(image)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-card>
      </draggable>
    </v-card-text>

    <!-- Delete confirmation dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Delete Image</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ imageToDelete && imageToDelete.title }}"? This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="handleDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import draggable from 'vuedraggable';
import imageService from '@/services/images';

export default {
  name: 'ImageManager',
  components: { draggable },
  data: () => ({
    images: [],
    loading: false,
    error: null,
    deleteDialog: false,
    imageToDelete: null,
    deleting: false
  }),
  async created() {
    await this.loadImages();
  },
  methods: {
    imageSrc(image) {
      return `${process.env.VUE_APP_CLOUDFRONT_URL}/${image.s3Key}`;
    },
    async loadImages() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await imageService.getImages();
        this.images = data.images;
      } catch (err) {
        console.error('Failed to load images:', err);
        this.error = 'Failed to load images.';
      } finally {
        this.loading = false;
      }
    },
    async saveOrder() {
      const orderedIds = this.images.map(img => img.imageId);
      try {
        await imageService.reorderImages(orderedIds);
      } catch (err) {
        console.error('Failed to reorder images:', err);
        this.error = 'Failed to save new order.';
      }
    },
    confirmDelete(image) {
      this.imageToDelete = image;
      this.deleteDialog = true;
    },
    async handleDelete() {
      if (!this.imageToDelete) return;
      this.deleting = true;
      try {
        await imageService.deleteImage(this.imageToDelete.imageId);
        this.images = this.images.filter(img => img.imageId !== this.imageToDelete.imageId);
        this.deleteDialog = false;
        this.imageToDelete = null;
      } catch (err) {
        console.error('Failed to delete image:', err);
        this.error = 'Failed to delete image.';
      } finally {
        this.deleting = false;
      }
    }
  }
};
</script>
