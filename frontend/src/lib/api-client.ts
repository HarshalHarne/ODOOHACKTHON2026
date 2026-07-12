const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { data, headers, ...customConfig } = options;

  let token = "";
  if (typeof window !== "undefined") {
    token = localStorage.getItem("access_token") || "";
  }

  const config: RequestInit = {
    method: data ? "POST" : "GET",
    ...customConfig,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new Error("Network error");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  
  if (!response.ok) {
    if (isJson) {
      const errData = await response.json();
      throw new ApiError(response.status, errData.error || "unknown_error", errData.message || "An unexpected error occurred");
    }
    throw new ApiError(response.status, "unknown_error", response.statusText);
  }

  if (isJson) {
    return (await response.json()) as T;
  }
  
  return null as unknown as T;
}
