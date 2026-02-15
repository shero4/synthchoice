export function createId(prefix = "id") {
  const token = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${token}`;
}
