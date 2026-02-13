export const getAuthToken = () => {
  try {
    return localStorage.getItem("auth_token");
  } catch (_) {
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) localStorage.setItem("auth_token", token);
  } catch (_) {}
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem("auth_token");
  } catch (_) {}
};

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
