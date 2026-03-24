import { describe, it, expect, vi } from 'vitest';

// vi.mock factories are hoisted, so define the mock instance inside the factory
// and re-export it via a named export so tests can access it.
vi.mock('axios', () => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => instance),
      post: vi.fn(),
    },
    __mockInstance: instance,
  };
});

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

// Import client module — this triggers axios.create and interceptor setup
import '../api/client';
import axios, { __mockInstance } from 'axios';

describe('API client', () => {
  it('creates axios instance with correct baseURL', () => {
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: '/api', timeout: 30000 })
    );
  });

  it('registers request interceptor', () => {
    expect(__mockInstance.interceptors.request.use).toHaveBeenCalled();
  });

  it('registers response interceptor', () => {
    expect(__mockInstance.interceptors.response.use).toHaveBeenCalled();
  });
});
