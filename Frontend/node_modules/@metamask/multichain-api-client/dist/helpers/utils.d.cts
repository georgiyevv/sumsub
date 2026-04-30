/**
 * Gets an ID that is guaranteed to be unique so long as no more than
 * 4_294_967_295 (uint32 max) IDs are created, or the IDs are rapidly turned
 * over.
 *
 * @returns The unique ID.
 */
export declare const getUniqueId: () => number;
/**
 * Detects if we're in a Chrome-like environment with extension support
 */
export declare const isChromeRuntime: () => boolean;
/**
 * Retry a function until we get a response
 * @param fn - Function to execute
 * @param maxRetries - Max number of retries
 * @param requestTimeout - Maximum delay before aborting each request attempt
 * @param retryDelay - Delay between retries (defaults to requestTimeout) in case of error
 * @returns
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: {
    maxRetries?: number;
    retryDelay?: number;
    timeoutErrorClass?: new (...args: any[]) => Error;
}): Promise<T>;
/**
 * Returns a promise that resolves or rejects like the given promise, but fails if the timeout is exceeded.
 * @param promise - The promise to monitor
 * @param timeoutMs - Maximum duration in ms. Use -1 to disable timeout.
 * @param errorFactory - Optional callback to generate a custom error on timeout
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorFactory?: () => Error): Promise<T>;
//# sourceMappingURL=utils.d.cts.map