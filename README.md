# MSFS Unit Test Framework

Unit testing framework for MSFS HTML/JS instruments (Jest + JSDOM).

## Features

- ✅ **Full DOM support** - uses jsdom for component rendering
- ✅ **FSComponent.render()** - render components and test DOM elements
- ✅ **SimVar and Coherent mocks** - complete simulator API emulation
- ✅ **Jest integration** - ready-to-use testing utilities
- ✅ **TypeScript support** - full type safety

## Installation

### As a library (recommended)

```bash
npm install --save-dev @avimate/msfs-jest-utils
```

### Local development

```bash
npm install
npm run build
```

## Usage

### Basic Example

```typescript
import { TestEnvironment, ComponentTestHelper } from '@avimate/msfs-jest-utils';
import { MyComponent } from '../html_ui/MyComponent';

describe('MyComponent', () => {
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

  test('should render component', () => {
    const { element } = helper.renderComponent(MyComponent, {
      value: 42
    });

    expect(element).toBeTruthy();
    expect(element.textContent).toContain('42');
  });

  test('should update when SimVar changes', () => {
    env.setSimVar('L:MY_VALUE', 'number', 10);
    
    const { element } = helper.renderComponent(MyComponent, {
      valueSource: env.getSubject('L:MY_VALUE', 'number')
    });

    expect(helper.getTextContent('.value')).toBe('10');
    
    env.setSimVar('L:MY_VALUE', 'number', 20);
    // Wait for subscription update
    await helper.waitForUpdate(50);
    
    expect(helper.getTextContent('.value')).toBe('20');
  });
});
```

### Testing DOM Elements

```typescript
test('should have correct CSS classes', () => {
  const { element } = helper.renderComponent(MyComponent, {});
  
  expect(helper.hasClass('.my-component', 'active')).toBe(true);
  expect(helper.getAttribute('.my-component', 'data-state')).toBe('ready');
});

test('should apply styles correctly', () => {
  const { element } = helper.renderComponent(MyComponent, {
    width: 100,
    height: 200
  });
  
  expect(helper.getStyle('.my-component', 'width')).toBe('100px');
});
```

### Working with SimVar

```typescript
test('should read SimVar values', () => {
  env.setSimVar('L:TEST_VALUE', 'number', 42);
  
  const value = env.getSimVar('L:TEST_VALUE', 'number');
  expect(value).toBe(42);
});

test('should track SimVar access', () => {
  env.setSimVar('L:TEST', 'number', 10);
  SimVar.GetSimVarValue('L:TEST', 'number');
  
  const log = env.getSimVarAccessLog();
  expect(log).toHaveLength(1);
  expect(log[0].operation).toBe('get');
});
```

## API

### TestEnvironment

- `setup()` - initialize test environment
- `teardown()` - cleanup after tests
- `reset()` - reset mocks
- `setSimVar(name, unit, value)` - set SimVar value
- `getSimVar(name, unit)` - get SimVar value
- `getDocument()` - get jsdom document
- `getWindow()` - get jsdom window

### ComponentTestHelper

- `renderComponent(ComponentClass, props)` - render component
- `querySelector(selector)` - find element
- `getTextContent(selector)` - get text content
- `hasClass(selector, className)` - check class
- `getAttribute(selector, attrName)` - get attribute
- `getStyle(selector, property)` - get style
- `waitForUpdate(ms)` - wait for update
- `cleanup()` - cleanup

## Structure

```
msfs-unit-test-framework/
├── src/
│   ├── mocks/
│   │   ├── SimVarMock.ts      # SimVar API mock
│   │   ├── CoherentMock.ts     # Coherent API mock
│   │   └── index.ts
│   ├── test-utils/
│   │   ├── TestEnvironment.ts  # Environment setup
│   │   ├── ComponentTestHelper.ts # Component utilities
│   │   └── index.ts
│   ├── setupTests.ts           # Jest setup
│   └── index.ts                # Main export
├── tests/                      # Test examples
├── jest.config.js
├── tsconfig.json
└── package.json
```

## Examples

See the `tests/` folder for usage examples.




