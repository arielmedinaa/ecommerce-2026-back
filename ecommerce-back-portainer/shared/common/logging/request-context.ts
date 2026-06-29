import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextStore = {
  requestId?: string;
  userId?: string;
};

class RequestContextImpl {
  private readonly als = new AsyncLocalStorage<RequestContextStore>();

  run<T>(store: RequestContextStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  get(): RequestContextStore | undefined {
    return this.als.getStore();
  }
}

export const RequestContext = new RequestContextImpl();

