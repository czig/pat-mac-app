import cognitoAuth from '@/auth/cognito';

export default {
  namespaced: true,

  state: {
    user: null,
    loading: false,
    error: null,
    initialized: false
  },

  getters: {
    isAuthenticated: state => !!state.user,
    username: state => state.user ? state.user.username : null,
    userEmail: state => state.user ? state.user.email : null,
    token: state => state.user ? state.user.token : null
  },

  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setLoading(state, loading) {
      state.loading = loading;
    },
    setError(state, error) {
      state.error = error;
    },
    setInitialized(state, initialized) {
      state.initialized = initialized;
    }
  },

  actions: {
    async initAuth({ commit }) {
      commit('setLoading', true);
      try {
        const user = await cognitoAuth.getCurrentUser();
        commit('setUser', user);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        commit('setError', error.message);
      } finally {
        commit('setLoading', false);
        commit('setInitialized', true);
      }
    },

    async signIn({ commit }, { username, password }) {
      commit('setLoading', true);
      commit('setError', null);

      try {
        const user = await cognitoAuth.signIn(username, password);
        commit('setUser', user);
        return user;
      } catch (error) {
        console.error('Sign in error:', error);
        commit('setError', error.message);
        throw error;
      } finally {
        commit('setLoading', false);
      }
    },

    signOut({ commit }) {
      cognitoAuth.signOut();
      commit('setUser', null);
    }
  }
};
