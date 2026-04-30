"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWindowPostMessageTransport = getWindowPostMessageTransport;
const utils_1 = require("../helpers/utils.cjs");
const errors_1 = require("../types/errors.cjs");
const constants_1 = require("./constants.cjs");
/**
 * Creates a transport that communicates with the MetaMask extension via window.postMessage
 * This is primarily used for Firefox where the externally_connectable API is not available
 *
 * @returns A Transport instance that communicates with the MetaMask extension
 *
 * @example
 * ```typescript
 * const transport = getWindowPostMessageTransport();
 * await transport.connect();
 * const result = await transport.request({ method: 'eth_getBalance', params: ['0x123', 'latest'] });
 * ```
 */
function getWindowPostMessageTransport(params = {}) {
    const { defaultTimeout = constants_1.DEFAULT_REQUEST_TIMEOUT, warmupTimeout = constants_1.DEFAULT_WARMUP_TIMEOUT } = params;
    let messageListener = null;
    const pendingRequests = new Map();
    /**
     * Storing notification callbacks.
     * If we detect a "notification" (a message without an id) coming from the extension, we'll call each callback in here.
     */
    const notificationCallbacks = new Set();
    /**
     * Fire our local notification callbacks
     */
    function notifyCallbacks(data) {
        for (const cb of notificationCallbacks) {
            try {
                cb(data);
            }
            catch (err) {
                console.log('[WindowPostMessageTransport] notifyCallbacks error:', err);
            }
        }
    }
    function handleMessage(message) {
        if (message?.id === null || message?.id === undefined) {
            // No id => notification
            notifyCallbacks(message);
        }
        else if (pendingRequests.has(message.id)) {
            const resolve = pendingRequests.get(message.id);
            pendingRequests.delete(message.id);
            resolve?.(message);
        }
    }
    function sendRequest(request) {
        window.postMessage({
            target: constants_1.CONTENT_SCRIPT,
            data: {
                name: constants_1.MULTICHAIN_SUBSTREAM_NAME,
                data: request,
            },
        }, location.origin);
    }
    async function disconnect() {
        if (messageListener) {
            window.removeEventListener('message', messageListener);
            messageListener = null;
        }
        pendingRequests.clear();
        notificationCallbacks.clear();
    }
    const isConnected = () => Boolean(messageListener);
    return {
        warmupTimeout,
        connect: async () => {
            // If we're already connected, reconnect
            if (isConnected()) {
                await disconnect();
            }
            // Set up message listener
            messageListener = (event) => {
                const { target, data } = event.data;
                if (target !== constants_1.INPAGE || data?.name !== constants_1.MULTICHAIN_SUBSTREAM_NAME || event.origin !== location.origin) {
                    return;
                }
                handleMessage(data.data);
            };
            window.addEventListener('message', messageListener);
        },
        disconnect,
        isConnected,
        request: (params, options = {}) => {
            const { timeout = defaultTimeout } = options;
            if (!isConnected()) {
                throw new errors_1.TransportError('Transport not connected');
            }
            const id = (0, utils_1.getUniqueId)();
            const request = {
                jsonrpc: '2.0',
                id,
                ...params,
            };
            return (0, utils_1.withTimeout)(new Promise((resolve) => {
                // Resolve will actually get a TransportResponse<ReturnType>; we coerce at the end.
                pendingRequests.set(id, (value) => resolve(value));
                sendRequest(request);
            }), timeout, () => new errors_1.TransportTimeoutError()).catch((err) => {
                // Cleanup pending request on timeout (or other rejection before resolution) to prevent leaks
                if (pendingRequests.has(id)) {
                    pendingRequests.delete(id);
                }
                throw err;
            });
        },
        onNotification: (callback) => {
            notificationCallbacks.add(callback);
            return () => {
                notificationCallbacks.delete(callback);
            };
        },
    };
}
//# sourceMappingURL=windowPostMessageTransport.cjs.map