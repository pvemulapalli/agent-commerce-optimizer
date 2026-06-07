export async function parseApiResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    if (!response.ok) {
      throw new Error(`${fallbackError} (${response.status})`);
    }

    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Received an invalid response from the server."
        : `${fallbackError} (${response.status})`,
    );
  }
}
