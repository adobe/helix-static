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

/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai');
const chaiHttp = require('chai-http');
const { createTargets } = require('./post-deploy-utils.js');

chai.use(chaiHttp);
const { expect } = chai;

createTargets().forEach((target) => {
  describe(`Post-Deploy Tests (${target.title()}) #online`, () => {
    before(function beforeAll() {
      if (!target.enabled()) {
        this.skip();
      }
    });

    it('ferrumjsorg/index.html gets delivered', async () => {
      let url;

      await chai
        .request(target.host())
        .get(`${target.urlPath()}?owner=adobe&repo=ferrumjsorg&ref=54d751f37633fa777ce0816390b3bdbe515d0295&path=/index.html&branch=master&params=`)
        .then((response) => {
          url = response.request.url;
          expect(response).to.have.status(200);
          expect(response).to.be.html;
        })
        .catch((e) => {
          e.message = `At ${url}\n      ${e.message}`;
          throw e;
        });
    }).timeout(15000);

    it('request with empty owner params gets 204', async () => {
      let url;

      await chai
        .request(target.host())
        .get(`${target.urlPath()}?owner=&repo=ferrumjsorg&ref=master&path=/index.html`)
        .then((response) => {
          url = response.request.url;
          expect(response).to.have.status(204);
        })
        .catch((e) => {
          e.message = `At ${url}\n      ${e.message}`;
          throw e;
        });
    }).timeout(15000);

    it('theblog/sitemap.xml gets delivered', async () => {
      let url;

      await chai
        .request(target.host())
        .get(`${target.urlPath()}?owner=adobe&repo=theblog&ref=7966963696682b955c13ac0cefb8ed9af065f66a&path=/sitemap.xml&branch=staging&params=`)
        .then((response) => {
          url = response.request.url;
          expect(response).to.redirectTo('https://raw.githubusercontent.com/adobe/theblog/7966963696682b955c13ac0cefb8ed9af065f66a/sitemap.xml');
        })
        .catch((e) => {
          e.message = `At ${url}\n      ${e.message}`;
          throw e;
        });
    }).timeout(15000);

    it('pages/icons.svg gets delivered', async () => {
      let url;
      await chai
        .request(target.host())
        .get(`${target.urlPath()}?owner=adobe&repo=pages&ref=d7acb4e41cf9546a40c7d6cd5e7162f8bcd540fd&path=/icons.svg`)
        .then((response) => {
          url = response.request.url;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'image/svg+xml');
          expect(response.body.toString()).to.be.a('string').that.includes('<?xml version="1.0" encoding="utf-8"?>');
        })
        .catch((e) => {
          e.message = `At ${url}\n      ${e.message}`;
          throw e;
        });
    }).timeout(10000);

    it('pages/icons.svg gets delivered as _icons_.svg', async () => {
      let url;
      await chai
        .request(target.host())
        .get(`${target.urlPath()}?owner=adobe&repo=pages&ref=d7acb4e41cf9546a40c7d6cd5e7162f8bcd540fd&path=/test/_icons_.svg`)
        .then((response) => {
          url = response.request.url;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'image/svg+xml');
          expect(response.body.toString()).to.be.a('string').that.includes('<?xml version="1.0" encoding="utf-8"?>');
        })
        .catch((e) => {
          e.message = `At ${url}\n      ${e.message}`;
          throw e;
        });
    }).timeout(10000);

    it('helix-pages/htdocs/favicon.ico gets delivered', async () => {
      let url;
      await chai
        .request(target.host())
        .get(`${target.urlPath()}?owner=adobe&repo=helix-pages&ref=f919cff9cd664283b64da854f22382588c3f1c33&path=/htdocs/favicon.ico`)
        .then((response) => {
          url = response.request.url;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'image/vnd.microsoft.icon');
          expect(response.body.toString('base64')).to.includes('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAD');
        })
        .catch((e) => {
          e.message = `At ${url}\n      ${e.message}`;
          throw e;
        });
    }).timeout(15000);

    it('trieloff/helix-demo/htdocs/test.json gets delivered', async () => {
      let url;
      await chai
        .request(target.host())
        .get(`${target.urlPath()}?owner=trieloff&repo=helix-demo&ref=83afa4fdee57868e2cc6c5068d742f59c066d367&path=/htdocs/test.json`)
        .then((response) => {
          url = response.request.url;
          expect(response).to.have.status(200);
          expect(response).to.be.json;
          expect(response.body).to.deep.equal({ foo: 'bar' });
        })
        .catch((e) => {
          e.message = `At ${url}\n      ${e.message}`;
          throw e;
        });
    }).timeout(15000);

    it('trieloff/helix-demo/helix-redirects.yaml gets delivered', async () => {
      let url;
      await chai
        .request(target.host())
        .get(`${target.urlPath()}?owner=trieloff&repo=helix-demo&ref=528fd4692b6e4cd47ee9a11a133e7c6728b51fe5&path=/helix-redirects.yaml`)
        .then((response) => {
          url = response.request.url;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'text/yaml');
          expect(response.text).to.equal('redirects:\n  - from: (.*).php\n    to: $1.html\n    type: temporary\n');
        })
        .catch((e) => {
          e.message = `At ${url}\n      ${e.message}`;
          throw e;
        });
    }).timeout(15000);
  });
});
