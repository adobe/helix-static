/*
 * Copyright 2020 Adobe. All rights reserved.
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
const { main: universalMain } = require('../src/index');
const { retrofit } = require('./utils.js');

const main = retrofit(universalMain);

/* eslint-env mocha */
describe('Static Delivery Action #online #integrationtest', () => {
  it('ferrumjsorg/index.html gets delivered', async () => {
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

  it('helix-demo/helix-redirects.yaml gets delivered', async () => {
    const res = await main({
      path: '/helix-redirects.yaml',
      esi: false,
      plain: true,
      root: '',
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: '528fd4692b6e4cd47ee9a11a133e7c6728b51fe5',
      branch: 'master',
    });
    assert.equal(res.statusCode, 200);
    assert.equal(String(res.body), 'redirects:\n  - from: (.*).php\n    to: $1.html\n    type: temporary\n');
  });

  it('theblog/sitemap.xml gets delivered', async () => {
    const res = await main({
      ref: '7966963696682b955c13ac0cefb8ed9af065f66a',
      package: '8c8a56985d9b2624d338e98af8ba8cf03124dc11',
      path: '/sitemap.xml',
      params: '',
      owner: 'adobe',
      branch: 'staging',
      esi: false,
      plain: true,
      root: '',
      repo: 'theblog',
    });
    assert.equal(res.statusCode, 307);
  });

  it('theblog/scripts/common.js gets delivered', async () => {
    const res = await main({
      ref: '99014561418c495b62badecb5655e1b89d00052f',
      path: '/scripts/common.js',
      owner: 'adobe',
      esi: false,
      plain: true,
      root: '',
      repo: 'theblog',
    });
    assert.ok(res.body.indexOf('import {\n  getTaxonomy\n} from \'/scripts/taxonomy.js\'') > 0);
    assert.equal(res.statusCode, 200);
  });

  it('theblog/scripts/common.js gets delivered (esi)', async () => {
    const res = await main({
      ref: '99014561418c495b62badecb5655e1b89d00052f',
      path: '/scripts/common.js',
      owner: 'adobe',
      esi: true,
      plain: true,
      root: '',
      repo: 'theblog',
    });
    assert.ok(res.body.indexOf('import {\n\n\ngetTaxonomy } from "<esi:include src="/scripts/taxonomy.js.url"/><esi:remove>/scripts/taxonomy.js</esi:remove>"') > 0);
    assert.equal(res.statusCode, 200);
  });

  it('pages hero_ps_pr_two.png gets delivered ', async () => {
    const res = await main({
      ref: 'cf9fe34edaf229c2a9e6a296420bef76bcc3d28',
      path: '/static/ete/hero-posters/hero_ps_pr_two.png',
      owner: 'adobe',
      esi: false,
      plain: true,
      root: '',
      repo: 'pages',
    });
    assert.equal(res.statusCode, 307);
    assert.equal(res.headers.location, 'https://raw.githubusercontent.com/adobe/pages/cf9fe34edaf229c2a9e6a296420bef76bcc3d28/static/ete/hero-posters/hero_ps_pr_two.png');
  });

  it('pages/icons.svg gets delivered', async () => {
    const res = await main({
      ref: '8664b440e94b217ed5da98dad1fd133e19cb3db2',
      path: '/scripts/_icons_.svg',
      owner: 'adobe',
      esi: true,
      plain: true,
      root: '',
      repo: 'pages',
    });
    assert.ok(res.body.indexOf('<?xml version="1.0" encoding="utf-8"?>') === 0);
    assert.equal(res.statusCode, 200);
  });

  it('pages/icons/adobe.svg gets delivered', async () => {
    const res = await main({
      ref: '8664b440e94b217ed5da98dad1fd133e19cb3db2',
      path: '/scripts/_icons_adobe.svg',
      owner: 'adobe',
      esi: true,
      plain: true,
      root: '',
      repo: 'pages',
    });
    assert.ok(res.body.indexOf('<svg id="Layer_1" data-name="Layer 1"') === 0);
    assert.equal(res.statusCode, 200);
  });
});
