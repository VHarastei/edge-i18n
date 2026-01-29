export function interpolate(
  template: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = params[key];
    return val != null ? String(val) : `{{${key}}}`;
  });
}
