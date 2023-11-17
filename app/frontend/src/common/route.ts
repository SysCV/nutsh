const prefix = `${process.env.PUBLIC_URL}/_`;

export function routePath(endpoint = ''): string {
  return `${prefix}${endpoint}`;
}

// The server has no idea of under what host name it is serving, which only the client knows.
// In particular, a url to a local data may not be downloadable by the server.
// Therefore, the client needs to correct a local-data url to something the server is aware of.
export function correctSliceUrl(url: string): string {
  const {origin} = window.location;
  const dataPrefix = `${origin}/data/`;
  if (url.startsWith(dataPrefix)) {
    const rel = url.substring(dataPrefix.length);
    return `data://${rel}`;
  }
  return url;
}
