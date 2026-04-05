import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}

    unobserve() {}

    disconnect() {}
  }

  class PointerEventMock extends MouseEvent {}

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock
  });

  Object.defineProperty(window, 'PointerEvent', {
    writable: true,
    value: PointerEventMock
  });

  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    writable: true,
    value: vi.fn()
  });

  Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
    writable: true,
    value: vi.fn(() => false)
  });

  Object.defineProperty(window.HTMLElement.prototype, 'releasePointerCapture', {
    writable: true,
    value: vi.fn()
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});
