import { Initializer, InitializerGetter } from './registry';

export function single<M, K extends keyof M>(
  initializer: Initializer<M, K>,
): Initializer<M, K> {
  let cachedValue: M[K];

  return (get: InitializerGetter<M, keyof M>): M[K] => {
    if (!cachedValue) {
      cachedValue = initializer(get);
    }

    return cachedValue;
  };
}
