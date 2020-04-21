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
const index = require('../src/index');
const pkgJson = require('../package.json');

/* eslint-env mocha */
describe('Static Delivery Action #integrationtest', () => {
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

  it('deliver CSS file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      path: '/dist/style.css',
      plain: true,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'text/css');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
    assert.equal(res.headers['Cache-Control'], 's-maxage=300, stale-while-revalidate=2592000');
    assert.equal(res.headers['Surrogate-Key'], 'AYnQlbzbj4dsnOxH');
    assert.equal(res.headers.ETag, '"xSOcRd5oxR4XWFrm4Zmxew=="');
  });

  it('deliver Typekit CSS file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      path: '/hlx_fonts/eic8tkf.css',
      plain: true,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'text/css;charset=utf-8');
  });

  it('deliver CSS file from ref', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: '3e8dec3886cb75bcea6970b4b00783f69cbf487a',
      branch: 'master',
      path: '/dist/style.css',
      plain: true,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'text/css');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
    assert.equal(res.headers['Cache-Control'], 'max-age=86400, stale-while-revalidate=2592000');
    assert.equal(res.headers['Surrogate-Key'], 'AYnQlbzbj4dsnOxH');
  });

  it('deliver PNG file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      path: 'helix_logo.png',
      plain: true,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'image/png');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
    assert.equal(res.headers['Cache-Control'], 's-maxage=300, stale-while-revalidate=2592000');
    assert.equal(res.headers['Surrogate-Key'], 'LiWDcUs5H72QTkGl');
    assert.equal(res.headers.ETag, '"hQQa9WA2n198wTAbYXlO4A=="');
  });

  it('deliver JSON file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      path: 'htdocs/test.json',
      plain: true,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'application/json');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
    assert.equal(res.headers['Cache-Control'], 's-maxage=300, stale-while-revalidate=2592000');
    assert.equal(res.headers['Surrogate-Key'], 'CIUWTRUuAYPY51zR');
    assert.equal(res.headers.ETag, '"oJWmHG4De8PUYQZFhlujXg=="');
  });

  it('deliver missing file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      path: 'not-here.png',
      plain: true,
    });

    assert.equal(res.statusCode, 404);
  });

  it('deliver missing file with esi', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      path: 'not-here.png',
      plain: true,
      esi: true,
    });

    assert.equal(res.statusCode, 404);
    assert.equal(res.body, 'not-here.png');
  });

  it('deliver invalid file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      path: '',
      plain: true,
    });

    assert.equal(res.statusCode, 404);
  });


  it('deliver big JPEG file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      path: 'big-image.jpg',
      plain: true,
    });

    assert.equal(res.statusCode, 307);
    assert.equal(res.headers.Location, 'https://raw.githubusercontent.com/trieloff/helix-demo/master/big-image.jpg');
    assert.equal(res.headers['X-Content-Type'], 'image/jpeg');
    assert.equal(res.headers['Surrogate-Key'], 'uAqncPGZlUF7rYnE');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
  }).timeout(5000);
});

