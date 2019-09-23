export class Registry<M> implements IRegistry<M> {
  get = <K extends keyof M>(key: K, scope?: object): M[K] => {
    const s = scope || this;
    if (!this.instancesByScope.has(s)) {
      this.instancesByScope.set(s, new Map());
    }
    const instances = this.instancesByScope.get(s);

    if (!instances.has(key)) {
      const initializers = this.initializersByScope.get(s);

      if (!initializers || !initializers.has(key)) {
        if (s !== this) {
          return this.get(key, this);
        }
        throw new Error(`Initializer for '${key}' not found`);
      }

      instances.set(key, initializers.get(key)(this.get.bind(this)));
    }

    return instances.get(key);
  };

  for = <K extends keyof M>(key: K, scope?: object) => {
    const s = scope || this;
    if (!this.initializersByScope.has(s)) {
      this.initializersByScope.set(s, new Map());
    }

    return {
      use: (initializer: Initializer<M, K>) => {
        this.initializersByScope.get(s).set(key, initializer);
      },
    };
  };

  withScope(scope: object): IScopedRegistry<M> {
    return {
      get: <K extends keyof M>(key: K) => this.get(key, scope),
      for: <K extends keyof M>(key: K) => this.for(key, scope),
    };
  }

  private readonly initializersByScope = new WeakMap<
    object,
    Map<keyof M, Initializer<M, any>>
  >();

  private readonly instancesByScope = new WeakMap<object, Map<keyof M, any>>();
}

export interface IRegistry<M> {
  get<K extends keyof M>(key: K, scope?: object): M[K];
  for<K extends keyof M>(
    key: K,
    scope?: object,
  ): {
    use: (i: Initializer<M, K>) => void;
  };
  withScope(scope: object): IScopedRegistry<M>;
}

export interface IScopedRegistry<M> {
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
