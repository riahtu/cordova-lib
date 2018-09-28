/**
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

var path = require('path');
var events = require('cordova-common').events;

/**
 * Creates hook script context
 * @constructor
 * @param {String} hook The hook type
 * @param {Object} opts Hook options
 * @returns {Object} */
function Context (hook, opts) {
    this.hook = hook;

    // create new object, to avoid affecting input opts in other places
    // For example context.opts.plugin = Object is done, then it affects by reference
    this.opts = Object.assign({}, opts);
    this.cmdLine = process.argv.join(' ');
    this.cordova = require('../cordova/cordova');
}

// As per CB-9834 we need to maintain backward compatibility and provide a compat layer
// for plugins that still require modules, factored to cordova-common.
var compatMap = {
    '../configparser/ConfigParser': function () {
        return require('cordova-common').ConfigParser;
    },
    '../util/xml-helpers': function () {
        return require('cordova-common').xmlHelpers;
    }
};

/**
 * Returns a required module
 * @param {String} modulePath Module path
 * @returns {Object} */
Context.prototype.requireCordovaModule = function (modulePath) {
    const [pkg, ...pkgPath] = modulePath.split('/');

    if (!pkg.match(/^cordova-[^/]+/)) {
        events.emit('warn',
            `Using "requireCordovaModule" to load non-cordova module ` +
            `"${modulePath}" is deprecated. Instead, add this module to ` +
            `your dependencies and use regular "require" to load it.`
        );
    }

    if (pkg !== 'cordova-lib') return require(modulePath);

    // There is a very common mistake, when hook requires some cordova functionality
    // using 'cordova-lib/...' path.
    // This path will be resolved only when running cordova from 'normal' installation
    // (without symlinked modules). If cordova-lib linked to cordova-cli this path is
    // never resolved, so hook fails with 'Error: Cannot find module 'cordova-lib''
    var resolvedPath = path.resolve(__dirname, '../..', ...pkgPath);
    var relativePath = path.relative(__dirname, resolvedPath).replace(/\\/g, '/');
    events.emit('verbose', 'Resolving module name for ' + modulePath + ' => ' + relativePath);

    var compatRequire = compatMap[relativePath];
    if (compatRequire) {
        events.emit('warn', 'The module "' + path.basename(relativePath) + '" has been factored ' +
            'into "cordova-common". Consider update your plugin hooks.');
        return compatRequire();
    }

    return require(relativePath);
};

module.exports = Context;
