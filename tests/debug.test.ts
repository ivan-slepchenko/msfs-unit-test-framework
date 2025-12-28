import { TestEnvironment, ComponentTestHelper } from '../src';
import { AircraftSymbol } from '../../html_ui/stormscope/components/AircraftSymbol';

describe('Debug Test', () => {
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

  test('debug what is actually rendered', () => {
    const { element, vnode } = helper.renderComponent(AircraftSymbol, {});

    console.log('=== DEBUG INFO ===');
    console.log('Element:', element);
    console.log('Element tagName:', element?.tagName);
    console.log('Element id:', element?.id);
    console.log('Element innerHTML:', element?.innerHTML);
    console.log('Element childNodes:', element?.childNodes);
    console.log('Element children length:', element?.children?.length);
    console.log('VNode:', vnode);
    console.log('VNode instance:', vnode?.instance);
    console.log('VNode children:', vnode?.children);
    console.log('Container innerHTML:', helper.getContainer().innerHTML);
    console.log('Container childNodes:', helper.getContainer().childNodes);

    // Try to find elements
    const gElement = helper.querySelector('g');
    console.log('Found g element:', gElement);
    
    const lineElements = helper.querySelectorAll('line');
    console.log('Found line elements:', lineElements.length);
    
    const svgLineElements = helper.querySelectorAllSVG('line');
    console.log('Found SVG line elements:', svgLineElements.length);
    
    const allElements = helper.getContainer().querySelectorAll('*');
    console.log('All elements in container:', allElements.length);
    Array.from(allElements).forEach(el => {
      console.log(`  - ${el.tagName} ${el.id ? `#${el.id}` : ''} ${el.className ? `.${el.className}` : ''}`);
    });
  });
});

