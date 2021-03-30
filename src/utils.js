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

const { Response } = require('@adobe/helix-fetch');
const sanitizer = require('sanitizer');
const log = require('@adobe/helix-log');

/**
 * Checks if the content type is css.
 * @param {string} type - content type
 * @returns {boolean} {@code true} if content type is css.
 */
function isCSS(type) {
  return type === 'text/css';
}

/**
 * Checks if the content type is javascript.
 * @param {string} type - content type
 * @returns {boolean} {@code true} if content type is javascript.
 */
function isJavaScript(type) {
  return /(text|application)\/(x-)?(javascript|ecmascript)/.test(type);
}

function stripErrorMessage(message) {
  return (message || '').replace(/\n/g, ' ');
}

/**
 * Generates an error response
 * @param {string} message - error message
 * @param {number} code - error code.
 * @returns {Response} The response
 */
function error(message, code = 500) {
  const status = code === 400 ? 404 : code;
  log.info('delivering error', message, code);
  return new Response(sanitizer.escape(message), {
    status,
    headers: {
      'Content-Type': 'text/html',
      'X-Static': 'Raw/Static',
      'Cache-Control': 'max-age=300',
      'X-Error': stripErrorMessage(message),
    },
  });
}

/**
 * Generate a `forbidden` response.
 * @returns {Response} The response
 */
function forbidden() {
  return new Response('forbidden.', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'max-age=300', // don't bother us for the next five minutes
    },
  });
}

module.exports = {
  error, forbidden, isJavaScript, isCSS, stripErrorMessage,
};
