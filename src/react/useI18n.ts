import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  useCallback,
  useSyncExternalStore,
} from "react";
import { I18nCore } from "../core/I18nCore.js";
import type { Namespace } from "../core/types.js";

function parseTranslation(
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

interface TFunctionParams extends Record<string, unknown> {
  components?: Record<string, ReactElement>;
}

interface TFunction {
  (key: string, params: { components: Record<string, ReactElement> } & Record<string, unknown>): ReactNode;
  (key: string, params?: Record<string, unknown>): string;
}

export function useI18n(namespace: Namespace = "common") {
  const i18n = I18nCore.getInstance();

  const locale = useSyncExternalStore(
    i18n.subscribe,
    i18n.getLocale,
    i18n.getLocale,
  );

  const t = useCallback(
    (key: string, params?: TFunctionParams) => {
      if (params?.components) {
        const { components, ...rest } = params;
        const raw = i18n.t(key, namespace, Object.keys(rest).length > 0 ? rest : undefined);
        return parseTranslation(raw, components);
      }
      return i18n.t(key, namespace, params);
    },
    // locale is needed so t() re-evaluates after locale change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n, namespace, locale],
  ) as TFunction;

  // Throw after all hooks to respect Rules of Hooks.
  // React Suspense catches the promise and re-renders when resolved.
  const promise = i18n.getSuspensePromise(namespace);
  if (promise) throw promise;

  return { t, locale, setLocale: i18n.setLocale } as const;
}
