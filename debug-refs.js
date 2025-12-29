// Quick debug script to check how data attributes are stored in VNode props
const { TestEnvironment, ComponentTestHelper } = require('./dist/src/index');
const { Subject } = require('@microsoft/msfs-sdk');

// Mock FSComponent
global.FSComponent = {
  createRef: () => ({ instance: null }),
  render: (vnode, container) => {
    // Simple mock render - just log the VNode structure
    console.log('=== VNode Structure ===');
    console.log(JSON.stringify(vnode, (key, value) => {
      if (key === 'ref' && typeof value === 'object') {
        return '[Ref]';
      }
      return value;
    }, 2));
    
    // Check props
    if (vnode.props) {
      console.log('\n=== Props Keys ===');
      console.log(Object.keys(vnode.props));
      console.log('\n=== Data Attributes ===');
      Object.keys(vnode.props).forEach(key => {
        if (key.includes('data') || key.includes('range')) {
          console.log(`${key}: ${vnode.props[key]}`);
        }
      });
    }
  })
};

const env = new TestEnvironment();
env.setup();
const helper = new ComponentTestHelper(env);

// Import RangeRings component
const { RangeRings } = require('../html_ui/stormscope/components/RangeRings');

const currentRangeSubject = Subject.create(100);
const viewModeSubject = Subject.create('360');

console.log('Rendering RangeRings component...\n');
const { component, element, vnode } = helper.renderComponent(RangeRings, {
  currentRange: currentRangeSubject,
  viewMode: viewModeSubject
});

console.log('\n=== Component Ring Refs ===');
const ranges = [25, 50, 100, 200];
ranges.forEach(range => {
  const ringRef = component.ringRefs.get(range);
  if (ringRef) {
    console.log(`Range ${range}:`, {
      circle: ringRef.circle.instance ? 'SET' : 'NULL',
      text: ringRef.text.instance ? 'SET' : 'NULL',
      group: ringRef.group.instance ? 'SET' : 'NULL'
    });
  }
});

console.log('\n=== DOM Elements ===');
const circles = helper.querySelectorAll('circle');
console.log(`Found ${circles.length} circles`);
circles.forEach((circle, i) => {
  console.log(`Circle ${i}:`, {
    dataRange: circle.getAttribute('data-range'),
    r: circle.getAttribute('r'),
    class: circle.className
  });
});

env.teardown();



