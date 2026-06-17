const BASE_URL = 'http://localhost:8000';

export const apiClient = {
  get: async (url: string) => {
    const res = await fetch(`${BASE_URL}${url}`);
    if (!res.ok) throw new Error(`GET ${url} failed`);
    return res.json();
  },
  post: async (url: string, body: any) => {
    const headers: Record<string, string> = {};
    let finalBody = body;
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      finalBody = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${url}`, { method: 'POST', headers, body: finalBody });
    if (!res.ok) throw new Error(`POST ${url} failed`);
    return res.json();
  },
  put: async (url: string, body: any) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PUT ${url} failed`);
    return res.json();
  }
};
