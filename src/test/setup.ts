import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetDb } from './handlers';
import { server } from './server';

// jsdom lacks these browser APIs; Mantine calls them.
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: () => {} });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => resetDb());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
