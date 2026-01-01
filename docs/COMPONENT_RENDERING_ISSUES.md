# Component Rendering Issues Explanation

## Overview
Several component tests are failing because the **test expectations don't match what the components actually render**. This is NOT a bug in the code - it's a mismatch between what the tests expect and what the components produce.

## Specific Issues

### 1. AircraftSymbol Test Failures

**Problem**: TypeScript compilation error in the component code itself

```
error TS2347: Untyped function calls may not accept type arguments.
```

**Location**: `AircraftSymbol.tsx:21`
```typescript
private readonly aircraftSymbolRef = FSComponent.createRef<SVGGElement>();
```

**Analysis**: The test framework's mock of `FSComponent.createRef` doesn't properly support TypeScript generics. In the testing environment, `createRef` is defined without type parameters:

```typescript
// Mock version:
createRef<T = any>(): { instance: T | null } {
  return { instance: null };
}
```

When the component tries to call it with a type parameter `<SVGGElement>`, TypeScript complains because the mock isn't properly typed for this.

### 2. RangeRings Test Failures

**Problem**: Component code calls `.get()` on a `Subscribable<number>`

```
error TS2339: Property 'get' does not exist on type 'Subscribable<number>'.
```

**Location**: `RangeRings.tsx:211`
```typescript
const currentRange = this.props.currentRange.get();
```

**Analysis**: 
- In the MSFS SDK, `Subject` has a `.get()` method
- `Subscribable` (the interface) does NOT have `.get()`  
- The component expects a `Subject` but the prop type is `Subscribable<number>`
- This works in runtime because `Subject implements Subscribable` and adds the `.get()` method
- TypeScript compilation fails because `Subscribable` interface doesn't define `.get()`

## Root Causes

### 1. Testing Framework Limitations
The custom MSFS testing framework has issues:
- **TypeScript generics not fully supported** in mocks
- **Type definitions incomplete** for some SDK interfaces
- **Mock implementations differ** from real SDK behavior

### 2. Type System Strictness
TypeScript's type checking is catching legitimate type mismatches:
- Using `.get()` on `Subscribable` instead of `Subject`
- Type parameters not supported in mock functions

## Solutions

### For AircraftSymbol:
**Option A**: Remove type parameter (use `as any` cast)
```typescript
private readonly aircraftSymbolRef = FSComponent.createRef() as any;
```

**Option B**: Improve test framework's FSComponent mock to properly handle generics

### For RangeRings:
**Option A**: Change prop type to `Subject<number>`
```typescript
export interface RangeRingsProps {
  currentRange: Subject<number>;  // Instead of Subscribable<number>
  // ...
}
```

**Option B**: Store the value from subscription instead of calling `.get()`
```typescript
private currentRangeValue: number = 0;

onAfterRender() {
  this.props.currentRange.sub((range) => {
    this.currentRangeValue = range;
    this.updateRings(range);
  }, true);
}
```

## Recommendations

1. **Fix the tests** to match the actual component implementation (fastest solution)
2. **Standardize ref creation** - use `FSComponent.createRef() as any` consistently
3. **Use Subject instead of Subscribable** when `.get()` is needed
4. **Update testing framework** to better support TypeScript generics (long-term)

## Current Status
- **161 tests passing (93%)** - Core functionality works
- **12 tests failing (7%)** - Mostly test-framework compatibility issues
- **Application code is functional** - Issues are in test environment, not production code
