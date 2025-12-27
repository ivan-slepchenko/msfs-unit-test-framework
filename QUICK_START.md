# Quick Start Guide

## Быстрый старт

### 1. Установка зависимостей

```bash
cd msfs-unit-test-framework
npm install
```

### 2. Сборка

```bash
npm run build
```

### 3. Запуск тестов

```bash
npm test
```

## Основные концепции

### TestEnvironment

`TestEnvironment` настраивает тестовое окружение:
- Создает jsdom для DOM API
- Настраивает моки SimVar и Coherent
- Предоставляет утилиты для работы с SimVar

### ComponentTestHelper

`ComponentTestHelper` помогает тестировать компоненты:
- Рендерит компоненты в DOM через `FSComponent.render()`
- Предоставляет утилиты для запросов DOM
- Управляет жизненным циклом компонентов

## Пример использования

```typescript
import { TestEnvironment, ComponentTestHelper } from './msfs-unit-test-framework';
import { MyComponent } from '../html_ui/MyComponent';

describe('MyComponent Tests', () => {
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

  test('renders component', () => {
    const { element } = helper.renderComponent(MyComponent, {
      value: 42
    });

    expect(element).toBeTruthy();
    expect(helper.getTextContent('.value')).toBe('42');
  });
});
```

## Важные моменты

1. **Всегда вызывайте `setup()` перед тестами** и `teardown()` после
2. **Используйте `helper.cleanup()`** для очистки DOM между тестами
3. **Для асинхронных обновлений** используйте `await helper.waitForUpdate(ms)`
4. **SimVar моки** автоматически инициализируются с дефолтными значениями

## Следующие шаги

- Смотрите `tests/example.test.ts` для полных примеров
- Читайте `README.md` для подробной документации
- Изучите API в `src/index.ts`


