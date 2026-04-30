import type { Transport } from "../types/transport.cjs";
/**
 * Creates a transport that communicates with the MetaMask extension via Chrome's externally_connectable API
 *
 * @param params - Configuration parameters for the transport
 * @param params.extensionId - Optional MetaMask extension ID. If not provided, it will be auto-detected.
 * @returns A Transport instance that communicates with the MetaMask extension
 *
 * @example
 * ```typescript
 * // Create transport with auto-detection of extension ID
 * const transport = getExternallyConnectableTransport();
 *
 * // Create transport with specific extension ID
 * const transport = getExternallyConnectableTransport({
 *   extensionId: '...'
 * });
 * ```
 */
export declare function getExternallyConnectableTransport(params?: {
    extensionId?: string;
    defaultTimeout?: number;
    warmupTimeout?: number;
}): Transport;
//# sourceMappingURL=externallyConnectableTransport.d.cts.map