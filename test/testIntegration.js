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
process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

const assert = require('assert');
const { main } = require('../src/index');

/* eslint-env mocha */
describe('Static Delivery Action #online #integrationtest', () => {
  it('ferrumjsorg/index.html dets delivered', async () => {
    const res = await main({
      path: '/index.html',
      esi: false,
      plain: true,
      root: '',
      owner: 'adobe',
      repo: 'ferrumjsorg',
      ref: '54d751f37633fa777ce0816390b3bdbe515d0295',
      package: 'fb53660b8f84df4df216593b048ed09f9ce38fcc',
      params: '',
      branch: 'master',
    });

    assert.equal(res.statusCode, 200);
  });
});
