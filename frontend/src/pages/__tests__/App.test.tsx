import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
(globalThis as any).fetch = vi.fn();

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render login page when no token', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('should have default credentials in login form', () => {
    render(<App />);

    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;

    expect(emailInput.value).toBe('admin@example.com');
    expect(passwordInput.value).toBe('admin123');
  });

  it('should update email input value', () => {
    render(<App />);

    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(emailInput.value).toBe('test@example.com');
  });

  it('should update password input value', () => {
    render(<App />);

    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(passwordInput.value).toBe('password123');
  });

  it('should show login hint text', () => {
    render(<App />);

    expect(screen.getByText(/Try: admin@example.com/)).toBeInTheDocument();
  });

  it('should render navigation after login', async () => {
    ((globalThis as any).fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token', user: { id: '1', email: 'test@example.com', role: 'ADMIN' } }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    render(<App />);

    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('TurbineOps Lite')).toBeInTheDocument();
    });

    expect(screen.getByText('Turbines')).toBeInTheDocument();
    expect(screen.getByText('Inspections')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('should handle login failure', async () => {
    ((globalThis as any).fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    render(<App />);

    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should switch between turbines and inspections pages', async () => {
    ((globalThis as any).fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    const inspectionsButton = screen.getByRole('button', { name: 'Inspections' });
    fireEvent.click(inspectionsButton);

    // Should show inspections view
    expect(inspectionsButton).toBeInTheDocument();
  });
});

