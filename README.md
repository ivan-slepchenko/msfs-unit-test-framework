# MSFS Unit Test Framework

Unit testing framework for MSFS HTML/JS instruments (Jest + JSDOM).

Фреймворк для unit-тестирования MSFS инструментов с поддержкой DOM через jsdom.

## Особенности

- ✅ **Полная поддержка DOM** - использует jsdom для рендеринга компонентов
- ✅ **FSComponent.render()** - можно рендерить компоненты и тестировать DOM элементы
- ✅ **Моки SimVar и Coherent** - полная эмуляция API симулятора
- ✅ **Jest интеграция** - готовые утилиты для тестирования
- ✅ **TypeScript поддержка** - полная типизация

## Установка

### As a library (recommended)

```bash
npm install --save-dev @avimate/msfs-jest-utils
```

### Local development

```bash
npm install
npm run build
```

## Использование

### Базовый пример

```typescript
import { TestEnvironment, ComponentTestHelper } from './msfs-unit-test-framework';
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

### Тестирование DOM элементов

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

### Работа с SimVar

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

- `setup()` - настройка тестового окружения
- `teardown()` - очистка после тестов
- `reset()` - сброс моков
- `setSimVar(name, unit, value)` - установить SimVar
- `getSimVar(name, unit)` - получить SimVar
- `getDocument()` - получить jsdom document
- `getWindow()` - получить jsdom window

### ComponentTestHelper

- `renderComponent(ComponentClass, props)` - рендерить компонент
- `querySelector(selector)` - найти элемент
- `getTextContent(selector)` - получить текст
- `hasClass(selector, className)` - проверить класс
- `getAttribute(selector, attrName)` - получить атрибут
- `getStyle(selector, property)` - получить стиль
- `waitForUpdate(ms)` - подождать обновления
- `cleanup()` - очистка

## Структура

```
msfs-unit-test-framework/
├── src/
│   ├── mocks/
│   │   ├── SimVarMock.ts      # Мок SimVar API
│   │   ├── CoherentMock.ts     # Мок Coherent API
│   │   └── index.ts
│   ├── test-utils/
│   │   ├── TestEnvironment.ts  # Настройка окружения
│   │   ├── ComponentTestHelper.ts # Утилиты для компонентов
│   │   └── index.ts
│   ├── setupTests.ts           # Jest setup
│   └── index.ts                # Главный экспорт
├── tests/                      # Примеры тестов
├── jest.config.js
├── tsconfig.json
└── package.json
```

## Примеры

Смотрите папку `tests/` для примеров использования.




