const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || response.statusText || "API request failed");
  }
  return payload;
}

export const auth = {
  login: (credentials) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  register: (credentials) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  adminLogin: (credentials) =>
    request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
};

export const stocks = {
  list: () => request("/api/stocks"),
  create: (payload) =>
    request("/api/stocks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  delete: (stockId) =>
    request(`/api/stocks/${stockId}`, {
      method: "DELETE",
    }),
};

export const portfolio = {
  byUser: (userId) => request(`/api/portfolio/user/${userId}`),
};

export const watchlists = {
  byUser: (userId) => request(`/api/watchlists/user/${userId}`),
};

export const orders = {
  create: (payload) =>
    request("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  list: () => request("/api/orders"),
};

export const transactions = {
  list: () => request("/api/transactions"),
};

export const users = {
  list: () => request("/api/users"),
  remove: (userId) =>
    request(`/api/users/${userId}`, {
      method: "DELETE",
    }),
  update: (userId, payload) =>
    request(`/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  resetAll: () =>
    request("/api/users/reset", {
      method: "POST",
    }),
};
