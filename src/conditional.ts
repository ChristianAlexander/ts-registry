import { Initializer, InitializerGetter } from "./registry";

export function conditional<M, K extends keyof M, T>(
  extractor: (get: InitializerGetter<M, keyof M>) => T,
  initializerMap: Map<T, Initializer<M, K>>
): Initializer<M, K> {
  return get => initializerMap.get(extractor(get))(get);
}
