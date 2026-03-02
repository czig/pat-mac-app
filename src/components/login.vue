<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="grey darken-3">
          <v-card-title class="text-h5 justify-center pb-2 pt-6">
            Admin Sign In
          </v-card-title>
          <v-card-text>
            <v-alert v-if="error" type="error" dense class="mb-4">
              {{ error }}
            </v-alert>
            <v-form @submit.prevent="handleSubmit">
              <v-text-field
                v-model="username"
                label="Username"
                outlined
                dark
                required
                autocomplete="username"
              />
              <v-text-field
                v-model="password"
                label="Password"
                outlined
                dark
                required
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :append-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append="showPassword = !showPassword"
              />
              <v-btn
                type="submit"
                color="primary"
                block
                :loading="loading"
                :disabled="loading"
              >
                Sign In
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'Login',
  data() {
    return {
      username: '',
      password: '',
      showPassword: false
    };
  },
  computed: {
    ...mapState('auth', ['loading', 'error'])
  },
  methods: {
    async handleSubmit() {
      try {
        await this.$store.dispatch('auth/signIn', {
          username: this.username,
          password: this.password
        });
        const redirect = this.$route.query.redirect || '/admin';
        this.$router.push(redirect);
      } catch {
        // Error is handled in the store
      }
    }
  }
};
</script>
