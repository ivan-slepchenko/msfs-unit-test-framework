/**
 * Примеры использования MSFS Unit Test Framework
 */

import { TestEnvironment, ComponentTestHelper } from '../src';
import { FSComponent, DisplayComponent, Subject } from '@microsoft/msfs-sdk';

// Пример простого компонента для тестирования
interface TestComponentProps {
  value?: number;
  valueSource?: Subject<number>;
  label?: string;
}

class TestComponent extends DisplayComponent<TestComponentProps> {
  private valueDisplayRef = FSComponent.createRef() as { instance: HTMLDivElement | null };
  private labelDisplayRef = FSComponent.createRef() as { instance: HTMLDivElement | null };

  public onAfterRender(): void {
    console.log('[TestComponent.onAfterRender] valueDisplayRef:', this.valueDisplayRef);
    console.log('[TestComponent.onAfterRender] value:', this.props.value);
    
    if (this.props.valueSource) {
      this.props.valueSource.sub((value: number) => {
        if (this.valueDisplayRef.instance) {
          this.valueDisplayRef.instance.textContent = value.toString();
        }
      }, true);
    } else if (this.props.value !== undefined) {
      if (this.valueDisplayRef.instance) {
        console.log('[TestComponent.onAfterRender] Setting textContent to', this.props.value);
        this.valueDisplayRef.instance.textContent = this.props.value.toString();
        console.log('[TestComponent.onAfterRender] textContent is now', this.valueDisplayRef.instance.textContent);
      } else {
        console.log('[TestComponent.onAfterRender] ERROR: valueDisplayRef.instance is null!');
      }
    }

    if (this.props.label && this.labelDisplayRef.instance) {
      this.labelDisplayRef.instance.textContent = this.props.label;
    }
  }

  public render() {
    return FSComponent.buildComponent('div', { class: 'test-component' },
      FSComponent.buildComponent('div', { ref: this.labelDisplayRef, class: 'label' }),
      FSComponent.buildComponent('div', { ref: this.valueDisplayRef, class: 'value' }, '---')
    );
  }
}


describe('MSFS Unit Test Framework Examples', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
  });

  afterEach(() => {
    helper.cleanup();
    env.teardown();
  });

  describe('Basic Component Rendering', () => {
    test('should render component to DOM', () => {
      const { element, component } = helper.renderComponent(TestComponent, {
        value: 42,
        label: 'Test'
      });

      expect(element).toBeTruthy();
      expect(element.classList.contains('test-component')).toBe(true);
    });

    test('should display static value', () => {
      helper.renderComponent(TestComponent, {
        value: 100,
        label: 'Static Value'
      });

      console.log('[TEST] Container HTML:', helper.getContainer().innerHTML);
      console.log('[TEST] .value element:', helper.querySelector('.value'));
      console.log('[TEST] .value textContent:', helper.querySelector('.value')?.textContent);
      
      expect(helper.getTextContent('.value')).toBe('100');
      expect(helper.getTextContent('.label')).toBe('Static Value');
    });
  });

  describe('SimVar Integration', () => {
    test('should read SimVar values', () => {
      env.setSimVar('L:TEST_VALUE', 'number', 42);
      
      const value = env.getSimVar('L:TEST_VALUE', 'number');
      expect(value).toBe(42);
    });

    test('should track SimVar access', () => {
      env.setSimVar('L:TEST', 'number', 10);
      
      // Simulate SimVar access
      const value = (globalThis as any).SimVar.GetSimVarValue('L:TEST', 'number');
      expect(value).toBe(10);
      
      const log = env.getSimVarAccessLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[log.length - 1].operation).toBe('get');
      expect(log[log.length - 1].name).toBe('L:TEST');
    });

    test('should support registered SimVars', () => {
      const id = (globalThis as any).SimVar.GetRegisteredId('L:REGISTERED', 'number');
      expect(id).toBeGreaterThanOrEqual(0);
      
      env.setSimVar('L:REGISTERED', 'number', 99);
      const value = (globalThis as any).simvar.getValueReg(id);
      expect(value).toBe(99);
    });
  });

  describe('Reactive Components with Subject', () => {
    test('should update when Subject changes', async () => {
      const valueSubject = Subject.create<number>(0);
      
      helper.renderComponent(TestComponent, {
        valueSource: valueSubject,
        label: 'Reactive'
      });

      expect(helper.getTextContent('.value')).toBe('0');
      
      valueSubject.set(50);
      await helper.waitForUpdate(50);
      
      expect(helper.getTextContent('.value')).toBe('50');
    });

    test('should update when SimVar changes via Subject', async () => {
      env.setSimVar('L:REACTIVE_VALUE', 'number', 10);
      
      // Create a Subject that reads from SimVar
      const valueSubject = Subject.create<number>(
        env.getSimVar('L:REACTIVE_VALUE', 'number')
      );
      
      helper.renderComponent(TestComponent, {
        valueSource: valueSubject
      });

      expect(helper.getTextContent('.value')).toBe('10');
      
      env.setSimVar('L:REACTIVE_VALUE', 'number', 25);
      valueSubject.set(env.getSimVar('L:REACTIVE_VALUE', 'number'));
      await helper.waitForUpdate(50);
      
      expect(helper.getTextContent('.value')).toBe('25');
    });
  });

  describe('DOM Querying', () => {
    test('should query DOM elements', () => {
      helper.renderComponent(TestComponent, {
        value: 42,
        label: 'Query Test'
      });

      const valueElement = helper.querySelector('.value');
      expect(valueElement).toBeTruthy();
      expect(valueElement?.textContent).toBe('42');
    });

    test('should check CSS classes', () => {
      helper.renderComponent(TestComponent, {
        value: 0
      });

      expect(helper.hasClass('.test-component', 'test-component')).toBe(true);
    });

    test('should get attributes', () => {
      helper.renderComponent(TestComponent, {
        value: 0
      });

      // Components can have attributes set via props
      const component = helper.querySelector('.test-component');
      expect(component).toBeTruthy();
    });
  });

  describe('Coherent API Mocking', () => {
    test('should track Coherent calls', async () => {
      const result = await (globalThis as any).Coherent.call('setValueReg_Number', 1, 42);
      
      const history = env.getCoherentCallHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].method).toBe('setValueReg_Number');
      expect(history[history.length - 1].args).toEqual([1, 42]);
    });
  });
});

