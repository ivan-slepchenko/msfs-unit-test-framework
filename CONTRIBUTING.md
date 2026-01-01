## Contributing

Thanks for considering contributing!

### Development setup

```bash
npm install
npm run build
npm test
```

### Guidelines

- **Keep mocks minimal**: we aim to support tests, not fully re-implement the MSFS/Garmin SDK.
- **Prefer compatibility**: avoid breaking changes unless absolutely necessary.
- **Add tests** for new behavior in the framework itself (not project-specific tests).
- **No simulator required**: everything should run in CI via Jest + JSDOM.

### Pull requests

- Include a clear description of the problem and the solution.
- Add/adjust tests.
- Ensure `npm test` passes.

