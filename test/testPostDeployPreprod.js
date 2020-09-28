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
const packjson = require('../package.json');

chai.use(chaiHttp);
const { expect } = chai;

function getbaseurl() {
  const namespace = 'helix';
  const package = 'helix-services';
  const name = packjson.name.replace('@adobe/helix-', '');
  let version = `${packjson.version}`;
  if (process.env.CI && process.env.CIRCLE_BUILD_NUM && process.env.CIRCLE_BRANCH !== 'master') {
    version = `ci${process.env.CIRCLE_BUILD_NUM}`;
  }
  return `api/v1/web/${namespace}/${package}/${name}@${version}`;
}

describe('Preprod Post-Deploy Tests #online #postdeploy', () => {
  it('ferrumjsorg/index.html gets delivered', async () => {
    let url;

    await chai
      .request('https://preprod.adobeioruntime.net/')
      .get(`${getbaseurl()}?owner=adobe&repo=ferrumjsorg&ref=54d751f37633fa777ce0816390b3bdbe515d0295&path=/index.html&branch=master&params=`)
      .then((response) => {
        url = response.request.url;

        expect(response).to.have.status(200);
        expect(response).to.be.html;
      }).catch((e) => {
        e.message = `At ${url}\n      ${e.message}`;
        throw e;
      });
  }).timeout(60000);

  it('theblog/sitemap.xml gets delivered', async () => {
    let url;

    await chai
      .request('https://preprod.adobeioruntime.net/')
      .get(`${getbaseurl()}?owner=adobe&repo=theblog&ref=7966963696682b955c13ac0cefb8ed9af065f66a&path=/sitemap.xml&branch=staging&params=`)
      .then((response) => {
        url = response.request.url;

        expect(response).to.redirectTo('https://raw.githubusercontent.com/adobe/theblog/7966963696682b955c13ac0cefb8ed9af065f66a/sitemap.xml');
      }).catch((e) => {
        e.message = `At ${url}\n      ${e.message}`;
        throw e;
      });
  }).timeout(60000);
});
