# Test Framework Issue: SVG Ref Reconciliation for Nested Elements

## Issue Summary

**Status**: Critical Bug  
**Affects**: Components with multiple refs on nested elements sharing the same class  
**Impact**: Refs are not properly populated, causing `ref.instance` to be `null` in `onAfterRender()`  
**Discovered In**: `RangeRings.test.ts` - 16 test failures

---

## Problem Description

The test framework's ref reconciliation system fails to populate `.instance` properties for refs when:
1. Multiple sibling elements have the same CSS class
2. Elements lack unique `id` attributes
3. Elements have unique `data-*` attributes (but framework doesn't use them for matching)
4. Both parent and child elements have refs (nested ref structure)

This causes components that rely on refs for direct DOM manipulation (MSFS SDK pattern) to silently fail in tests because `ref.instance === null`.

---

## Failing Component Example: RangeRings

### Component Code Structure

```typescript
export class RangeRings extends DisplayComponent<RangeRingsProps> {
  private readonly ranges = [25, 50, 100, 200];
  private readonly ringRefs: Map<number, { 
    circle: any; 
    text: any; 
    group: any 
  }> = new Map();

  render(): VNode {
    return (
      <g id="range-rings">
        {this.ranges.map((range) => {
          // Create 3 refs per iteration
          const ringRef = {
            group: FSComponent.createRef(),
            circle: FSComponent.createRef(),
            text: FSComponent.createRef()
          };
          this.ringRefs.set(range, ringRef);
          
          return (
            <g key={`ring-${range}`} ref={ringRef.group}>
              <circle
                ref={ringRef.circle}
                class="range-ring"           // ❌ NOT UNIQUE (all 4 circles have this)
                data-range={range}           // ✅ UNIQUE (25, 50, 100, 200)
                r={0}
                ... />
              <text
                ref={ringRef.text}
                class="range-label"          // ❌ NOT UNIQUE (all 4 text elements have this)
                data-range={range}           // ✅ UNIQUE (25, 50, 100, 200)
                ... />
            </g>
          );
        })}
      </g>
    );
  }

  onAfterRender(node: VNode): void {
    // Subscribe to observable with immediate execution (true)
    this.props.currentRange.sub((currentRange) => {
      this.updateRings(currentRange);
    }, true);
  }

  private updateRings(currentRange: number): void {
    this.ranges.forEach((range) => {
      const ringRef = this.ringRefs.get(range);
      
      const circleEl = ringRef.circle.instance;  // ❌ NULL
      const textEl = ringRef.text.instance;      // ❌ NULL  
      const groupEl = ringRef.group.instance;    // ❌ NULL
      
      if (!circleEl || !textEl || !groupEl) {
        return; // ❌ EARLY RETURN - DOM never updated!
      }
      
      // Direct DOM manipulation (MSFS pattern)
      circleEl.setAttribute('r', calculatedRadius);
      circleEl.setAttribute('stroke', isActive ? '#00FF00' : '#006600');
      groupEl.style.display = shouldShow ? '' : 'none';
      // ... etc
    });
  }
}
```

### Generated DOM Structure

```html
<g id="range-rings">
  <!-- Ring 1 -->
  <g>
    <circle class="range-ring" data-range="25" r="0" />
    <text class="range-label" data-range="25">25</text>
  </g>
  
  <!-- Ring 2 -->
  <g>
    <circle class="range-ring" data-range="50" r="0" />
    <text class="range-label" data-range="50">50</text>
  </g>
  
  <!-- Ring 3 -->
  <g>
    <circle class="range-ring" data-range="100" r="0" />
    <text class="range-label" data-range="100">100</text>
  </g>
  
  <!-- Ring 4 -->
  <g>
    <circle class="range-ring" data-range="200" r="0" />
    <text class="range-label" data-range="200">200</text>
  </g>
</g>
```

### Expected Ref Mapping

After `renderComponent()` completes, before `onAfterRender()` is called:

```typescript
ringRefs.get(25).group.instance  → <g> element (first group)
ringRefs.get(25).circle.instance → <circle data-range="25"> element
ringRefs.get(25).text.instance   → <text data-range="25"> element

ringRefs.get(50).group.instance  → <g> element (second group)
ringRefs.get(50).circle.instance → <circle data-range="50"> element
ringRefs.get(50).text.instance   → <text data-range="50"> element

ringRefs.get(100).group.instance → <g> element (third group)
ringRefs.get(100).circle.instance → <circle data-range="100"> element
ringRefs.get(100).text.instance  → <text data-range="100"> element

ringRefs.get(200).group.instance → <g> element (fourth group)
ringRefs.get(200).circle.instance → <circle data-range="200"> element
ringRefs.get(200).text.instance  → <text data-range="200"> element
```

### Actual Behavior

**All or most refs have `.instance === null`**, causing:
- `updateRings()` returns early without updating DOM
- Circles keep `r="0"` (initial value from render)
- Circles keep inactive stroke color `#006600` (initial value)
- All groups remain visible (`display: ""` not changed to `"none"`)
- Tests fail because DOM state doesn't match expectations

---

## Root Cause Analysis

### Current Ref Reconciliation Flow

**File**: `msfs-unit-test-framework/src/test-utils/ComponentTestHelper.ts`

#### Phase 1: Direct DOM Queries (Lines 252-336)

```typescript
refsMap.forEach((vnode, ref) => {
  // Strategy 1: Match by ID (lines 286-295)
  if (vnode.props?.id) {
    const found = this.container.querySelector(`#${vnode.props.id}`);
    if (found) {
      ref.instance = found;
      return;
    }
  }
  
  // Strategy 2: Match by class (lines 297-332)
  if (vnode.props?.class) {
    const selector = `${vnode.type}.${primaryClass}`;
    const found = this.container.querySelector(selector); // ❌ PROBLEM HERE
    if (found) {
      ref.instance = found;
      return;
    }
  }
});
```

**Problem**: `querySelector()` returns only the **FIRST** matching element:

```typescript
// This matches ONLY the first circle
const found = this.container.querySelector('circle.range-ring');
// Returns: <circle data-range="25">
// Missing: <circle data-range="50">, <circle data-range="100">, <circle data-range="200">
```

#### Phase 2: Recursive VNode-to-DOM Matching (Lines 338-339, Function at Line 31+)

```typescript
reconcileRefs(vnode, element, this.container);
```

Uses position-based matching:
```typescript
// Line 118-124
if (candidate.tagName.toLowerCase() === childVNode.type.toLowerCase()) {
  matchedDom = candidate;
}
```

**Problem**: When multiple siblings have the same tag name and the same class:
- Position matching is ambiguous
- May match the wrong element
- May skip elements entirely
- No verification of uniqueness

---

## Why Current Strategies Fail

### Strategy 1: ID Matching ❌
- Inner `<g>` groups have NO `id` attribute
- Circles and text elements have NO `id` attribute
- **Result**: Skipped for all RangeRings elements

### Strategy 2: Class Matching ❌
- `querySelector('.range-ring')` returns ONLY the first circle (range=25)
- Remaining 3 circles (range=50,100,200) are ignored
- **Result**: Only 1 out of 4 circles gets its ref populated

### Strategy 3: Position Matching ❌
- All 4 groups have the same structure (`<g>` → `<circle>` + `<text>`)
- Position index alone can't distinguish between them
- **Result**: Ambiguous matches or mismatches

### Missing Strategy: `data-*` Attribute Matching ⚠️
- All elements have UNIQUE `data-range` attributes
- Framework doesn't check `data-*` attributes at all
- **Result**: Uniqueness information is ignored

---

## Proposed Solutions

### Solution 1: Add `data-*` Attribute Matching (HIGH PRIORITY)

Add a new matching strategy between ID and class matching:

**Location**: Insert after line 295 in `ComponentTestHelper.ts`

```typescript
// Strategy 1.5: Match by data-* attributes (UNIQUE identifiers)
if (!ref.instance && vnode.props) {
  // Collect all data-* attributes from props
  const dataAttrs = Object.keys(vnode.props)
    .filter(key => key.startsWith('data-'))
    .map(key => ({ attr: key, value: vnode.props[key] }));
  
  if (dataAttrs.length > 0 && rootContainer) {
    // Build selector: circle[data-range="25"]
    let selector = vnode.type || '*';
    
    dataAttrs.forEach(({ attr, value }) => {
      // Convert camelCase to kebab-case (dataRange → data-range)
      const kebabAttr = attr.replace(/([A-Z])/g, '-$1').toLowerCase();
      selector += `[${kebabAttr}="${value}"]`;
    });
    
    const foundByData = rootContainer.querySelector(selector);
    
    if (foundByData) {
      // Verify tag name matches
      if (!vnode.type || foundByData.tagName.toLowerCase() === vnode.type.toLowerCase()) {
        ref.instance = foundByData;
        return; // Success - move to next ref
      }
    }
  }
}
```

**Benefits**:
- Uses existing unique attributes
- No changes needed to component code
- Highly reliable (data attributes are meant for this purpose)
- Fixes RangeRings immediately

**Example Usage**:
```typescript
<circle class="range-ring" data-range="50" />
// Selector built: "circle[data-range='50']"
// Result: Unique match! ✓
```

---

### Solution 2: Prevent Duplicate Ref Assignments (MEDIUM PRIORITY)

Improve class matching to avoid assigning the same DOM element to multiple refs.

**Location**: Replace lines 319-330 in `ComponentTestHelper.ts`

```typescript
// OLD CODE (assigns same element to multiple refs)
const found = this.container.querySelector(selector);
if (found) {
  ref.instance = found; // ❌ No check if already assigned
}
```

```typescript
// NEW CODE (prevents duplicates)
const allMatches = Array.from(this.container.querySelectorAll(selector));

