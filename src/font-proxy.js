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
const postcss = require('postcss');

async function getFontURLs(css) {
  const foundurls = [];

  function findFontURLs(tree) {
    tree.walkDecls('src', (decl) => {
      const urls = decl.value.split(',').map((rule) => ({
        url: rule.replace(/.*url\(["']([^"']*)["']\).*/, '$1'),
        format: rule.replace(/.*format\(["']([^"']*)["']\).*/, '$1'),
      })).filter((rule) => rule.format === 'woff2')
        .map((rule) => rule.url)
        .map((body) => body.replace(/https:\/\/use\.typekit\.net\//g, '/hlx_fonts/'));
      foundurls.push(...urls);
    });
  }

  const processor = postcss()
    .use(findFontURLs);

  await processor.process(css, { from: undefined });
  return foundurls;
}

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
        link: (await getFontURLs(body)).map((url) => `<${url}>; rel=preload; as=font; x-http2-push-only`).join(','),
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

deliverFontCSS.getFontURLs = getFontURLs;

module.exports = deliverFontCSS;
