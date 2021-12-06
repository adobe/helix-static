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
const nock = require('nock');
const deliverFontCSS = require('../src/handlers/font-css');
const { getSanitizedCssAndUrls } = require('../src/handlers/font-css');
const { retrofitResponse } = require('./utils.js');

/* eslint-env mocha */

describe('Adobe Fonts CSS Parser', () => {
  it('getFontURLs returns a list of URLs', async () => {
    const css = `/*
    * The Typekit service used to deliver this font or fonts for use on websites
    * is provided by Adobe and is subject to these Terms of Use
    * http://www.adobe.com/products/eulas/tou_typekit. For font license
    * information, see the list below.
    *
    * henriette:
    *   - http://typekit.com/eulas/00000000000000003b9af759
    *   - http://typekit.com/eulas/00000000000000003b9af75a
    *   - http://typekit.com/eulas/00000000000000003b9af75d
    *   - http://typekit.com/eulas/00000000000000003b9af75e
    * henriette-compressed:
    *   - http://typekit.com/eulas/00000000000000003b9af764
    *   - http://typekit.com/eulas/00000000000000003b9af765
    *   - http://typekit.com/eulas/00000000000000003b9af768
    *   - http://typekit.com/eulas/00000000000000003b9af769
    *
    * © 2009-2019 Adobe Systems Incorporated. All Rights Reserved.
    */
   /*{"last_published":"2020-01-14 16:06:03 UTC"}*/
   
   @import url("https://p.typekit.net/p.css?s=1&k=eic8tkf&ht=tk&f=33805.33806.33809.33810.33816.33817.33820.33821&a=5215194&app=typekit&e=css");
   @import url("https://www.adobe.com/fonts.css");

   @font-face {
   font-family:"henriette";
   src:url("https://use.typekit.net/af/d91a29/00000000000000003b9af759/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3") format("woff2"),url("https://use.typekit.net/af/d91a29/00000000000000003b9af759/27/d?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3") format("woff"),url("https://use.typekit.net/af/d91a29/00000000000000003b9af759/27/a?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3") format("opentype");
   font-display:auto;font-style:italic;font-weight:400;
   }
   
   @font-face {
   font-family:"henriette";
   src:url("https://use.typekit.net/af/c5b4b1/00000000000000003b9af75a/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n4&v=3") format("woff2"),url("https://use.typekit.net/af/c5b4b1/00000000000000003b9af75a/27/d?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n4&v=3") format("woff"),url("https://use.typekit.net/af/c5b4b1/00000000000000003b9af75a/27/a?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n4&v=3") format("opentype");
   font-display:auto;font-style:normal;font-weight:400;
   }
   
   @font-face {
   font-family:"henriette";
   src:url("https://use.typekit.net/af/c52cc9/00000000000000003b9af75d/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i7&v=3") format("woff2"),url("https://use.typekit.net/af/c52cc9/00000000000000003b9af75d/27/d?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i7&v=3") format("woff"),url("https://use.typekit.net/af/c52cc9/00000000000000003b9af75d/27/a?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i7&v=3") format("opentype");
   font-display:auto;font-style:italic;font-weight:700;
   }
   
   @font-face {
   font-family:"henriette";
   src:url("https://use.typekit.net/af/d6053e/00000000000000003b9af75e/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n7&v=3") format("woff2"),url("https://use.typekit.net/af/d6053e/00000000000000003b9af75e/27/d?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n7&v=3") format("woff"),url("https://use.typekit.net/af/d6053e/00000000000000003b9af75e/27/a?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n7&v=3") format("opentype");
   font-display:auto;font-style:normal;font-weight:700;
   }
   
   @font-face {
   font-family:"henriette-compressed";
   src:url("https://use.typekit.net/af/68fa2f/00000000000000003b9af764/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n4&v=3") format("woff2"),url("https://use.typekit.net/af/68fa2f/00000000000000003b9af764/27/d?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n4&v=3") format("woff"),url("https://use.typekit.net/af/68fa2f/00000000000000003b9af764/27/a?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n4&v=3") format("opentype");
   font-display:auto;font-style:normal;font-weight:400;
   }
   
   @font-face {
   font-family:"henriette-compressed";
   src:url("https://use.typekit.net/af/bd7e57/00000000000000003b9af765/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3") format("woff2"),url("https://use.typekit.net/af/bd7e57/00000000000000003b9af765/27/d?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3") format("woff"),url("https://use.typekit.net/af/bd7e57/00000000000000003b9af765/27/a?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3") format("opentype");
   font-display:auto;font-style:italic;font-weight:400;
   }
   
   @font-face {
   font-family:"henriette-compressed";
   src:url("https://use.typekit.net/af/056440/00000000000000003b9af768/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i7&v=3") format("woff2"),url("https://use.typekit.net/af/056440/00000000000000003b9af768/27/d?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i7&v=3") format("woff"),url("https://use.typekit.net/af/056440/00000000000000003b9af768/27/a?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i7&v=3") format("opentype");
   font-display:auto;font-style:italic;font-weight:700;
   }
   
   @font-face {
   font-family:"henriette-compressed";
   src:url("https://use.typekit.net/af/9d03dd/00000000000000003b9af769/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n7&v=3") format("woff2"),url("https://use.typekit.net/af/9d03dd/00000000000000003b9af769/27/d?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n7&v=3") format("woff"),url("https://use.typekit.net/af/9d03dd/00000000000000003b9af769/27/a?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n7&v=3") format("opentype");
   font-display:auto;font-style:normal;font-weight:700;
   }
   
   .tk-henriette { font-family: "henriette",sans-serif; }
   .tk-henriette-compressed { font-family: "henriette-compressed",sans-serif; }`;

    const res = await getSanitizedCssAndUrls(css);
    assert.ok(Array.isArray(res.foundurls));
    assert.equal(res.foundurls[0], '/hlx_fonts/af/d91a29/00000000000000003b9af759/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3');
  });
});

