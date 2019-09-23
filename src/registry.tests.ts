import { expect } from 'chai';
import { Registry } from '.';

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

    it('returns the same instance each time get is called without a scope', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();

      registry.for('service').use(() => ({}));

      // ACT
      const result1 = registry.get('service');
      const result2 = registry.get('service');

      // ASSERT
      expect(result1).to.equal(result2);
    });
  });

  describe('when an object is passed as a scope', () => {
    it('throws when an initializer is not defined for the given key', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();
      const scope = {};

      // ACT
      const action = () => registry.get('service', scope);

      // ASSERT
      expect(action).throws(/Initializer for 'service' not found/);
    });

    it('returns the same instance each time get is called with the same scope', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();
      const scope = {};

      registry.for('service', scope).use(() => ({}));
      registry.for('service', scope).use(() => ({}));

      // ACT
      const result1 = registry.get('service', scope);
      const result2 = registry.get('service', scope);

      // ASSERT
      expect(result1).to.equal(result2);
    });

    it('returns a different instance when get is called with different scopes', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();
      const scope1 = {};
      const scope2 = {};

      registry.for('service', scope1).use(() => ({}));
      registry.for('service', scope2).use(() => ({}));

      // ACT
      const result1 = registry.get('service', scope1);
      const result2 = registry.get('service', scope2);

      // ASSERT
      expect(result1).to.not.equal(result2);
    });

    it('throws if get is called with a different scope', () => {
      // ARRANGE
      const registry = new Registry<{ service: any }>();
      const scope1 = {};
      const scope2 = {};
      registry.for('service', scope1).use(() => ({}));

      // ACT
      const action = () => registry.get('service', scope2);

      // ASSERT
      expect(action).throws(/Initializer for 'service' not found/);
    });

    it('returns values from the parent scope when the inner scope does not have the value', () => {
      // ARRANGE
      const registry = new Registry<{ a: string }>();
      registry.for('a').use(() => 'foo');
      const scope = {};
      const scopedRegistry = registry.withScope(scope);

      // ACT
      const action = () => scopedRegistry.get('a');

      // ASSERT
      expect(action).to.not.throw();
      expect(action()).to.equal('foo');
    });

    it('returns values from the inner scope when both the outer and the inner scopes have initializers', () => {
      // ARRANGE
      const registry = new Registry<{ a: string }>();
      registry.for('a').use(() => '123');
      const scope = {};
      const scopedRegistry = registry.withScope(scope);
      scopedRegistry.for('a').use(() => '321');

      // ACT
      const action = () => scopedRegistry.get('a');

      // ASSERT
      expect(action).to.not.throw();
      expect(action()).to.equal('321');
    });
  });
});
