<template>
  <v-container>
    <v-dialog v-model="dialog"
              :max-width="$vuetify.breakpoint.name == 'xs' ? $vuetify.breakpoint.width : $vuetify.breakpoint.width*0.4">
        <v-card>
            <v-btn fab
                   dark
                   small
                   absolute
                   right
                   @click.stop="dialog = false">
                <v-icon>mdi-close</v-icon>
            </v-btn>
            <v-img :src="dialogImage.src"
                   contain>
                <template v-slot:placeholder>
                    <v-row
                        class="fill-height ma-0"
                        align="center"
                        justify="center">
                        <v-progress-circular indeterminate
                                             color="grey lighten-5">
                        </v-progress-circular>
                    </v-row>
                </template>
            </v-img>
        </v-card>
    </v-dialog>

    <v-alert v-if="error" type="error" class="mt-3">
      Failed to load gallery. Please try again later.
    </v-alert>

    <v-row v-if="loading" class="mt-3" justify="center">
      <v-progress-circular indeterminate color="grey lighten-5" size="64" />
    </v-row>

    <v-row v-if="!loading && !error" class="mt-3">
        <v-col v-for="(image, i) in images"
               :key="i"
               class="d-flex child-flex"
               :cols="$vuetify.breakpoint.name == 'xs' ? 12 : 4">
               <v-hover v-slot="{ hover }">
                   <v-card :class="`elevation-${hover ? 12 : 2}`"
                            style="cursor: pointer"
                            @click="showDialog(image)">
                    <v-img :src="image.src"
                           aspect-ratio="1"
                           class="grey lighten-2"
                           :img-props="{ loading: 'lazy' }">
                        <template v-slot:placeholder>
                            <v-row
                                class="fill-height ma-0"
                                align="center"
                                justify="center">
                                <v-progress-circular indeterminate
                                                     color="grey lighten-5">
                                </v-progress-circular>
                            </v-row>
                        </template>
                    </v-img>
                        <v-card-title class="align-center justify-center text-subtitle-1">
                            {{ image.title }}
                        </v-card-title>
                   </v-card>
               </v-hover>
        </v-col>
    </v-row>
  </v-container>
</template>

<script>
import imageService from '@/services/images';

export default {
  name: 'gallery',
  data: () => ({
    dialog: false,
    dialogImage: {},
    images: [],
    loading: false,
    error: false
  }),
  async created() {
    this.loading = true;
    try {
      const { data } = await imageService.getImages();
      this.images = data.images.map(img => ({
        ...img,
        src: `${process.env.VUE_APP_CLOUDFRONT_URL}/${img.s3Key}`
      }));
    } catch (err) {
      console.error('Failed to load gallery images:', err);
      this.error = true;
    } finally {
      this.loading = false;
    }
  },
  methods: {
    showDialog(image) {
      this.dialog = true;
      this.dialogImage = image;
    }
  }
}
</script>

<style>
.hyphen-text {
    display: block;
    overflow: hidden;
    word-break: break-all;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    hyphens: auto;
}
</style>
