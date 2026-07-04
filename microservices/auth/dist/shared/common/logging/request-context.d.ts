export type RequestContextStore = {
    requestId?: string;
    userId?: string;
};
declare class RequestContextImpl {
    private readonly als;
    run<T>(store: RequestContextStore, fn: () => T): T;
    get(): RequestContextStore | undefined;
}
export declare const RequestContext: RequestContextImpl;
export {};
