const prefix = `${process.env.PUBLIC_URL}/_`;

export function routePath(endpoint = ''): string {
  return `${prefix}${endpoint}`;
}