// Find first match that hasn't been assigned to another ref
const found = allMatches.find(el => {
  // Check if this element is already assigned
  const isAlreadyAssigned = Array.from(refsMap.keys()).some(otherRef => 
    otherRef !== ref && otherRef.instance === el
  );
  return !isAlreadyAssigned;
});

if (found) {
  ref.instance = found;
  return;
}
```

**Benefits**:
- Prevents one element from being assigned to multiple refs
- Ensures each ref gets a unique element
- More robust for components with many similar elements

---

### Solution 3: Enhanced Recursive Matching with Tracking (LOW PRIORITY)

Add a `WeakSet` to track which DOM nodes have already been matched.

**Location**: Modify `reconcileRefs` function (starts at line 31)

```typescript
function reconcileRefs(
  vnode: any, 
  domNode: Node | null, 
  rootContainer?: Element,
  matchedDomNodes: WeakSet<Node> = new WeakSet() // NEW: Track matched nodes
): void {
  if (!vnode || !domNode) return;
  
  if (!rootContainer && domNode instanceof Element) {
    rootContainer = domNode;
  }

  // Set ref only if not already matched to another ref
  if (vnode.props?.ref && typeof vnode.props.ref === 'object' && 'instance' in vnode.props.ref) {
    if (!vnode.props.ref.instance || !rootContainer || !rootContainer.contains(vnode.props.ref.instance)) {
      // NEW: Check if this DOM node is already matched
      if (!matchedDomNodes.has(domNode)) {
        vnode.props.ref.instance = domNode;
        matchedDomNodes.add(domNode); // Mark as matched
      }
    }
  }

  // ... existing code ...
  
  // Recurse through children - pass matchedDomNodes
  if (vnode.children && domNode instanceof Element) {
    // ... existing recursion code ...
    reconcileRefs(childVNode, matchedDom, rootContainer, matchedDomNodes);
  }
}
```

**Benefits**:
- Prevents assigning the same DOM node to multiple refs
- Works across both Phase 1 and Phase 2
- More foolproof for complex nested structures

---

## Recommended Implementation Order

### Phase 1 (Immediate Fix)
**Implement Solution 1**: Add `data-*` attribute matching
- **Impact**: Fixes RangeRings and similar components
- **Effort**: ~30 lines of code
- **Risk**: Low (additive, doesn't change existing behavior)

### Phase 2 (Robustness)
**Implement Solution 2**: Prevent duplicate assignments in class matching
- **Impact**: Prevents future bugs with similar patterns
- **Effort**: ~15 lines of code
- **Risk**: Low (improves existing strategy)

### Phase 3 (Future-Proofing)
**Implement Solution 3**: Add tracking to recursive matching
- **Impact**: Catches edge cases in complex nesting
- **Effort**: ~20 lines of code
- **Risk**: Low (internal implementation detail)

---

## Test Cases to Verify Fix

Add these tests to `ComponentTestHelper.test.ts`:

```typescript
describe('Ref Reconciliation', () => {
  test('should populate refs for multiple elements with same class but different data attributes', () => {
    class TestComponent extends DisplayComponent<any> {
      private refs = [
        FSComponent.createRef<HTMLDivElement>(),
        FSComponent.createRef<HTMLDivElement>(),
        FSComponent.createRef<HTMLDivElement>()
      ];
      
      render(): VNode {
        return (
          <div>
            <div ref={this.refs[0]} class="item" data-id="1">Item 1</div>
            <div ref={this.refs[1]} class="item" data-id="2">Item 2</div>
            <div ref={this.refs[2]} class="item" data-id="3">Item 3</div>
          </div>
        );
      }
    }
    
    const { component } = helper.renderComponent(TestComponent, {});
    
    // All refs should be populated
    expect((component as any).refs[0].instance).toBeTruthy();
    expect((component as any).refs[1].instance).toBeTruthy();
    expect((component as any).refs[2].instance).toBeTruthy();
    
    // Each ref should point to correct element
    expect((component as any).refs[0].instance.getAttribute('data-id')).toBe('1');
    expect((component as any).refs[1].instance.getAttribute('data-id')).toBe('2');
    expect((component as any).refs[2].instance.getAttribute('data-id')).toBe('3');
    
    // Refs should point to different elements
    expect((component as any).refs[0].instance).not.toBe((component as any).refs[1].instance);
    expect((component as any).refs[1].instance).not.toBe((component as any).refs[2].instance);
  });
  
  test('should populate refs for nested SVG elements', () => {
    class TestSVGComponent extends DisplayComponent<any> {
      private circleRefs = [
        FSComponent.createRef<SVGCircleElement>(),
        FSComponent.createRef<SVGCircleElement>()
      ];
      
      render(): VNode {
        return (
          <svg>
            <circle ref={this.circleRefs[0]} class="ring" data-index="0" />
            <circle ref={this.circleRefs[1]} class="ring" data-index="1" />
          </svg>
        );
      }
    }
    
    const { component } = helper.renderComponent(TestSVGComponent, {});
    
    expect((component as any).circleRefs[0].instance).toBeTruthy();
    expect((component as any).circleRefs[1].instance).toBeTruthy();
    expect((component as any).circleRefs[0].instance.getAttribute('data-index')).toBe('0');
    expect((component as any).circleRefs[1].instance.getAttribute('data-index')).toBe('1');
  });
});
```

---

## Impact Assessment

### Current Impact
- **16 test failures** in `RangeRings.test.ts`
- **All tests using multi-element patterns** with same class are at risk
- **Silent failures** - tests don't catch the bug, real issues appear in browser

### Post-Fix Impact
- ✅ All RangeRings tests should pass (16 tests fixed)
- ✅ More reliable ref reconciliation for all components
- ✅ Better test coverage for real-world component patterns
- ✅ Framework aligns with common MSFS SDK patterns (direct DOM manipulation via refs)

---

## Additional Notes

### Why This Pattern is Common in MSFS SDK

The MSFS Avionics Framework follows a **"render once, update via observables"** pattern, NOT React-style re-rendering:

1. Component renders ONCE with initial values
2. DOM elements are manipulated directly via refs
3. Observable subscriptions update DOM on data changes

This is the **recommended pattern** per MSFS SDK documentation, so the test framework must support it properly.

### Example from Working Components

```typescript
// From HeadingIndicator (WORKS - single ref)
private readonly needleRef = FSComponent.createRef<SVGLineElement>();

render(): VNode {
  return <line ref={this.needleRef} ... />;
}

onAfterRender(): void {
  this.props.heading.sub(heading => {
    this.needleRef.instance.setAttribute('transform', `rotate(${heading})`);
  });
}
```

**Works because**: Single element, unique match

```typescript
// From RangeRings (FAILS - multiple refs with same class)
private readonly ringRefs = new Map();

render(): VNode {
  return this.ranges.map(range => {
    const ref = FSComponent.createRef();
    return <circle ref={ref} class="range-ring" data-range={range} />;
  });
}
```

**Fails because**: Multiple elements, class not unique, data attributes ignored

---

## Questions?

Contact the ProjectStorm maintainer or reference this issue in the test framework repository.

**Related Files**:
- `msfs-unit-test-framework/src/test-utils/ComponentTestHelper.ts` (lines 252-339)
- `msfs-unit-test-framework/tests/RangeRings.test.ts` (16 failures)
- `html_ui/stormscope/components/RangeRings.tsx` (affected component)