describe('CSS and JS Rewriting', () => {
  it('Rewrite CSS', async () => {
    assert.equal(await index.getBody('text/css', '', true), '');
    assert.equal(await index.getBody('text/css', `.element {
  background: url('images/../sprite.png?foo=bar');
}`, true), `.element {
  background: url('images/../sprite.png?foo=bar');
}`);
    assert.equal(await index.getBody('text/css', `.element {
  background: url('https://example.com/sprite.png?foo=bar');
}`, true), `.element {
  background: url('https://example.com/sprite.png?foo=bar');
}`);
    assert.equal(await index.getBody('text/css', `.element {
  background: url('images/../sprite.png');
}`, true), `.element {
  background: url('<esi:include src="sprite.png.url"/><esi:remove>sprite.png</esi:remove>');
}`);
    assert.equal(await index.getBody('text/css', `.element {
  background: url("images/../sprite.png");
}`, true), `.element {
  background: url("<esi:include src="sprite.png.url"/><esi:remove>sprite.png</esi:remove>");
}`);
    assert.equal(await index.getBody('text/css',
      '@import "fineprint.css" print;', true),
    '@import "<esi:include src="fineprint.css.url"/><esi:remove>fineprint.css</esi:remove>" print;');
    assert.equal(await index.getBody('text/css',
      '@import \'fineprint.css\' print;', true),
    '@import \'<esi:include src="fineprint.css.url"/><esi:remove>fineprint.css</esi:remove>\' print;');
    assert.equal(await index.getBody('text/css',
      '@import url(\'fineprint.css\') print;', true),
    '@import url(\'<esi:include src="fineprint.css.url"/><esi:remove>fineprint.css</esi:remove>\') print;');
    assert.equal(await index.getBody('text/css',
      '@import url("fineprint.css") print;', true),
    '@import url("<esi:include src="fineprint.css.url"/><esi:remove>fineprint.css</esi:remove>") print;');
  });

  it('Rewrite JS', async () => {
    assert.equal(await index.getBody('text/javascript', 'import { transform } from "@babel/core";code();', true),
      'import { transform } from "<esi:include src="@babel/core.url"/><esi:remove>@babel/core</esi:remove>";code();');
  });
});

