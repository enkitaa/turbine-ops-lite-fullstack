import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables
Object.defineProperty(window, 'import.meta', {
  value: {
    env: {
      VITE_API_BASE: 'http://localhost:4000',
    },
  },
});

// Mock EventSource for SSE
class MockEventSource {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

Object.defineProperty(window, 'EventSource', {
  value: MockEventSource,
  writable: true,
});

