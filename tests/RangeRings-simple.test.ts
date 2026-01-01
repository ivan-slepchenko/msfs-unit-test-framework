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

  test('refs should be populated after render', async () => {
    const { component } = helper.renderComponent(RangeRings, {
      currentRange: currentRangeSubject,
      viewMode: viewModeSubject
    });

    await helper.waitForUpdate(100);

    // Component has individual refs: circleRef, arcRef, textRef, textBgRef
    expect((component as any).circleRef).toBeTruthy();
    expect((component as any).circleRef.instance).toBeTruthy();
    expect((component as any).arcRef).toBeTruthy();
    expect((component as any).arcRef.instance).toBeTruthy();
    expect((component as any).textRef).toBeTruthy();
    expect((component as any).textRef.instance).toBeTruthy();
    expect((component as any).textBgRef).toBeTruthy();
    expect((component as any).textBgRef.instance).toBeTruthy();
  });

  test('updateRings should work when called manually', async () => {
    const { component } = helper.renderComponent(RangeRings, {
      currentRange: currentRangeSubject,
      viewMode: viewModeSubject
    });

    await helper.waitForUpdate(100);

    // Verify refs are populated
    const circleRef = (component as any).circleRef;
    expect(circleRef.instance).toBeTruthy();
    
    // Get the actual DOM element
    const domCircle = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
    expect(domCircle).toBeTruthy();
    
    // Manually call updateRings with range 100
    (component as any).updateRings(100);

    // Check that ring has correct radius
    // At 100 nmi range: 25 nmi ring should be at 25% of display radius (80)
    // DISPLAY_RADIUS is 320, so 25/100 * 320 = 80
    const radius = parseFloat(domCircle.getAttribute('r') || '0');
    expect(radius).toBeCloseTo(80, 1);
  });

  test('updateRings should update ring radius correctly for different ranges', async () => {
    const { component } = helper.renderComponent(RangeRings, {
      currentRange: currentRangeSubject,
      viewMode: viewModeSubject
    });

    await helper.waitForUpdate(100);

    const domCircle = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
    
    // Test at 50 nmi range
    (component as any).updateRings(50);
    let radius = parseFloat(domCircle.getAttribute('r') || '0');
    // At 50 nmi range: 25 nmi ring should be at 50% of display radius (160)
    expect(radius).toBeCloseTo(160, 1);
    
    // Test at 200 nmi range
    (component as any).updateRings(200);
    radius = parseFloat(domCircle.getAttribute('r') || '0');
    // At 200 nmi range: 25 nmi ring should be at 12.5% of display radius (40)
    expect(radius).toBeCloseTo(40, 1);
  });
});

