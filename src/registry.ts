export class Registry<M> implements IRegistry<M> {
  get = <K extends keyof M>(key: K): M[K] => {
    if (!this.initializers.has(key)) {
      throw new Error(`Initializer for '${key.toString()}' not found`);
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

  for = <K extends keyof M>(key: K): ScopableInitializer<M, K> => {
    return {
      withScope: <TScope extends Scope>(
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

export type ScopableInitializer<M, K extends keyof M> = {
  /** Specifies an explicit scope for the service initializer. All calls to `get` will return an instance of the service based on this scope. */
  withScope<TScope extends Scope>(
    scopeProvider: ScopeProvider<TScope>,
  ): {
    /** Defines a service initializer with the explicitly specified scope. */
    use: (i: ScopedInitializer<M, K, TScope>) => void;
  };
  /** Defines a service initializer. Implicitly uses a unique scope (a new instance of the service will be created for every resolution). */
  use: (i: Initializer<M, K>) => void;
};

export type Scope = object | undefined;

export interface IRegistry<M> {
  /** Gets a service instance by key. The specific instance returned is controlled by the service's initilaizer scope. */
  get<K extends keyof M>(key: K): M[K];
  /** Defines the key to be used for a service. Chained methods will define the service scope and initializer. */
  for<K extends keyof M>(key: K): ScopableInitializer<M, K>;
}

export type Initializer<M, K extends keyof M> = (
  /** Gets a service instance by key. The specific instance returned is controlled by that service's initilaizer scope. */
  get: InitializerGetter<M>,
) => M[K];

export type ScopedInitializer<M, K extends keyof M, TScope extends Scope> = (
  /** Gets a service instance by key. The specific instance returned is controlled by that service's initilaizer scope. */
  get: InitializerGetter<M>,
  /** The scope object (if any) associated with this instance of the service. */
  scope: TScope,
) => M[K];

export type InitializerGetter<M> = <K extends keyof M>(key: K) => M[K];

export interface ScopeProvider<TScope extends Scope> {
  /** Gets the scope where the instance will be stored after initialization */
  getTargetScope(): TScope;
  /** Array of getters for scopes where an existing instance will be found */
  sourceScopeGetters: (() => object)[];
}

const singletonScope = Object.freeze({});
/** Ensures that a single service is instantiated once and then shared across all resolutions. */
export const singleton: ScopeProvider<typeof singletonScope> = {
  getTargetScope: () => singletonScope,
  sourceScopeGetters: [() => singletonScope],
};

/** Ensures that a new instance of a service is created for every resolution. */
export const unique: ScopeProvider<undefined> = {
  getTargetScope: () => undefined,
  sourceScopeGetters: [],
};
