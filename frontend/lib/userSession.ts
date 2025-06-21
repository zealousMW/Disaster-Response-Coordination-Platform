// Utility to get userId from localStorage and add to headers
export function withUserIdHeader(init: RequestInit = {}): RequestInit {
  if (typeof window === "undefined") return init;
  const userId = localStorage.getItem("userId");
  if (!userId) return init;
  return {
    ...init,
    headers: {
      ...(init.headers || {}),
      "x-user-id": userId,
    },
  };
}
