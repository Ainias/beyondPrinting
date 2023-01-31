'use strict';

const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware');
const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware');
const ignoredFiles = require('react-dev-utils/ignoredFiles');
const paths = require('./paths');

const host = process.env.HOST || '0.0.0.0';
const sockHost = process.env.WDS_SOCKET_HOST;
const sockPath = process.env.WDS_SOCKET_PATH; // default: '/sockjs-node'
const sockPort = process.env.WDS_SOCKET_PORT;

module.exports = function () {
    return {
        client: {
            overlay: false,
            logging: 'none',
            webSocketTransport: 'sockjs',
            webSocketURL: {
                hostname: sockHost,
                pathname: sockPath,
                port: sockPort,
            },
        },
        static: {
            publicPath: '',
        },
        // We have to disableHostChecking because the host is a custom extension
        // host that will always fail
        allowedHosts: 'all',
        // Enable gzip compression of generated files.
        compress: true,
        // Enable hot reloading server. It will provide WDS_SOCKET_PATH endpoint
        // for the WebpackDevServer client so it can learn when the files were
        // updated. The WebpackDevServer client is included as an entry point
        // in the webpack development configuration. Note that only changes
        // to CSS are currently hot reloaded. JS changes will refresh the browser.
        hot: true,
        // Enable custom sockjs hostname, pathname and port for websocket connection
        // to hot reloading server.
        webSocketServer: 'ws',
        // Reportedly, this avoids CPU overload on some systems.
        // https://github.com/facebook/create-react-app/issues/293
        // src/node_modules is not ignored to support absolute imports
        // https://github.com/facebook/create-react-app/issues/1065
        watchFiles: {
            paths: ['.'],
            options: {
                ignored: ignoredFiles(paths.appSrc),
            },
        },
        https: false,
        host,
        historyApiFallback: {
            // Paths with dots should still use the history fallback.
            // See https://github.com/facebook/create-react-app/issues/387.
            disableDotRule: true,
        },
        setupMiddlewares(middlewares, server) {
            // Keep `evalSourceMapMiddleware` and `errorOverlayMiddleware`
            // middlewares before `redirectServedPath` otherwise will not have any effect
            // This lets us fetch source contents from webpack for the error overlay
            middlewares.push(evalSourceMapMiddleware(server));
            // This lets us open files from the runtime error overlay.
            middlewares.push(errorOverlayMiddleware());

            return middlewares;
        },
    };
};
