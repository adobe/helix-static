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
// eslint-disable-next-line import/no-extraneous-dependencies
const request = require('request-promise-native');

async function deliverFontCSS(file) {
  const [kitid] = file.split('/').pop().split('.');

  try {
    const { body, headers } = await request(`https://use.typekit.net/${kitid}.css`, {
      resolveWithFullResponse: true,
    });
    return {
      statusCode: 200,
      headers: {
        'cache-control': headers['cache-control'],
        'content-type': headers['content-type'],
        'surrogate-control': 'max-age=300, stale-while-revalidate=2592000',
      },
      body: body.replace(/https:\/\/use\.typekit\.net\//g, '/hlx_fonts/'),
    };
  } catch (e) {
    return {
      statusCode: 404,
      body: e.response.body,
    };
  }
}

module.exports = deliverFontCSS;
