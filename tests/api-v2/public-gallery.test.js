const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { clearPublicCaches } = require('../../utils/publicCache');
const { buildExpressApp, loadRoute, mock, mockModels } = require('./_helpers');

const createProjectStubs = () => {
  let findAllCalls = 0;
  const projects = [
    {
      id: 'project-2',
      title: 'Second project',
      location: 'Sale',
      media: [
        {
          url: '/uploads/second-b.jpg',
          mediaType: 'image',
          showInGallery: true,
          isCover: false,
          galleryOrder: 2,
          filename: 'second-b.jpg'
        }
      ]
    },
    {
      id: 'project-1',
      title: 'First project',
      location: 'Didsbury',
      media: [
        {
          url: '/uploads/cover.jpg',
          mediaType: 'image',
          showInGallery: true,
          isCover: true,
          galleryOrder: 99,
          filename: 'cover.jpg'
        },
        {
          url: '/uploads/a.jpg',
          mediaType: 'image',
          showInGallery: true,
          isCover: false,
          galleryOrder: 2,
          filename: 'a.jpg'
        },
        {
          url: '/uploads/b.jpg',
          mediaType: 'image',
          showInGallery: true,
          isCover: false,
          galleryOrder: 2,
          filename: 'b.jpg'
        },
        {
          url: '/uploads/hidden.jpg',
          mediaType: 'image',
          showInGallery: false,
          isCover: false,
          galleryOrder: 1,
          filename: 'hidden.jpg'
        }
      ]
    },
    {
      id: 'project-3',
      title: 'Filtered project',
      location: 'Stockport',
      media: []
    }
  ];

  return {
    get findAllCalls() {
      return findAllCalls;
    },
    models: {
      Project: {
        async findAll() {
          findAllCalls += 1;
          return projects;
        }
      },
      ProjectMedia: {}
    }
  };
};

test.afterEach(() => {
  clearPublicCaches();
  mock.stopAll();
});

test('shared public gallery util sorts images and caches the managed projects payload', async () => {
  const stubs = createProjectStubs();
  mockModels(stubs.models);

  const publicGallery = loadRoute('utils/publicGallery.js');

  const first = await publicGallery.fetchManagedGalleryProjectsCached();
  const second = await publicGallery.fetchManagedGalleryProjectsCached();

  assert.equal(first.cacheStatus, 'MISS');
  assert.equal(second.cacheStatus, 'HIT');
  assert.equal(stubs.findAllCalls, 1);
  assert.deepEqual(first.payload, {
    projects: [
      {
        id: 'project-2',
        name: 'Second project',
        location: 'Sale',
        images: ['/uploads/second-b.jpg']
      },
      {
        id: 'project-1',
        name: 'First project',
        location: 'Didsbury',
        images: ['/uploads/cover.jpg', '/uploads/a.jpg', '/uploads/b.jpg']
      }
    ]
  });
});

test('api v2 public gallery route uses shared payload and cache headers', async () => {
  const stubs = createProjectStubs();
  mockModels(stubs.models);

  loadRoute('utils/publicGallery.js');
  const publicRoute = loadRoute('api/v2/routes/public.js');
  const app = buildExpressApp('/api/v2', publicRoute);
  app.locals.galleryPath = 'C:\\fake\\Gallery';

  const first = await request(app)
    .get('/api/v2/gallery/projects')
    .expect(200);

  assert.equal(first.body?.meta?.cache, 'MISS');
  assert.match(first.headers['cache-control'], /public, max-age=\d+, stale-while-revalidate=\d+/);
  assert.equal(first.body?.data?.projects?.length, 2);

  const second = await request(app)
    .get('/api/v2/gallery/projects')
    .expect(200);

  assert.equal(second.body?.meta?.cache, 'HIT');
  assert.equal(stubs.findAllCalls, 1);
});

test('api v2 public service gallery route groups folder images and caches the payload', async () => {
  mockModels(createProjectStubs().models);
  mock('fs', {
    promises: {
      async readdir(targetPath, options) {
        if (String(targetPath).endsWith('\\Gallery') && options?.withFileTypes) {
          return [
            { name: 'premium', isDirectory: () => true },
            { name: 'bathrooms', isDirectory: () => true },
            { name: 'interiors', isDirectory: () => true }
          ];
        }

        if (String(targetPath).endsWith('\\Gallery\\bathrooms')) {
          return ['freestanding-bath-detail.jpg', 'primary-suite-overview.jpg'];
        }

        if (String(targetPath).endsWith('\\Gallery\\interiors')) {
          return ['warm-finish-detail.jpg'];
        }

        return [];
      }
    }
  });

  loadRoute('utils/publicGallery.js');
  const publicRoute = loadRoute('api/v2/routes/public.js');
  const app = buildExpressApp('/api/v2', publicRoute);
  app.locals.galleryPath = 'C:\\fake\\Gallery';

  const first = await request(app)
    .get('/api/v2/gallery/services')
    .expect(200);

  assert.equal(first.body?.meta?.cache, 'MISS');
  assert.match(first.headers['cache-control'], /public, max-age=\d+, stale-while-revalidate=\d+/);
  assert.deepEqual(first.body?.data?.services, [
    {
      id: 'bathrooms',
      name: 'Bathrooms',
      images: [
        {
          src: '/Gallery/bathrooms/freestanding-bath-detail.jpg',
          label: 'Freestanding Bath Detail'
        },
        {
          src: '/Gallery/bathrooms/primary-suite-overview.jpg',
          label: 'Primary Suite Overview'
        }
      ]
    },
    {
      id: 'interiors',
      name: 'Interiors',
      images: [
        {
          src: '/Gallery/interiors/warm-finish-detail.jpg',
          label: 'Warm Finish Detail'
        }
      ]
    }
  ]);

  const second = await request(app)
    .get('/api/v2/gallery/services')
    .expect(200);

  assert.equal(second.body?.meta?.cache, 'HIT');
});
