export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { headers, ...customConfig } = options;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  if (customConfig.body instanceof FormData) {
    delete requestHeaders["Content-Type"];
  }

  const config: RequestInit = {
    method: "GET",
    headers: requestHeaders,
    ...customConfig,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Something went wrong");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
