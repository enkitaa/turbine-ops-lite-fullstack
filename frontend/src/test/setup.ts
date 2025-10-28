import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables
try {
  if (!(window as any).import?.meta?.env) {
    (window as any).import = {
      meta: {
        env: {
          VITE_API_BASE: 'http://localhost:4000',
        },
      },
    };
  } else {
    (window as any).import.meta.env.VITE_API_BASE = 'http://localhost:4000';
  }
} catch {
  // Already defined or different structure
}

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

// Mock MUI icons to prevent file system overflow
vi.mock('@mui/icons-material', async () => {
  const React = await import('react');
  const createIcon = (name: string) => {
    const Icon = React.forwardRef((props: any, ref: any) => React.createElement('svg', { ...props, ref, 'data-testid': name + 'Icon' }));
    Icon.displayName = name;
    return Icon;
  };
  
  return {
    Add: createIcon('Add'),
    Edit: createIcon('Edit'),
    Delete: createIcon('Delete'),
    WindPower: createIcon('WindPower'),
    LocationOn: createIcon('LocationOn'),
    Description: createIcon('Description'),
    Assessment: createIcon('Assessment'),
    Flight: createIcon('Flight'),
    Person: createIcon('Person'),
    CalendarToday: createIcon('CalendarToday'),
    Search: createIcon('Search'),
    Dashboard: createIcon('Dashboard'),
    Logout: createIcon('Logout'),
    Settings: createIcon('Settings'),
  };
});

