export declare class MultichainApiError extends Error {
    constructor(error: {
        message?: string;
        code?: number;
        stack?: string;
    });
}
export declare class TransportError extends Error {
    constructor(message: string, originalError?: unknown);
}
export declare class TransportTimeoutError extends TransportError {
    constructor(message?: string, originalError?: unknown);
}
//# sourceMappingURL=errors.d.cts.map