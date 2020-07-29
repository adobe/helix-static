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

const sanitizer = require('sanitizer');
const log = require('@adobe/helix-log');

/**
 * Checks if the content type is JSON.
 * @param {string} type - content type
 * @returns {boolean} {@code true} if content type is JSON.
 */
function isJSON(type) {
  return /json/.test(type);
}

/**
 * Checks if the content type is binary.
 * @param {string} type - content type
 * @returns {boolean} {@code true} if content type is binary.
 */
function isBinary(type) {
  if (/text\/.*/.test(type)) {
    return false;
  }
  if (/.*\/javascript/.test(type)) {
    return false;
  }
  if (/.*\/.*json/.test(type)) {
    return false;
  }
  if (/.*\/.*xml/.test(type)) {
    return /svg/.test(type); // openwshisk treats SVG as binary
  }
  return true;
}

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

/**
 * Generates an error response
 * @param {string} message - error message
 * @param {number} code - error code.
 * @returns response
 */
function error(message, code = 500) {
  const statusCode = code === 400 ? 404 : code;
  log.info('delivering error', message, code);
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html',
      'X-Static': 'Raw/Static',
      'Cache-Control': 'max-age=300',
    },
    body: sanitizer.escape(message),
  };
}

/**
 * Generate a `forbidden` response.
 * @returns {object} a response object.
 */
function forbidden() {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'max-age=300', // don't bother us for the next five minutes
    },
    body: 'forbidden.',
  };
}

module.exports = {
  error, forbidden, isJSON, isJavaScript, isCSS, isBinary,
};
