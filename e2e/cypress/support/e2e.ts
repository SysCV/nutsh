import projectSpecJson from '../fixtures/project.json';

import './commands';

beforeEach(() => {
  cy.intercept('GET', '/api/metadata', {
    statusCode: 200,
    body: {
      commit_identifier: 'test',
      commit_time: '2023-01-02T03:04:05+06:00',
      version: 'test',
    },
  }).as('GetMetadata');

  cy.intercept('GET', '/api/projects', {
    statusCode: 200,
    body: {
      projects: [
        {id: 'test1', name: 'Test-Project-1'},
        {id: 'test2', name: 'Test-Project-2'},
      ],
    },
  }).as('ListProjects');

  cy.intercept('GET', '/api/project/*', {
    statusCode: 200,
    body: {
      project: {
        id: 'test',
        name: 'Test-Project',
        spec_json: JSON.stringify(projectSpecJson),
      },
    },
  }).as('GetProject');

  cy.intercept('GET', '/api/project/*/videos', {
    statusCode: 200,
    body: {
      videos: [
        {id: 'test1', name: 'Test-Video-1', project_id: 'test'},
        {id: 'test2', name: 'Test-Video-2', project_id: 'test'},
      ],
    },
  }).as('ListProjectVideos');

  cy.intercept('GET', '/api/video/*', {
    statusCode: 200,
    body: {
      video: {
        id: 'test',
        name: 'Test-Video',
        project_id: 'test',
        frame_urls: new Array(10).fill(0).map((_, idx) => `/app/dev/video-frame-${idx + 1}.jpg`),
      },
    },
  }).as('GetVideo');

  cy.intercept('GET', '/api/video/*/annotation', {
    statusCode: 200,
    body: {
      annotation_json: '{"entities":{}}',
      annotation_version: '',
    },
  }).as('GetVideoAnnotation');

  cy.intercept('PATCH', '/api/video/*/annotation', {
    statusCode: 200,
    body: {annotation_version: 'test'},
  }).as('PatchVideoAnnotation');

  cy.intercept('GET', '/app/dev/*', {
    fixture: 'video/frame-1.jpg',
  });
});
