/*
 * Copyright 2019 Adobe. All rights reserved.
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
const index = require('../src/index');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('Stress Test', () => {
  it('Make lots of requests', async () => {
    let count = 2000;
    while (count) {
      sleep(Math.random() * 100000)
        .then(() => index.main({
          owner: 'trieloff',
          repo: 'helix-demo',
          ref: 'master',
          path: '/dist/style.css',
          plain: true,
          CORALOGIX_API_KEY: process.env.CORALOGIX_API_KEY,
          EPSAGON_TOKEN: process.env.EPSAGON_TOKEN,
        }))
        .then((res) => {
          if (res.statusCode !== 200) {
          // eslint-disable-next-line no-console
            console.error(res);
          }
        });
      // console.log(res.statusCode);
      count -= 1;
    }
  });
});
