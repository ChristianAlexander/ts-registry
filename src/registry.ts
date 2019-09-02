export class Registry<M> implements IRegistry<M> {
  get = <K extends keyof M>(key: K, scope?: object): M[K] => {
    if (
      this.initializersByScope.has(scope) &&
      this.initializersByScope.get(scope).has(key)
    ) {
      return this.initializersByScope.get(scope).get(key)(this.get);
    } else if (
      scope !== this &&
      this.initializersByScope.has(this) &&
      this.initializersByScope.get(this).has(key)
    ) {
      return this.initializersByScope.get(scope).get(key)(this.get);
    }

    throw new Error(`Initializer for ${key} not found`);
  };

  for = <K extends keyof M>(key: K, scope?: object) => {
    if (!this.initializersByScope.has(scope || this)) {
      this.initializersByScope.set(scope || this, new Map());
    }

    return {
      use: (initializer: Initializer<M, K>) => {
        this.initializersByScope.get(scope).set(key, initializer);
      },
    };
  };

  withScope(scope: object): IRegistry<M> {
    return {
      get: <K extends keyof M>(key: K) => this.get(key, scope),
      for: <K extends keyof M>(key: K) => this.for(key, scope),
    };
  }

  private readonly initializersByScope = new WeakMap<
    object,
    Map<keyof M, Initializer<M, any>>
  >();
}

export interface IRegistry<M> {
  get<K extends keyof M>(key: K): M[K];
  for<K extends keyof M>(
    key: K,
  ): {
    use: (i: Initializer<M, K>) => void;
  };
}

export type Initializer<M, K extends keyof M> = (
  get: InitializerGetter<M, keyof M>,
) => M[K];

export type InitializerGetter<M, K extends keyof M> = (key: K) => M[K];
