/**
 * Helper utilities for testing observables and reactive components.
 */

// Import from our SDK adapter instead of real SDK
import { Subscribable, Subject, Subscription } from '../mocks/SDKAdapter';

/**
 * Helper for testing observables in components
 */
export class ObservableTestHelper {
  /**
   * Wait for observable to emit a value
   */
  static async waitForValue<T>(
    observable: Subscribable<T>,
    predicate?: (value: T) => boolean,
    timeout: number = 1000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const subscription = observable.sub((value) => {
        if (!predicate || predicate(value)) {
          subscription.destroy();
          resolve(value);
        }
      }, true);

      setTimeout(() => {
        subscription.destroy();
        reject(new Error(`Timeout waiting for observable value (${timeout}ms)`));
      }, timeout);
    });
  }

  /**
   * Collect all values emitted by an observable
   */
  static collectValues<T>(
    observable: Subscribable<T>,
    count: number,
    timeout: number = 1000
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const values: T[] = [];
      const subscription = observable.sub((value) => {
        values.push(value);
        if (values.length >= count) {
          subscription.destroy();
          resolve(values);
        }
      }, true);

      setTimeout(() => {
        subscription.destroy();
        if (values.length > 0) {
          resolve(values);
        } else {
          reject(new Error(`Timeout collecting observable values (${timeout}ms)`));
        }
      }, timeout);
    });
  }

  /**
   * Create a test subject with initial value
   */
  static createTestSubject<T>(initialValue: T): Subject<T> {
    return Subject.create(initialValue);
  }

  /**
   * Simulate observable updates over time
   */
  static async simulateUpdates<T>(
    subject: Subject<T>,
    values: T[],
    interval: number = 50
  ): Promise<void> {
    for (const value of values) {
      await new Promise(resolve => setTimeout(resolve, interval));
      subject.set(value);
    }
  }
}

