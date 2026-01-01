import '../src/setupTests';
import { TestEnvironment } from '../src';

describe('@avimate/msfs-jest-utils smoke', () => {
  test('TestEnvironment can setup/teardown', () => {
    const env = new TestEnvironment();
    env.setup();
    expect(env.getDocument()).toBeTruthy();
    env.teardown();
  });
});