describe('Static Delivery Action #unittest', () => {
  setupPolly({
    recordFailedRequests: false,
    recordIfMissing: false,
    logging: false,
    matchRequestsBy: {
      headers: {
        exclude: ['authorization'],
      },
    },
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(__dirname, 'fixtures/recordings'),
      },
    },
  });

  it('error() #unittest', () => {
    const error = index.error('Test');
    assert.equal(error.statusCode, '500');
    assert.ok(error.body.match('Test'));
    assert.ok(!error.body.match('404'));
  });

  it('addHeaders() #unittest', () => {
    const before = {};
    const afterMaster = index.addHeaders(before, 'master', 'foobar');
    assert.ok(afterMaster.ETag.match(/^".*"$/));

    const afterSha = index.addHeaders(before, 'bcdcc24e8ebc25a07a35d05afd85551a83fa5af3', 'foobar');
    assert.ok(afterSha['Cache-Control'].match(/^max-age/));
  });

  it('isBinary() #unittest', () => {
    assert.equal(index.isBinary('application/octet-stream'), true);
    assert.equal(index.isBinary('image/png'), true);
    assert.equal(index.isBinary('un/known'), true);
    assert.equal(index.isBinary('image/svg+xml'), true);

    assert.equal(index.isBinary('text/html'), false);
    assert.equal(index.isBinary('text/xml'), false);
    assert.equal(index.isBinary('application/json'), false);
    assert.equal(index.isBinary('application/javascript'), false);
  });

  it('blacklisted() #unittest', () => {
    assert.equal(index.blacklisted('index.html'), false);
    assert.equal(index.blacklisted('/index.html'), false);
    assert.equal(index.blacklisted('/robots.txt'), false);
    assert.equal(index.blacklisted('robots.txt'), false);
    assert.equal(index.blacklisted('hello.css'), false);
    assert.equal(index.blacklisted('/style/hello.css'), false);
    assert.equal(index.blacklisted('foo/html.htl'), false);

    assert.equal(index.blacklisted('package.json'), true);
    assert.equal(index.blacklisted('/package.json'), true);
    assert.equal(index.blacklisted('helix-config.yaml'), true);
    assert.equal(index.blacklisted('/helix-config.yaml'), true);
    assert.equal(index.blacklisted('.circleci/config.yml'), true);
    assert.equal(index.blacklisted('/.circleci/config.yml'), true);
    assert.equal(index.blacklisted('/src/html.htl'), true);
    assert.equal(index.blacklisted('src/html.htl'), true);

    assert.equal(index.blacklisted('foo/html.htl', '^.*\\.htl$|^.*\\.js$'), false);
    assert.equal(index.blacklisted('foo/html.js', '^.*\\.htl$|^.*\\.js$'), false);
    assert.equal(index.blacklisted('foo/html.jst', '^.*\\.htl$|^.*\\.js$'), true);
    assert.equal(index.blacklisted('src/html.htl', '^.*\\.htl$|^.*\\.js$'), true);

    assert.equal(index.blacklisted('.well-known/keybase.txt', '^.*\\.htl$|^.*\\.js$'), false);
    assert.equal(index.blacklisted('.well-known/dnt-policy.txt', '^.*\\.htl$|^.*\\.js$'), false);
    assert.equal(index.blacklisted('.well-known/assetlinks.json', '^.*\\.htl$|^.*\\.js$'), false);
    assert.equal(index.blacklisted('.well-known/apple-developer-merchantid-domain-association', '^.*\\.htl$|^.*\\.js$'), false);

    assert.equal(index.blacklisted('foo/html.htl', '^.*\\.htl$|^.*\\.js$', 'foo'), true);
    assert.equal(index.blacklisted('boo/html.htl', '^.*\\.htl$|^.*\\.js$', 'foo'), false);
    assert.equal(index.blacklisted('src/html.htl', '^.*\\.htl$|^.*\\.js$', 'foo'), true);

    assert.equal(index.blacklisted('foo/html.htl', '^.*\\.htl$|^.*\\.js$', ''), false);
  });

  it('main() returns static file from GitHub', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'helix-cli',
      path: '/demos/simple/htdocs/style.css',
      plain: true,
    });
    assert.ok(res.body.indexOf('Arial') > 0, true);
  });

  it('main() normalizes URLs', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'helix-cli',
      path: './demos/simple/htdocs/style.css',
      plain: true,
    });
    assert.ok(res.body.indexOf('Arial') > 0, true);
  });

  it('main() normalizes URLs anywhere', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'helix-cli',
      path: './demos/simple/test/../htdocs/style.css',
      plain: true,
    });
    assert.ok(res.body.indexOf('Arial') > 0, true);
  });

  it('main() reports version for get request to /', async () => {
    const res = await index.main({ __ow_method: 'get' });
    assert.equal(res.statusCode, 204);
    assert.deepEqual(res.headers, {
      'x-last-activation-id': undefined,
      'x-version': pkgJson.version,
    });
  });

  it('main() normalizes URLs in rewritten Javascript', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      path: '/index.js',
      root: '/htdocs',
      plain: true,
      esi: true,
    });
    assert.equal(res.body, `import barba from "<esi:include src="/web_modules/@barba--core.js.url"/><esi:remove>./web_modules/@barba--core.js</esi:remove>";import
prefetch from "<esi:include src="/web_modules/@barba--prefetch.js.url"/><esi:remove>./web_modules/@barba--prefetch.js</esi:remove>";

// tells barba to use the prefetch module
barba.use(prefetch);

// Basic default transition, with no rules and minimal hooks…
barba.init({
  transitions: [{
    leave({ current, next, trigger }) {
      // Do something with \`current.container\` for your leave transition
      // then return a promise or use \`this.async()\`
    },
    enter({ current, next, trigger }) {
      // Do something with \`next.container\` for your enter transition
      // then return a promise or use \`this.async()\`
    } }] });`);
  });

  it('main() returns 403 in case of backlisted file', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'helix-cli',
      path: '/package.json',
    });
    assert.equal(res.statusCode, 403);
  });

  it('main() returns static file from private GitHub repo (gh token via header)', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'project-helix', // private repository
      path: 'helix_logo.ico',
      __ow_headers: { 'x-github-token': 'undisclosed-token' },
    });
    assert.equal(res.statusCode, 200);
  });

  it('main() returns static file from private GitHub repo (gh token via param)', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'project-helix', // private repository
      path: 'helix_logo.ico',
      GITHUB_TOKEN: 'undisclosed-token',
    });
    assert.equal(res.statusCode, 200);
  });
});
