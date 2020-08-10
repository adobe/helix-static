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
const { match } = require('path-to-regexp');
const { error } = require('./utils');

class Router {
  constructor() {
    this._routes = [];
  }

  register(route, handler, condition = () => true) {
    this._routes.push([match(route), handler, condition]);
    return this;
  }

  async handle(path, options) {
    const pair = this._routes
      .find(([route, _, condition]) => route(path) && condition(options));
    if (!pair) {
      return error('Unknown path', 400);
    }
    const [route, handler] = pair;

    return handler({
      // when using the spread operator, latter arguments
      // override earlier ones. Having route as the second
      // argument ensures options.params cannot override
      // route().params
      ...options,
      ...route(path),
    });
  }
}

module.exports = { Router };
