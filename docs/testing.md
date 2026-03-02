# Testing

## Running tests

```bash
yarn test:unit                        # Run all unit tests
yarn test:unit --grep "test name"     # Run a single test by name
```

Tests use [Mocha](https://mochajs.org/) + [Chai](https://www.chaijs.com/) + [@vue/test-utils](https://v1.test-utils.vuejs.org/).

Test files live in `tests/unit/` alongside a `*.spec.js` naming convention.

---

## Writing tests

### Component tests

Mount components with `@vue/test-utils` using the project's Vuetify and Vuex configuration. Always pass `localVue` with Vuetify installed to avoid missing-component warnings.

```js
import { createLocalVue, mount } from '@vue/test-utils';
import Vuetify from 'vuetify';
import Vuex from 'vuex';
import MyComponent from '@/components/MyComponent.vue';

const localVue = createLocalVue();
localVue.use(Vuex);

describe('MyComponent', () => {
  let vuetify;
  let store;

  beforeEach(() => {
    vuetify = new Vuetify();
    store = new Vuex.Store({ /* minimal state */ });
  });

  it('renders expected content', () => {
    const wrapper = mount(MyComponent, { localVue, vuetify, store });
    expect(wrapper.text()).to.include('expected text');
  });
});
```

### Vuex store tests

Test store actions and mutations directly — no component mounting needed.

```js
import { expect } from 'chai';
import authModule from '@/stores/auth';

describe('auth store', () => {
  it('setUser mutation updates user state', () => {
    const state = { user: null };
    authModule.mutations.setUser(state, { username: 'pat' });
    expect(state.user.username).to.equal('pat');
  });
});
```

### Mocking API calls

Stub `src/services/images.js` methods with sinon or simple manual stubs to avoid real HTTP requests in unit tests:

```js
import imageService from '@/services/images';

beforeEach(() => {
  sinon.stub(imageService, 'getImages').resolves({
    data: { images: [{ imageId: '1', title: 'Test', s3Key: 'images/1/test.jpg' }] }
  });
});

afterEach(() => sinon.restore());
```

---

## What to test

### High-value targets

| Area | What to verify |
|------|---------------|
| Auth store `initAuth` | Sets `initialized: true` in finally block regardless of success/failure |
| Auth store `signIn` | Commits `setUser` on success; commits `setError` and rethrows on failure |
| Router guard | Redirects unauthenticated users from `/admin` to `/login` |
| Router guard | Does not redirect authenticated users from `/admin` |
| Router guard | Redirects authenticated users away from `/login` to `/admin` |
| `gallery.vue` | Shows loading spinner during fetch; renders images after; shows error alert on failure |
| `ImageUpload.vue` | Calls `createImage`, then S3 PUT, then `confirmUpload` in sequence |
| `ImageManager.vue` | Removes deleted image from local array optimistically |
| `validate.js` | Rejects titles > 200 chars, non-image content types, filenames with path traversal |

### Lambda handler tests (Node.js)

Test Lambda handlers by calling `handler(event)` directly with a mock event object:

```js
const { handler } = require('../../backend/getImages');

// Mock DynamoDB
// (use aws-sdk-client-mock or dependency injection)

it('returns images sorted by order', async () => {
  const result = await handler({});
  const body = JSON.parse(result.body);
  expect(result.statusCode).to.equal(200);
  expect(body.images).to.be.an('array');
});
```

---

## Manual verification checklist

Before each production deploy, walk through these flows manually:

**Auth flow:**
1. Navigate to `/admin` while signed out → should redirect to `/login`
2. Sign in with real Cognito credentials → should land on `/admin`
3. Reload `/admin` → should stay on `/admin` (session restored from Cognito cookies)
4. Click Sign Out → should redirect to `/login`
5. Try `/admin` again → should redirect to `/login`

**Gallery:**
1. Visit `/gallery` without signing in → images load from the API

**Upload:**
1. Sign in → Admin → Upload tab
2. Fill in title, alt, select an image file → Upload
3. Visit `/gallery` → new image appears

**Delete:**
1. Admin → Manage Gallery
2. Click delete on an image → confirm → image removed from list
3. Visit `/gallery` → image no longer appears

**Reorder:**
1. Admin → Manage Gallery
2. Drag an image to a different position
3. Visit `/gallery` → new order reflected
