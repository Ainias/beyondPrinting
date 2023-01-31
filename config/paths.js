'use strict';

const path = require('path');
const fs = require('fs');

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(path.resolve(process.cwd()));
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const moduleFileExtensions = [
    'web.mjs',
    'mjs',
    'web.js',
    'js',
    'web.ts',
    'ts',
    'web.tsx',
    'tsx',
    'json',
    'web.jsx',
    'jsx',
];

// Resolve file paths in the same order as webpack
const resolveModule = (resolveFn, filePath) => {
    const extension = moduleFileExtensions.find((extension) => fs.existsSync(resolveFn(`${filePath}.${extension}`)));

    if (extension) {
        return resolveFn(`${filePath}.${extension}`);
    }

    return resolveFn(`${filePath}.js`);
};

// config after eject: we're in ./config/
module.exports = {
    dotenv: resolveApp('.env'),
    appPath: resolveApp('.'),
    appBuild: resolveApp('extension/build'),
    devAppBuild: resolveApp('extension/dev'),
    appPublic: resolveApp('extension/public'),
    manifestJson: resolveApp('extension/public/manifest.json'),
    appOptionsHtml: resolveApp('extension/public/options.html'),
    appPopupHtml: resolveApp('extension/public/popup.html'),
    appIndexJs: resolveModule(resolveApp, 'extension/src/index'),
    appBackgroundJs: resolveModule(resolveApp, 'extension/src/background/index'),
    appContentScriptJs: resolveApp('extension/src/contentScript/'),
    appOptionsJs: resolveModule(resolveApp, 'extension/src/options/index'),
    appPackageJson: resolveApp('package.json'),
    appSrc: resolveApp('extension/src'),
    appTsConfig: resolveApp('extension/tsconfig.json'),
    appJsConfig: resolveApp('jsconfig.json'),
    yarnLockFile: resolveApp('yarn.lock'),
    testsSetup: resolveModule(resolveApp, 'extension/src/setupTests'),
    appNodeModules: resolveApp('node_modules'),
};

module.exports.moduleFileExtensions = moduleFileExtensions;
