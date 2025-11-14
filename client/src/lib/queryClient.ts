import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./apiUrl";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to get JWT token from localStorage
function getAuthHeaders(additionalHeaders: HeadersInit = {}): HeadersInit {
  const headers: HeadersInit = { ...additionalHeaders };
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const fullUrl = getApiUrl(url);
    const headers = getAuthHeaders(data && method !== 'GET' ? { "Content-Type": "application/json" } : {});
    
    console.log(`[API REQUEST] ${method} ${fullUrl}`);
    console.log('[API REQUEST] Headers:', headers);
    if (data && method !== 'GET') console.log('[API REQUEST] Body:', data);
    
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data && method !== 'GET' ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log('[API REQUEST] Response status:', res.status);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('[API REQUEST] Failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = getApiUrl(queryKey.join("/") as string);
    const headers = getAuthHeaders();
    
    console.log('[QUERY] Fetching:', url);
    console.log('[QUERY] Headers:', headers);
    
    const res = await fetch(url, {
      credentials: "include",
      headers
    });

    console.log('[QUERY] Response status:', res.status);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('[QUERY] 401 - returning null');
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log('[QUERY] Success, data length:', Array.isArray(data?.tasks) ? data.tasks.length : 'N/A');
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      retryDelay: 500,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 500,
      networkMode: 'online',
    },
  },
});
