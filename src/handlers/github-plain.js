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
const { fetchFromGithub } = require('../github-fetcher');
const { isBinary, isJSON } = require('../utils');

/**
 * Processes the body according to the content type.
 * @param {string} type - the content type
 * @param {Buffer} responsebody - the response body
 * @param {boolean} esi - esi flag
 * @param {string} entry - the base href
 * @returns {Function|any|string|any} the response body
 */
function processBody(responsebody, { type }) {
  if (isBinary(type)) {
    return responsebody.toString('base64');
  }
  if (isJSON(type)) {
    return JSON.parse(responsebody.toString('utf-8'));
  }
  return responsebody.toString('utf-8');
}

function handle(opts) {
  return fetchFromGithub(opts, processBody);
}

module.exports = handle;
