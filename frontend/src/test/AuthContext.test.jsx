import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

vi.mock('../api/services', () => ({
  authAPI: {
    me: vi.fn(),
    logout: vi.fn().mockResolvedValue({}),
  },
}));

import { AuthProvider, useAuth } from '../context/AuthContext';
import { authAPI } from '../api/services';

function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login({ email: 'a@b.co', isSuperAdmin: false }, { accessToken: 't', refreshToken: 'r' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when no token stored', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(authAPI.me).not.toHaveBeenCalled();
  });

  it('hydrates user when token exists', async () => {
    localStorage.setItem('accessToken', 'x');
    authAPI.me.mockResolvedValueOnce({ data: { data: { email: 'me@x.co', isSuperAdmin: true } } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('me@x.co'));
  });

  it('clears storage when /me fails', async () => {
    localStorage.setItem('accessToken', 'bad');
    authAPI.me.mockRejectedValueOnce(new Error('401'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('login stores tokens and sets user; logout clears', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    await act(async () => { screen.getByText('login').click(); });
    expect(localStorage.getItem('accessToken')).toBe('t');
    expect(screen.getByTestId('user').textContent).toBe('a@b.co');
    await act(async () => { screen.getByText('logout').click(); });
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
