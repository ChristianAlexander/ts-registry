import { expect } from 'chai';
import { Registry } from '.';
import { ScopeProvider, singleton, unique } from './registry';

describe('Registry', () => {
  describe('when no scope is defined', () => {
    it('throws when an initializer is not defined for the given key', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();

      // ACT
      const action = () => registry.get('service');

      // ASSERT
      expect(action).throws(/Initializer for 'service' not found/);
    });

    it('returns a new instance each time get is called', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();

      registry.for('service').use(() => ({}));

      // ACT
      const result1 = registry.get('service');
      const result2 = registry.get('service');

      // ASSERT
      expect(result1).to.not.equal(result2);
    });
  });

  describe('when a "unique" scope is defined', () => {
    it('returns a new instance each time get is called', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();

      registry
        .for('service')
        .withScope(unique)
        .use(() => ({}));

      // ACT
      const result1 = registry.get('service');
      const result2 = registry.get('service');

      // ASSERT
      expect(result1).to.not.equal(result2);
    });
  });

  describe('when a "singleton" scope is defined', () => {
    it('returns the same instance each time get is called', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();

      registry
        .for('service')
        .withScope(singleton)
        .use(() => ({}));

      // ACT
      const result1 = registry.get('service');
      const result2 = registry.get('service');

      // ASSERT
      expect(result1).to.equal(result2);
    });
  });

  describe('when muiltiple service are defined', () => {
    it('individual scopes are respected', () => {
      // ARRANGE
      const registry = new Registry<{
        a: number;
        b: { local: string; dep: string };
      }>();

      registry
        .for('a')
        .withScope(singleton)
        .use(() => Math.random());

      registry
        .for('b')
        .withScope(unique)
        .use(get => ({ local: '' + Math.random(), dep: '' + get('a') }));

      // ACT
      const result1 = registry.get('b');
      const result2 = registry.get('b');

      // ASSERT
      expect(result1.dep).to.equal(result2.dep);
      expect(result1.local).to.not.equal(result2.local);
    });
  });

  describe('invalid scope providers', () => {
    it('falls back to "unique" if getTargetScope is not a function', () => {
      // ARRANGE
      const scopeProvider: ScopeProvider<undefined> = {
        getTargetScope: 'not a function' as any,
        sourceScopeGetters: [],
      };

      const registry = new Registry<{ number: number }>();

      // ACT
      registry
        .for('number')
        .withScope(scopeProvider)
        .use(() => Math.random());

      const result1 = registry.get('number');
      const result2 = registry.get('number');

      // ASSERT
      expect(result1).to.not.equal(result2);
    });

    it('falls back to "unique" for a source scope getter that is not a function', () => {
      // ARRANGE
      const scope = {};
      const scopeProvider: ScopeProvider<{}> = {
        getTargetScope: () => scope,
        sourceScopeGetters: [undefined],
      };

      const registry = new Registry<{ number: number }>();

      // ACT
      registry
        .for('number')
        .withScope(scopeProvider)
        .use(() => Math.random());

      const result1 = registry.get('number');
      const result2 = registry.get('number');

      // ASSERT
      expect(result1).to.not.equal(result2);
    });

    it('falls back to "unique" if sourceScopeGetters is not an array', () => {
      // ARRANGE
      const scope = {};
      const scopeProvider: ScopeProvider<{}> = {
        getTargetScope: () => scope,
        sourceScopeGetters: 'not an array' as any,
      };

      const registry = new Registry<{ number: number }>();

      // ACT
      registry
        .for('number')
        .withScope(scopeProvider)
        .use(() => Math.random());

      const result1 = registry.get('number');
      const result2 = registry.get('number');

      // ASSERT
      expect(result1).to.not.equal(result2);
    });

    it('falls back to "unique" if a source scope getter returns a falsy scope', () => {
      // ARRANGE
      const scope = {};
      const scopeProvider: ScopeProvider<{}> = {
        getTargetScope: () => scope,
        sourceScopeGetters: [() => undefined],
      };

      const registry = new Registry<{ number: number }>();

      // ACT
      registry
        .for('number')
        .withScope(scopeProvider)
        .use(() => Math.random());

      const result1 = registry.get('number');
      const result2 = registry.get('number');

      // ASSERT
      expect(result1).to.not.equal(result2);
    });
  });
});

describe('strict typing', () => {
  it('provides the correct typing in a non-scoped initializer', () => {
    const registry = new Registry<TypeMap>();

    registry
      .for('gizmoService')
      .use(get => new GizmoService(get('widgetService')));
  });

  it('provides the correct typing in a scoped initializer', () => {
    const registry = new Registry<TypeMap>();

    registry
      .for('gizmoService')
      .withScope(singleton)
      .use(get => new GizmoService(get('widgetService')));
  });

  // Type definitions
  type TypeMap = {
    gizmoService: IGizmoService;
    widgetService: IWidgetService;
  };

  type Widget = {
    widgetId: string;
  };

  interface IWidgetService {
    getWidgets(): Widget[];
  }

  type Gizmo = {
    gizmoId: string;
  };

  interface IGizmoService {
    getGizmos(): Gizmo[];
  }

  class WidgetService implements IWidgetService {
    getWidgets(): Widget[] {
      throw new Error('Method not implemented.');
    }
  }

  class GizmoService implements IGizmoService {
    constructor(private readonly widgetService: IWidgetService) {}

    getGizmos(): Gizmo[] {
      throw new Error('Method not implemented.');
    }
  }
});
