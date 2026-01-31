const INTERPOLATION_PATTERN = /\{\{(\w+)\}\}/g;

export function interpolate(
  template: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return template;
  return template.replace(INTERPOLATION_PATTERN, (_, key: string) => {
    const val = params[key];
    return val != null ? String(val) : `{{${key}}}`;
  });
}
