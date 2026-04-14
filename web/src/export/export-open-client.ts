type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function openExportDirectory(fetchImpl: FetchLike, targetPath: string): Promise<boolean> {
  const response = await fetchImpl('/api/export/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetPath }),
  });

  return response.ok;
}

