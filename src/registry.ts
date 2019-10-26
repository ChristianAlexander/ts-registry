export class Registry<M> implements IRegistry<M> {
  get = <K extends keyof M>(key: K): M[K] => {
    if (!this.initializers.has(key)) {
      throw new Error(`Initializer for '${key}' not found`);
    }

    const { initializer, scopeProvider } = this.initializers.get(key);

    for (let i = 0; i < scopeProvider.sourceScopeGetters.length; i++) {
      const getSourceScope = scopeProvider.sourceScopeGetters[i];

      if (typeof getSourceScope !== 'function') continue;
      const sourceScope = getSourceScope();

      if (!sourceScope) continue;
      if (!this.instancesByScope.has(sourceScope)) continue;
      if (!this.instancesByScope.get(sourceScope).has(key)) continue;

      return this.instancesByScope.get(sourceScope).get(key);
    }

    const targetScope =
      typeof scopeProvider.getTargetScope === 'function' &&
      scopeProvider.getTargetScope();

    const instance = initializer(this.get.bind(this), targetScope);
    if (targetScope) {
      if (!this.instancesByScope.has(targetScope)) {
        this.instancesByScope.set(targetScope, new Map());
      }

      this.instancesByScope.get(targetScope).set(key, instance);
    }

    return instance;
  };

  for = <K extends keyof M>(key: K) => {
    return {
      withScope: <TScope extends object>(
        scopeProvider: ScopeProvider<TScope>,
      ) => ({
        use: (initializer: ScopedInitializer<M, K, TScope>) => {
          this.initializers.set(key, { initializer, scopeProvider });
        },
      }),
      use: (initializer: Initializer<M, K>) => {
        this.initializers.set(key, { initializer, scopeProvider: unique });
      },
    };
  };

  private readonly initializers = new Map<
    keyof M,
    {
      initializer: ScopedInitializer<M, any, any>;
      scopeProvider: ScopeProvider<any>;
    }
  >();

  private readonly instancesByScope = new WeakMap<object, Map<keyof M, any>>();
}

export interface IRegistry<M> {
  get<K extends keyof M>(key: K): M[K];
  for<K extends keyof M>(
    key: K,
  ): {
    withScope<TScope extends object>(
      scopeProvider: ScopeProvider<TScope>,
    ): {
      use: (i: ScopedInitializer<M, K, TScope>) => void;
    };
    use: (i: Initializer<M, K>) => void;
  };
}

export type Initializer<M, K extends keyof M> = (
  get: InitializerGetter<M>,
) => M[K];

export type ScopedInitializer<M, K extends keyof M, TScope extends object> = (
  get: InitializerGetter<M>,
  scope: TScope,
) => M[K];

export type InitializerGetter<M, K extends keyof M = keyof M> = (
  key: K,
) => M[K];

export interface ScopeProvider<TScope extends object> {
  /** Gets the scope where the instance will be stored after initialization */
  getTargetScope(): TScope;
  /** Array of getters for scopes where an existing instance will be found */
  sourceScopeGetters: (() => object)[];
}

const singletonScope = {};
export const singleton: ScopeProvider<{}> = {
  getTargetScope: () => singletonScope,
  sourceScopeGetters: [() => singletonScope],
};

export const unique: ScopeProvider<undefined> = {
  getTargetScope: () => undefined,
  sourceScopeGetters: [],
};
