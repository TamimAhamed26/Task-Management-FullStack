// lib/fetchWithToken.ts

export async function fetchWithToken(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include', 
  });

  if (process.env.NODE_ENV === 'development') {
    const refreshedToken = res.headers.get('x-access-token');
    if (refreshedToken) {
      console.log('[DEV] Refreshed access token from header:', refreshedToken);
    }
  }

  return res;
}
