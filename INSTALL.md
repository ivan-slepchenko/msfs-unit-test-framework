# Инструкция по установке

## Шаг 1: Установка зависимостей

Сначала установите зависимости для основного проекта (если еще не установлены):

```bash
cd D:\ProjectStorm
npm install
```

Затем установите зависимости для unit test framework:

```bash
cd msfs-unit-test-framework
npm install
```

## Шаг 2: Сборка

Соберите unit test framework:

```bash
npm run build
```

## Шаг 3: Запуск тестов

```bash
npm test
```

## Важные замечания

1. **Не компилируйте тесты вместе с основным проектом** - тесты исключены из основного `tsconfig.json`
2. **Тесты используют отдельный tsconfig** - `tsconfig.tests.json` для тестов
3. **Зависимости должны быть в корневом node_modules** - framework использует `../node_modules` для доступа к SDK

## Структура зависимостей

```
ProjectStorm/
├── node_modules/          # Общие зависимости (SDK, types)
│   ├── @microsoft/msfs-sdk/
│   └── @microsoft/msfs-types/
└── msfs-unit-test-framework/
    ├── node_modules/       # Специфичные для тестов (jest, jsdom)
    └── package.json
```

## Решение проблем

### Ошибка: Cannot find module '@microsoft/msfs-sdk'

Убедитесь, что зависимости установлены в корневом проекте:
```bash
cd D:\ProjectStorm
npm install
```

### Ошибка: Cannot find module 'jsdom'

Установите зависимости в папке framework:
```bash
cd msfs-unit-test-framework
npm install
```

### Ошибки компиляции TypeScript

Убедитесь, что:
1. `msfs-unit-test-framework` исключен из основного `tsconfig.json`
2. Используется правильный `tsconfig.json` для компиляции




