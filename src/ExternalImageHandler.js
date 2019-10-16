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

const BlobHandler = require('./BlobHandler.js');

const PATH_REGEXP = /^\/([a-zA-Z0-9_-]+=*)\.external\.image$/;

/**
 * Helper class for external image paths
 */
class ExternalImageHandler extends BlobHandler {
  /**
   * Create a new external image handler for the given action params.
   *
   * @param {Object} params - action params
   * @returns {null|ExternalImageHandler} or {@code null} if params don't contain the required info.
   */
  static create(params = {}) {
    const {
      path,
      AZURE_BLOB_SAS: azureBlobSAS,
      AZURE_BLOB_URI: azureBlobURI,
      __ow_logger: log,
    } = params;
    if (!path || !azureBlobSAS || !azureBlobURI) {
      return null;
    }
    const handler = new ExternalImageHandler({
      azureBlobURI,
      azureBlobSAS,
      log,
    });

    const uri = handler.decodeExternalImagePath(path);
    if (!uri) {
      return null;
    }
    handler.uri = uri;
    return handler;
  }

  /**
   * Image handler construction.
   * @param {Object} opts - options.
   * @param {string} opts.azureBlobSAS - the Shared Access Secret to the azure blob store
   * @param {string} opts.azureBlobURI - the URI of the azure blob store.
   * @param {Logger} opts.log - console like logger interface
   */
  constructor(opts = {}) {
    super(opts);
  }

  /**
   * Tests if the given path specifies and external image and decodes it.
   * @param {string} path The path to decode.
   * @returns {null|string} the decoded url or null.
   */
  decodeExternalImagePath(path) {
    const { log } = this;
    log.debug(`decodePath=${path}`);
    const r = PATH_REGEXP.exec(path);
    if (!r) {
      log.debug('no external image path.');
      return null;
    }
    const encoded = r[1].replace(/_/, '/').replace(/-/, '+');
    const url = Buffer.from(encoded, 'base64').toString('utf-8');
    log.debug(`url=${url}`);
    return url;
  }

  /**
   * Handles the external image request
   * @returns an openwhisk action response
   */
  async handle() {
    const { log } = this;
    if (this.uri.startsWith(this._azureBlobURI)) {
      // todo: fetch content-type ?
      return {
        statusCode: 307,
        headers: {
          Location: this.uri,
        },
      };
    }
    try {
      const resource = await this.getBlob(this.uri);
      return {
        statusCode: 307,
        headers: {
          Location: resource.uri,
          'X-Content-Type': resource.contentType,
          'X-Static': 'Raw/Static',
          // 'Cache-Control': 's-maxage=300',
          // 'Surrogate-Key': surrogateKey,
        },
      };
    } catch (e) {
      log.error(`Error while fetching blob: ${e}`);
      return {
        statusCode: e.statusCode || 500,
      };
    }
  }
}

module.exports = ExternalImageHandler;
