<template>
  <v-container>
    <v-row align="center" class="mb-4">
      <v-col>
        <h1 class="text-h4">Admin Dashboard</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn text @click="signOut">Sign Out</v-btn>
      </v-col>
    </v-row>

    <v-tabs v-model="tab" background-color="grey darken-2" dark>
      <v-tab>Upload Image</v-tab>
      <v-tab>Manage Gallery</v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab">
      <v-tab-item>
        <ImageUpload @uploaded="onUploaded" />
      </v-tab-item>
      <v-tab-item>
        <ImageManager ref="manager" />
      </v-tab-item>
    </v-tabs-items>
  </v-container>
</template>

<script>
import ImageUpload from './ImageUpload.vue';
import ImageManager from './ImageManager.vue';

export default {
  name: 'AdminDashboard',
  components: { ImageUpload, ImageManager },
  data: () => ({
    tab: 0
  }),
  methods: {
    onUploaded() {
      this.tab = 1;
      this.$nextTick(() => this.$refs.manager.loadImages());
    },
    signOut() {
      this.$store.dispatch('auth/signOut');
      this.$router.push('/login');
    }
  }
};
</script>
