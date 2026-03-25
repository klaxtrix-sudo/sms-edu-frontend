import axios from 'axios';

const CONSOLE_TOKEN_KEY = 'klaxtrix_console_token';
const CONSOLE_USER_KEY = 'klaxtrix_console_user';

export const getConsoleToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONSOLE_TOKEN_KEY);
};

export const setConsoleToken = (token: string, user?: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSOLE_TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(CONSOLE_USER_KEY, JSON.stringify(user));
  }
};

export const clearConsoleToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONSOLE_TOKEN_KEY);
  localStorage.removeItem(CONSOLE_USER_KEY);
};

export const getConsoleAuthHeaders = () => {
  const token = getConsoleToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getConsoleUser = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(CONSOLE_USER_KEY);
  return user ? JSON.parse(user) : null;
};

/**
 * Checks if the current console session is still valid.
 * Hits the /api/console/me endpoint.
 */
export const verifyConsoleSession = async (backendUrl: string) => {
  const token = getConsoleToken();
  if (!token) return { valid: false };

  try {
    const response = await axios.get(`${backendUrl}/console/me`, getConsoleAuthHeaders());
    return { valid: response.data.success, admin: response.data.data };
  } catch (error) {
    return { valid: false };
  }
};
