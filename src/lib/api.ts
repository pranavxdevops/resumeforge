export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      'X-ResumeForge': '1',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const result = await response
      .json()
      .catch(() => ({ error: 'The server could not complete your request.' }));
    throw new ApiError(result.error || 'Something went wrong.', response.status);
  }
  return response.json();
}
export const post = <T = any>(path: string, data: unknown = {}) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const put = <T = any>(path: string, data: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(data) });
export async function download(path: string, name: string) {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-ResumeForge': '1' },
  });
  if (!response.ok) {
    const data = await response.json();
    throw new ApiError(data.error, response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function timeAgo(value: string) {
  const difference = Date.now() - new Date(value).getTime();
  if (difference < 60000) return 'Just now';
  if (difference < 3600000) return `${Math.floor(difference / 60000)} min ago`;
  if (difference < 86400000) return `${Math.floor(difference / 3600000)} hours ago`;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
