export type ClientOptions = {
    baseUrl: string;
    token: string;
    userAgent?: string;
};
type RequestOptions = {
    signal?: AbortSignal;
};
/**
 * Thin wrapper around native fetch (Node 20+ ships undici) for CryptFlare
 * bearer-token authenticated requests.
 *
 * Deliberately minimal: no retries, no proxy handling. If we ever need
 * HTTPS_PROXY / NO_PROXY support for GHES self-hosted runners, switch this
 * implementation to @actions/http-client (native fetch ignores proxy env
 * vars). Public surface stays the same so callers do not need to change.
 */
export declare class CryptflareClient {
    private readonly baseUrl;
    private readonly headers;
    constructor(opts: ClientOptions);
    get<T>(path: string, options?: RequestOptions): Promise<T>;
    post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
    request<T>(method: string, path: string, body: unknown, options?: RequestOptions): Promise<T>;
}
export {};
