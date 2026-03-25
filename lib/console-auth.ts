import axios from 'axios';

const CONSOLE_TOKEN_KEY = 'klaxtrix_console_token';

export const getConsoleToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONSOLE_TOKEN_KEY);
};

export const setConsoleToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSOLE_TOKEN_KEY, token);
};

export const clearConsoleToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONSOLE_TOKEN_KEY);
};

export const getConsoleAuthHeaders = () => {
  const token = getConsoleToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
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
