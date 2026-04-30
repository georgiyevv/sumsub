"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMultichainClient = getMultichainClient;
const utils_1 = require("./helpers/utils.cjs");
const errors_1 = require("./types/errors.cjs");
/**
 * Creates a Multichain API client with the specified transport
 *
 * @param options - Configuration options for the client
 * @param options.transport - The transport layer to use for communication with the wallet
 * @param options.requestTimeout - Maximum delay before aborting each request attempt
 * @returns A promise that resolves to a MultichainApiClient instance
 *
 * @example
 * ```typescript
 * const client = getMultichainClient({
 *   transport: getDefaultTransport()
 * });
 *
 * // Create a session with optional scopes
 * const session = await client.createSession({
 *   optionalScopes: { 'eip155:1': { methods: ['eth_sendTransaction'] } }
 * });
 *
 * // Invoke a method
 * const result = await client.invokeMethod({
 *   scope: 'eip155:1',
 *   request: {
 *     method: 'eth_sendTransaction',
 *     params: { to: '0x1234...', value: '0x0' }
 *   }
 * });
 * ```
 */
function getMultichainClient({ transport, }) {
    let initializationPromise = undefined;
    let connectionPromise = undefined;
    async function ensureConnected() {
        if (transport.isConnected()) {
            return;
        }
        if (!connectionPromise) {
            connectionPromise = transport.connect();
        }
        await connectionPromise;
    }
    async function ensureInitialized() {
        if (initializationPromise) {
            return await initializationPromise;
        }
        initializationPromise = (async () => {
            await ensureConnected();
            // Use withRetry to handle the case where the Multichain API requests don't resolve on page load (cf. https://github.com/MetaMask/metamask-mobile/issues/16550)
            await (0, utils_1.withRetry)(() => transport.request({ method: 'wallet_getSession' }, { timeout: transport.warmupTimeout ?? 1000 }));
        })();
        return await initializationPromise;
    }
    // Try to connect to the transport on client creation to reduce latency when first used
    void ensureConnected();
    return {
        createSession: async (params) => {
            await ensureInitialized();
            return await request({ transport, method: 'wallet_createSession', params });
        },
        getSession: async () => {
            await ensureInitialized();
            return await request({ transport, method: 'wallet_getSession' });
        },
        revokeSession: async (params) => {
            await ensureInitialized();
            initializationPromise = undefined;
            connectionPromise = undefined;
            await request({ transport, method: 'wallet_revokeSession', params });
            await transport.disconnect();
        },
        invokeMethod: async (params) => {
            await ensureInitialized();
            return await request({ transport, method: 'wallet_invokeMethod', params });
        },
        extendsRpcApi: () => {
            return getMultichainClient({ transport });
        },
        onNotification: (callback) => {
            return transport.onNotification(callback);
        },
    };
}
async function request({ transport, method, params, timeout, }) {
    const res = await transport.request({
        method,
        params,
    }, { timeout });
    if (res?.error) {
        throw new errors_1.MultichainApiError(res.error);
    }
    return res.result;
}
//# sourceMappingURL=multichainClient.cjs.map