describe('Adobe Fonts Proxy Test #unitttest', () => {
  setupPolly({
    recordFailedRequests: false,
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
    const res = await retrofitResponse(await deliverFontCSS({ params: { kitid: 'eic8tkf' } }, { log: console }));
    const body = String(res.body);
    assert.equal(res.headers['cache-control'], 'private, max-age=600, stale-while-revalidate=604800');
    assert.ok(!body.match(/https:\/\/use.typekit\.net/));
    assert.ok(!body.match(/https:\/\/p.typekit\.net/));
    assert.ok(body.indexOf('font-display:swap' > -1));
    assert.ok(body.match(/\/hlx_fonts\//));
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers.link, '</hlx_fonts/af/d91a29/00000000000000003b9af759/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3>; rel=preload; as=font; crossorigin=anonymous,</hlx_fonts/af/c5b4b1/00000000000000003b9af75a/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n4&v=3>; rel=preload; as=font; crossorigin=anonymous,</hlx_fonts/af/c52cc9/00000000000000003b9af75d/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i7&v=3>; rel=preload; as=font; crossorigin=anonymous,</hlx_fonts/af/d6053e/00000000000000003b9af75e/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n7&v=3>; rel=preload; as=font; crossorigin=anonymous,</hlx_fonts/af/68fa2f/00000000000000003b9af764/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n4&v=3>; rel=preload; as=font; crossorigin=anonymous,</hlx_fonts/af/bd7e57/00000000000000003b9af765/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i4&v=3>; rel=preload; as=font; crossorigin=anonymous,</hlx_fonts/af/056440/00000000000000003b9af768/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=i7&v=3>; rel=preload; as=font; crossorigin=anonymous,</hlx_fonts/af/9d03dd/00000000000000003b9af769/27/l?primer=34645566c6d4d8e7116ebd63bd1259d4c9689c1a505c3639ef9e73069e3e4176&fvd=n7&v=3>; rel=preload; as=font; crossorigin=anonymous');
  });

  it('Delivers 404 for missing kit', async () => {
    const res = await retrofitResponse(await deliverFontCSS({ params: { kitid: 'foobar' } }, { log: console }));
    assert.equal(res.statusCode, 404);
    assert.equal(res.body, 'not found');
  });
});

describe.skip('network error tests', () => {
  it('Delivers 502 for connection error', async () => {
    // nock is also used by PollyJS under the hood.
    // In order to avoid unwanted side effects we have to reset nock.
    nock.cleanAll();
    nock.restore();
    nock.activate();

    // simulate network problem
    nock.disableNetConnect();
    try {
      const res = await retrofitResponse(await deliverFontCSS({ params: { kitid: 'foobar' } }, { log: console }));
      assert.equal(res.statusCode, 502);
    } finally {
      nock.cleanAll();
      nock.enableNetConnect();
    }
  });
});
