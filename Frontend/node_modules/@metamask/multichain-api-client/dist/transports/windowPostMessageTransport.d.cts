import type { Transport } from "../types/transport.cjs";
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
export declare function getWindowPostMessageTransport(params?: {
    defaultTimeout?: number;
    warmupTimeout?: number;
}): Transport;
//# sourceMappingURL=windowPostMessageTransport.d.cts.map