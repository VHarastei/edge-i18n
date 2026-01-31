import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useSyncExternalStore,
} from "react";
import { I18nCore } from "../core/I18nCore.js";
import type { Namespace } from "../core/types.js";
import { parseTranslation } from "../utils/parseTranslation.js";

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: locale is needed so t() re-evaluates after locale change
  const t = useCallback(
    (key: string, params?: TFunctionParams) => {
      if (params?.components) {
        const { components, ...rest } = params;
        const raw = i18n.t(key, namespace, Object.keys(rest).length ? rest : undefined);
        return parseTranslation(raw, components);
      }
      return i18n.t(key, namespace, params);
    },
    [i18n, namespace, locale],
  ) as TFunction;

  const promise = i18n.getSuspensePromise(namespace);
  if (promise) throw promise;

  return { t, locale, setLocale: i18n.setLocale } as const;
}
