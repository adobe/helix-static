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
const path = require('path');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const index = require('../src/index');

const params = {
  level: 'info',
  ow: {
    activationId: 'be6e21fa3c924126ae21fa3c92912645',
    actionName: '/helix/helix-services/dispatch@4.0.5',
    transactionId: 'ae266f23-7ab5-369f-83cc-5f2490d54ea4',
  },
  cdn: {
    url: 'https://theblog--adobe.hlx.page/footer.plain.html',
  },
  message: '[4] Action: fb53660b8f84df4df216593b048ed09f9ce38fcc/hlx--static',
  actionOptions: {
    name: 'fb53660b8f84df4df216593b048ed09f9ce38fcc/hlx--static',
    params: {
      path: '/README.md',
      plain: true,
      __ow_headers: {
        accept: 'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
        'cdn-loop': 'Fastly, Fastly, Fastly, Fastly, Fastly, Fastly',
        connection: 'close',
        'fastly-client': '1',
        'fastly-client-ip': '66.249.73.232',
        'fastly-ff': 'd/pSKZ8rlnWKwhuqLlOfEaT6D8DNve05rythR5w/Q5M=!DFW!cache-dfw18657-DFW, d/pSKZ8rlnWKwhuqLlOfEaT6D8DNve05rythR5w/Q5M=!DFW!cache-dfw18627-DFW, d/pSKZ8rlnWKwhuqLlOfEaT6D8DNve05rythR5w/Q5M=!BWI!cache-bwi5122-BWI, d/pSKZ8rlnWKwhuqLlOfEaT6D8DNve05rythR5w/Q5M=!BWI!cache-bwi5147-BWI, Lu93u9r/N97Ej+BINSy2/RNtT+0/QKua+B+1EfHKboA=!BWI!cache-bwi5050-BWI, Lu93u9r/N97Ej+BINSy2/RNtT+0/QKua+B+1EfHKboA=!BWI!cache-bwi5140-BWI',
        'fastly-force-shield': 'yes',
        'fastly-orig-accept-encoding': 'gzip',
        'fastly-ssl': '1',
        from: 'googlebot(at)googlebot.com',
        'hlx-forwarded-host': 'blog.adobe.com, blog.adobe.com, theblog--adobe.hlx.page',
        host: 'controller-a',
        'perf-br-req-in': '1596785439.890',
        'redirect-to': '/en/2016/05/19/introducing-adobe-spark.html',
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'x-cdn-request-id': 'ae266f23-7ab5-369f-83cc-5f2490d54ea4',
        'x-cdn-url': 'https://theblog--adobe.hlx.page/footer.plain.html',
        'x-dispatch-nocache': 'true',
        'x-dispatch-version': 'v4',
        'x-encoded-params': '',
        'x-esi': '1',
        'x-forwarded-for': '66.249.73.232, 157.52.86.27, 157.52.99.47, 157.52.99.40, 10.250.206.251',
        'x-forwarded-host': 'adobeioruntime.net',
        'x-forwarded-port': '443',
        'x-forwarded-proto': 'https',
        'x-forwarded-server': 'cache-dfw18657-DFW, cache-bwi5122-BWI, cache-bwi5050-BWI',
        'x-from-edge': '1596785439,BWI,0x22ac204d80880b157a0ce9e4723226f64eeef6d0f99d33da7de81d19e38c2c33',
        'x-fulldirname': '/',
        'x-old-url': '/footer.plain.html',
        'x-real-ip': '10.250.206.251',
        'x-repo-root-path': '',
        'x-request-id': 'ae266f23-7ab5-369f-83cc-5f2490d54ea4',
        'x-strain': 'default',
        'x-timer': 'S1596785437.477904,VS0,VS0,VS0',
        'x-topurl': '/en/publish/2016/05/19/introducing-adobe-spark.html',
        'x-trace': 'vcl_recv; hlx_recv_init; hlx_strain(resolved); hlx_block_recv; hlx_deny; hlx_allow; hlx_determine_request_type(none); hlx_type_dispatch; hlx_owner; hlx_repo; hlx_ref; hlx_root_path; hlx_index; hlx_github_static_owner; hlx_github_static_repo; hlx_github_static_ref; hlx_github_static_root(/htdocs); hlx_action_root; vcl_hash(theblog--adobe.hlx.page/footer.plain.html)',
        'x-varnish': '2955189010',
        'x-version': '385; src=385; cli=6.1.9; rev=online',
      },
      __ow_method: 'get',
      owner: 'adobe',
      repo: 'helix-pages',
      ref: '39430ac97ada5b011835f66e42462b94a3112957',
      root: '/',
      branch: 'master',
    },
  },
  timestamp: '2020-08-07T07:30:39.993026669Z',
};

/* eslint-env mocha */
describe('Fastly Delivery Action #integrationtest', () => {
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

  it('deliver MD file', async () => {
    // const { server } = this.polly;

    const res = await index.main(params.actionOptions.params);

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'text/css');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
    assert.equal(res.headers['Cache-Control'], 's-maxage=300, stale-while-revalidate=2592000');
    assert.equal(res.headers['Surrogate-Key'], 'C0OzgWe1bfWP5Mm0');
    assert.equal(res.headers.ETag, '"52zefhrgED86CD3YtqFN5XClUcGQDRIg3xTukWKhpF0="');
  });
});
