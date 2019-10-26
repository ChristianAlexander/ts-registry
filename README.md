# ts-registry

[![NPM Version](https://img.shields.io/npm/v/ts-registry.svg)](https://npmjs.com/package/ts-registry)

A general-purpose Inversion of Control (IoC) container.

## Quick Start

```Typescript
import { Registry } from 'ts-registry';

// instantiate a registry
const registry = new Registry<{
  'service-one': ServiceOne,
  'service-two': ServiceTwo
}>();

// define a simple service
registry
  .for('service-one')
  .use(() => new ServiceOne());

// define a service with a registered dependency
registry
  .for('service-two')
  .use(get => new ServiceTwo(get('service-one')));

// get a service
const service = registry.get('service-one');
```

## Scopes

TS Registry ships with two built-in scopes: Unique and Singleton. A scope determines when (or if) a new service will be instantiated when requested. This allows for both stateless and stateful services to be stored in and retrieved from the IoC container. Custom scopes may also be created to serve more specialized needs.

### Unique

The Unique scope ensures that a new service will be initialized each time one is requested.

```Typescript
import { unique } from 'ts-registry';

// ...

registry
  .for('my-service')
  .withScope(unique)
  .use(() => new MyService()); // <= service initializer

const instanceA = registry.get('my-service');
const instanceB = registry.get('my-service');

assert(instanceA !== instanceB);
```

In the above example, `instanceA` and `instanceB` are not equal by reference because the instance is not stored within the registry between calls to `.get`. The service initializer is run on each call to `.get` so a new instance is returned each time.

Note that if `.withScope()` is not used, then `unique` is used as a scope by default.

### Singleton

The Singleton scope ensures that the same instance of a service will be returned each time one is requested.

```Typescript
import { singleton } from 'ts-registry';

// ...

registry
  .for('my-service')
  .withScope(singleton)
  .use(() => new MyService()); // <= service initializer

const instanceA = registry.get('my-service');
const instanceB = registry.get('my-service');

assert(instanceA === instanceB);
```

In the above example, `instanceA` and `instanceB` ARE equal by reference because the instance was stored within the registry between calls to `.get`. The service initializer is only run on the first call to `.get` and the same instance is returned each time.

Note that the initializer is not called until the service is requested the first time. It is NOT called immediately upon definition of the service in the registry.

## Custom Scopes

Custom `ScopeProvider`s can be created to provided custom instance management logic. A `ScopeProvider` must define a "target scope" and a list of "source scopes." The "target scope" indicates how the instance of a service will be stored. The "source scopes" define where the registry will look to find existing instances of a service.

Example of a "per user" scope:

```Typescript
import { ScopeProvider, singleton } from 'ts-registry';

// ...

export const perUser: ScopeProvider<User> = {
  getTargetScope: () => getCurrentUser(),
  sourceScopeGetters: [ () => getCurrentUser(), ...singleton.sourceScopeGetters ]
}

// Usage
registry
  .for('my-service')
  .withScope(perUser)
  .use(() => new MyService())
```

With the example above, an instance of `MyService` will be created for each equal-by-reference result of `getCurrentUser()`. This means that subsequent calls to `registry.get('my-service')` will return the same instance of `MyService` for the same current user.

The first source scope getter instructs the `Registry` to start looking in the target scope for an instance of the service. If it is not found there, then it falls back to the scope getters defined by `singleton`. This allows for singleton instances to get returned if one exists. Note that if none of the getters can find an instance, when an instance is created, it is created in the target scope, regardless of the source scope getters.

The target scope object is passed as the second argument in the service initializer and can be used during initialization. In this case, the scope is the `User` returned from `getCurrentUser()`.

```Typescript
registry
  .for('my-service')
  .withScope(perUser)
  .use((_get, user) => new MyService(user.id))
```

## A note on memory management

Internally, `Registry` stores instances in a [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap). The scope object is used as the key and the service instance is stored as the value. This allows for instances of services to be garbage collected when the target scope object is dereferenced. For this reason, take care to not hold onto references of the scope object within a custom scope provider, service initializer, or other code. Doing so may lead to memory leaks.
