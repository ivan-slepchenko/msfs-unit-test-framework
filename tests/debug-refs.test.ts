// Debug test to inspect VNode props and ref matching
import '../src/setupTests';
import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject } from '@microsoft/msfs-sdk';
// @ts-ignore
import { RangeRings } from '../../html_ui/stormscope/components/RangeRings';

describe('Debug Refs', () => {
  test('inspect VNode props and ref matching', () => {
    const env = new TestEnvironment();
    env.setup();
    const helper = new ComponentTestHelper(env);
    const currentRangeSubject = Subject.create<number>(100);
    const viewModeSubject = Subject.create<'120' | '360'>('360');

    const { component, element, vnode } = helper.renderComponent(RangeRings, {
      currentRange: currentRangeSubject,
      viewMode: viewModeSubject
    });

    // Collect all refs and their VNodes - check the actual VNode structure
    const refsInfo: any[] = [];
    const allVNodes: any[] = [];
    const collectRefs = (vnode: any, path: string = ''): void => {
      if (!vnode) return;
      
      // Collect ALL VNodes to see structure
      if (vnode.type === 'circle' || vnode.type === 'text' || vnode.type === 'g') {
        allVNodes.push({
          path,
          type: vnode.type,
          props: vnode.props ? Object.keys(vnode.props) : [],
          allProps: vnode.props
        });
      }
      
      if (vnode.props?.ref && typeof vnode.props.ref === 'object' && 'instance' in vnode.props.ref) {
        refsInfo.push({
          path,
          type: vnode.type,
          props: Object.keys(vnode.props),
          propsWithData: Object.keys(vnode.props).filter(k => k.includes('data') || k.includes('range')),
          refInstance: vnode.props.ref.instance ? 'SET' : 'NULL',
          allProps: vnode.props
        });
      }
      if (vnode.children) {
        const children = Array.isArray(vnode.children) ? vnode.children : [vnode.children];
        children.forEach((child: any, i: number) => {
          if (child && typeof child === 'object') {
            collectRefs(child, `${path}/${vnode.type || 'root'}[${i}]`);
          }
        });
      }
    };
    collectRefs(vnode);

    // Check DOM
    const circles = helper.querySelectorAll('circle');
    const circleInfo = Array.from(circles).map(circle => ({
      dataRange: circle.getAttribute('data-range'),
      r: circle.getAttribute('r'),
      class: circle.className
    }));

    // Check component refs
    const ranges = [25, 50, 100, 200];
    const componentRefs = ranges.map(range => {
      const ringRef = (component as any).ringRefs.get(range);
      return {
        range,
        circle: ringRef?.circle?.instance ? 'SET' : 'NULL',
        text: ringRef?.text?.instance ? 'SET' : 'NULL',
        group: ringRef?.group?.instance ? 'SET' : 'NULL'
      };
    });

    // Output debug info
    console.log('=== ALL VNODES (circle, text, g) ===');
    console.log(JSON.stringify(allVNodes, null, 2));
    console.log('\n=== REFS INFO ===');
    console.log(JSON.stringify(refsInfo, null, 2));
    console.log('\n=== DOM CIRCLES ===');
    console.log(JSON.stringify(circleInfo, null, 2));
    console.log('\n=== COMPONENT REFS ===');
    console.log(JSON.stringify(componentRefs, null, 2));

    // Force output by failing with debug info
    const debugOutput = {
      refsInfo,
      circleInfo,
      componentRefs
    };

    // Don't fail - just log
    expect(true).toBe(true);
    
    helper.cleanup();
    env.teardown();
  });
});

