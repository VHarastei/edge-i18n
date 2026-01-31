import { type ReactElement, type ReactNode, cloneElement } from "react";

export function parseTranslation(
  text: string,
  components: Record<string, ReactElement>,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    const openMatch = remaining.match(/^(.*?)<(\w+)>(.*?)<\/\2>(.*)/s);
    if (!openMatch) {
      nodes.push(remaining);
      break;
    }

    const before = openMatch[1];
    const tag = openMatch[2]!;
    const content = openMatch[3];
    const after = openMatch[4];

    if (before) nodes.push(before);

    const component = components[tag];
    if (component) {
      nodes.push(cloneElement(component, { key: keyIndex++ }, content));
    } else {
      nodes.push(`<${tag}>${content}</${tag}>`);
    }

    remaining = after ?? "";
  }

  return nodes;
}
