import type { MultichainApiClient } from "./types/multichainApi.mjs";
import type { DefaultRpcApi, RpcApi } from "./types/scopes/index.mjs";
import type { Transport } from "./types/transport.mjs";
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
export declare function getMultichainClient<T extends RpcApi = DefaultRpcApi>({ transport, }: {
    transport: Transport;
}): MultichainApiClient<T>;
//# sourceMappingURL=multichainClient.d.mts.map