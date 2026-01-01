// Simple test to verify refs are working and updateRings can be called manually
import '../src/setupTests';
import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject } from '@microsoft/msfs-sdk';
// @ts-ignore
import { RangeRings, RangeRingsProps } from '../../html_ui/stormscope/components/RangeRings';

describe('RangeRings - Simple Ref Test', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;
  let currentRangeSubject: Subject<number>;
  let viewModeSubject: Subject<'120' | '360'>;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
    currentRangeSubject = Subject.create<number>(100);
    viewModeSubject = Subject.create<'120' | '360'>('360');
  });

  afterEach(() => {
    helper.cleanup();
    env.teardown();
  });

  test('refs should be populated after render', () => {
    const { component } = helper.renderComponent(RangeRings, {
      currentRange: currentRangeSubject,
      viewMode: viewModeSubject
    });

    // Check if refs are populated
    const ranges = [25, 50, 100, 200];
    ranges.forEach(range => {
      const ringRef = (component as any).ringRefs.get(range);
      expect(ringRef).toBeTruthy();
      expect(ringRef.circle.instance).toBeTruthy();
      expect(ringRef.text.instance).toBeTruthy();
      expect(ringRef.group.instance).toBeTruthy();
    });
  });

  test('updateRings should work when called manually', () => {
    const { component } = helper.renderComponent(RangeRings, {
      currentRange: currentRangeSubject,
      viewMode: viewModeSubject
    });

    // Verify refs are populated
    const ringRef25 = (component as any).ringRefs.get(25);
    const ringRef100 = (component as any).ringRefs.get(100);
    
    expect(ringRef25.circle.instance).toBeTruthy();
    expect(ringRef100.circle.instance).toBeTruthy();
    
    // Get the actual DOM elements that querySelector finds
    const domRing25 = helper.querySelectorSVG('circle[data-range="25"]') as SVGCircleElement;
    const domRing100 = helper.querySelectorSVG('circle[data-range="100"]') as SVGCircleElement;
    
    // Check if refs point to the same elements that querySelector finds
    // If they don't match, that's the problem - refs point to original elements, not cloned ones
    const ref25MatchesDOM = ringRef25.circle.instance === domRing25;
    const ref100MatchesDOM = ringRef100.circle.instance === domRing100;
    
    // If refs don't match DOM, update them to point to the DOM elements
    // This simulates what ref reconciliation should do
    if (!ref25MatchesDOM && domRing25) {
      ringRef25.circle.instance = domRing25;
      const text25 = helper.querySelectorSVG('text[data-range="25"]') as SVGTextElement;
      if (text25) ringRef25.text.instance = text25;
      const group25 = domRing25.parentElement;
      if (group25) ringRef25.group.instance = group25 as any;
    }
    if (!ref100MatchesDOM && domRing100) {
      ringRef100.circle.instance = domRing100;
      const text100 = helper.querySelectorSVG('text[data-range="100"]') as SVGTextElement;
      if (text100) ringRef100.text.instance = text100;
      const group100 = domRing100.parentElement;
      if (group100) ringRef100.group.instance = group100 as any;
    }

    // Manually call updateRings with range 100
    (component as any).updateRings(100);

    // Check that rings have correct radii
    const radius25 = parseFloat(domRing25.getAttribute('r') || '0');
    const radius100 = parseFloat(domRing100.getAttribute('r') || '0');
    
    // At 100 nmi range: 25 nmi ring should be at 25% of display radius (45)
    expect(radius25).toBeCloseTo(45, 1);
    // 100 nmi ring should be at full display radius (180)
    expect(radius100).toBeCloseTo(180, 1);
  });

  test('updateRings should update styling correctly', () => {
    const { component } = helper.renderComponent(RangeRings, {
      currentRange: currentRangeSubject,
      viewMode: viewModeSubject
    });

    // Manually call updateRings with range 50
    (component as any).updateRings(50);

    // Check active ring (50) has active styling
    const activeRing50 = helper.querySelectorSVG('circle[data-range="50"]') as SVGCircleElement;
    expect(activeRing50.getAttribute('stroke')).toBe('#00FF00');
    expect(activeRing50.getAttribute('stroke-width')).toBe('2');
    
    // Check inactive ring (25) has inactive styling
    const inactiveRing25 = helper.querySelectorSVG('circle[data-range="25"]') as SVGCircleElement;
    expect(inactiveRing25.getAttribute('stroke')).toBe('#006600');
    expect(inactiveRing25.getAttribute('stroke-width')).toBe('1');
  });
});

