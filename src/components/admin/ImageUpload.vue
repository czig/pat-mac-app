<template>
  <v-card flat class="mt-4">
    <v-card-title>Upload New Image</v-card-title>
    <v-card-text>
      <v-alert v-if="error" type="error" dense class="mb-4">{{ error }}</v-alert>
      <v-alert v-if="success" type="success" dense class="mb-4">Image uploaded successfully!</v-alert>

      <v-form ref="form" @submit.prevent="handleUpload" :disabled="uploading">
        <v-text-field
          v-model="title"
          label="Title"
          outlined
          dark
          required
          :rules="[v => !!v || 'Title is required', v => v.length <= 200 || 'Max 200 characters']"
          counter="200"
        />
        <v-text-field
          v-model="alt"
          label="Alt Description"
          outlined
          dark
          required
          :rules="[v => !!v || 'Alt description is required', v => v.length <= 500 || 'Max 500 characters']"
          counter="500"
        />
        <v-file-input
          v-model="file"
          label="Image File"
          outlined
          dark
          accept="image/*"
          required
          :rules="[v => !!v || 'File is required']"
          prepend-icon="mdi-image"
        />

        <v-progress-linear
          v-if="uploading"
          :value="uploadProgress"
          class="mb-4"
          color="primary"
          height="8"
          rounded
        />

        <v-btn
          type="submit"
          color="primary"
          :loading="uploading"
          :disabled="uploading"
        >
          Upload
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
import axios from 'axios';
import imageService from '@/services/images';

export default {
  name: 'ImageUpload',
  data: () => ({
    title: '',
    alt: '',
    file: null,
    uploading: false,
    uploadProgress: 0,
    error: null,
    success: false
  }),
  methods: {
    async handleUpload() {
      if (!this.$refs.form.validate()) return;

      this.uploading = true;
      this.error = null;
      this.success = false;
      this.uploadProgress = 0;

      try {
        // Step 1: Get presigned URL from API
        const { data } = await imageService.createImage({
          title: this.title,
          alt: this.alt,
          filename: this.file.name,
          contentType: this.file.type
        });

        const { imageId, uploadUrl } = data;

        // Step 2: PUT file directly to S3 presigned URL (no Authorization header)
        await axios.put(uploadUrl, this.file, {
          headers: { 'Content-Type': this.file.type },
          onUploadProgress: e => {
            this.uploadProgress = Math.round((e.loaded / e.total) * 100);
          }
        });

        // Step 3: Confirm upload with API
        await imageService.confirmUpload(imageId);

        this.success = true;
        this.$refs.form.reset();
        this.$emit('uploaded');
      } catch (err) {
        console.error('Upload failed:', err);
        this.error = err.response?.data?.message || 'Upload failed. Please try again.';
      } finally {
        this.uploading = false;
      }
    }
  }
};
</script>
