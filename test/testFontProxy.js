/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const assert = require('assert');
const path = require('path');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const deliverFontCSS = require('../src/font-proxy');

/* eslint-env mocha */

describe('Adobe Fonts Proxy Test #unitttest', () => {
  setupPolly({
    recordFailedRequests: true,
    recordIfMissing: false,
    logging: false,
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(__dirname, 'fixtures/recordings'),
      },
    },
  });

  it('Delivers rewritten Kit', async () => {
    const res = await deliverFontCSS('/hlx_fonts/eic8tkf.css');
    assert.equal(res.headers['cache-control'], 'private, max-age=600, stale-while-revalidate=604800');
    assert.ok(!res.body.match(/https:\/\/use.typekit.net/));
    assert.ok(res.body.match(/\/hlx_fonts\//));
    assert.equal(res.statusCode, 200);
  });

  it('Delivers 404 for missing kit', async () => {
    const res = await deliverFontCSS('/hlx_fonts/foobar.css');
    assert.equal(res.statusCode, 404);
    assert.equal(res.body, 'not found');
  });
});
