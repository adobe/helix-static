## [1.0.1](https://github.com/adobe/helix-static/compare/v1.0.0...v1.0.1) (2019-05-14)


### Bug Fixes

* **deploy:** use correct package name when deploying ([287ffad](https://github.com/adobe/helix-static/commit/287ffad))

# 1.0.0 (2019-05-14)


### Bug Fixes

* **static:** always return entry path for 404 errors ([552ef3d](https://github.com/adobe/helix-static/commit/552ef3d))
* **static:** cache error responses for 5 minutes ([3173cea](https://github.com/adobe/helix-static/commit/3173cea))
* **static:** handle more 404 errors with path ([2c1ac18](https://github.com/adobe/helix-static/commit/2c1ac18))
* **static:** normalize URLs in rewritten CSS and JS ([f238adb](https://github.com/adobe/helix-static/commit/f238adb))
* **static:** prevent possible XSS by sanitizing output ([0795581](https://github.com/adobe/helix-static/commit/0795581))
* **static:** return the original URL in case a static resource cannot get retieved for an ESI include ([453c724](https://github.com/adobe/helix-static/commit/453c724)), closes [#813](https://github.com/adobe/helix-static/issues/813)
* **static:** turn on ESI processing when ESI flag is set ([a6d96b8](https://github.com/adobe/helix-static/commit/a6d96b8))
* **static:** use .url instead of .esi as extension for immutable resources ([d6c89f8](https://github.com/adobe/helix-static/commit/d6c89f8))


### Features

* **pipeline:** consistently use `context` instead of payload. ([ddea2cb](https://github.com/adobe/helix-static/commit/ddea2cb)), closes [#743](https://github.com/adobe/helix-static/issues/743)
* **static:** add ESI aliasing support for JavaScript modules ([6c0d0d5](https://github.com/adobe/helix-static/commit/6c0d0d5)), closes [/github.com/adobe/helix-pipeline/issues/224#issuecomment-476690621](https://github.com//github.com/adobe/helix-pipeline/issues/224/issues/issuecomment-476690621)
* **static:** Rewrite CSS URLs to Static ESI URLs so that better caching can be achieved ([75b47e5](https://github.com/adobe/helix-static/commit/75b47e5)), closes [adobe/helix-publish#61](https://github.com/adobe/helix-publish/issues/61) [adobe/helix-pipeline#267](https://github.com/adobe/helix-pipeline/issues/267)
