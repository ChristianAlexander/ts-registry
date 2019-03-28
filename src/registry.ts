export class Registry<M> {
  get<K extends keyof M>(key: K): M[K] {
    return this.map.get(key)(this.get.bind(this));
  }

  for<K extends keyof M>(key: K) {
    return {
      use: (initializer: Initializer<M, K>) => {
        this.map.set(key, initializer);
      }
    };
  }

  private readonly map = new Map<keyof M, Initializer<M, any>>();
}

type Initializer<M, K extends keyof M> = (
  get: <IK extends keyof M>(key: IK) => M[IK]
) => M[K];
