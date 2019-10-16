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
const crypto = require('crypto');
const rp = require('request-promise-native');

// cache external urls
const blobCache = {};

/**
 * @typedef ExternalResource
 * @property {string} uri - URI of the external resource
 * @property {string} originalUri - URI of the original resource
 * @property {string} sha1 - sha1 checksum
 * @property {string} contentType - content type
 * @property {number} contentLength - content length
 * @property {Buffer} body - content
 */

/**
 * Helper class for uploading images to azure blob storage based on their content checksum (md5).
 */
class BlobHandler {
  /**
   * Image handler construction.
   * @param {Object} opts - options.
   * @param {string} opts.azureBlobSAS - the Shared Access Secret to the azure blob store
   * @param {string} opts.azureBlobURI - the URI of the azure blob store.
   * @param {Logger} opts.log - console like logger interface
   */
  constructor(opts = {}) {
    Object.assign(this, {
      _azureBlobSAS: opts.azureBlobSAS || process.env.AZURE_BLOB_SAS,
      _azureBlobURI: opts.azureBlobURI || process.env.AZURE_BLOB_URI,
      log: opts.log || console,
      _cache: blobCache,
    });
  }

  /**
   * Downloads the file addressed by `uri` and returns information representing the object.
   * @param {string} uri
   * @returns {ExternalResource} the external resource object or `null`,
   *                             if the resource could not be fetched.
   */
  async fetch(uri) {
    const { log } = this;
    try { // todo: smarter download with eventual writing to disk.
      log.debug(`GET ${uri}`);
      const ret = await rp({
        uri,
        method: 'GET',
        encoding: null,
        resolveWithFullResponse: true,
      });
      log.debug({
        statusCode: ret.statusCode,
        headers: ret.headers,
      });

      // compute md5
      const sha1 = crypto.createHash('sha1')
        .update(ret.body)
        .digest('hex');

      return {
        originalUri: uri,
        uri: `${this._azureBlobURI}/${sha1}`,
        body: ret.body,
        contentType: ret.headers['content-type'],
        contentLength: Number.parseInt(ret.headers['content-length'], 10) || 0,
        sha1,
      };
    } catch (e) {
      log.error(`Error while downloading ${uri}: ${e.statusCode}`);
      return null;
    }
  }

  /**
   * Checks if the blob already exists using a HEAD request to the blob store.
   * @param {ExternalResource} blob - the resource object.
   * @returns {boolean} `true` if the resource exists.
   */
  async checkBlobExists(blob) {
    const { log } = this;
    try {
      log.debug(`HEAD ${blob.uri}`);
      const ret = await rp({
        uri: blob.uri,
        method: 'HEAD',
        encoding: null,
        resolveWithFullResponse: true,
      });
      log.debug({
        statusCode: ret.statusCode,
        headers: ret.headers,
      });
      return true;
    } catch (e) {
      log.info(`Blob ${blob.uri} does not exist: ${e.statusCode}`);
      return false;
    }
  }

  /**
   * Uploads the blob to the blob store.
   * @param {ExternalResource} blob - the resource object.
   * @returns {boolean} `true` if the upload succeeded.
   */
  async upload(blob) {
    const { log } = this;
    try {
      log.debug(`PUT ${blob.uri}`);
      const ret = await rp({
        uri: `${blob.uri}${this._azureBlobSAS}`,
        method: 'PUT',
        encoding: null,
        body: blob.body,
        resolveWithFullResponse: true,
        headers: {
          'content-type': blob.contentType || 'application/octet-stream',
          'x-ms-date': new Date().toString(),
          'x-ms-blob-type': 'BlockBlob',
        },
      });
      log.debug({
        statusCode: ret.statusCode,
        headers: ret.headers,
      });
      return true;
    } catch (e) {
      log.error(`Failed to upload blob ${blob.uri}: ${e.statusCode} ${e.message}`);
      return false;
    }
  }

  /**
   * Gets the blob information for the external resource addressed by uri. It also ensured that the
   * addressed blob is uploaded to the blob store.
   *
   * @param {string} uri - URI of the external resource.
   * @returns {ExternalResource} the external resource object or null if not exists.
   */
  async getBlob(uri) {
    if (uri in this._cache) {
      return this._cache[uri];
    }
    const blob = await this.fetch(uri);
    if (!blob) {
      return null;
    }
    const exists = await this.checkBlobExists(blob);
    if (!exists) {
      await this.upload(blob);
    }
    // don't cache the data
    delete blob.body;
    this._cache[uri] = blob;

    return blob;
  }
}

module.exports = BlobHandler;
