import { match as matchPath } from "path-to-regexp";
import { asUrl } from "./as-url";
import { Match, Rule, GenericParams } from "./types";

export const match = <T extends {}>(
  rule: Rule<T>,
  urlLike: URL | string
): Match<T> | null => {
  const path = rule.path ? rule.path.replace(/\/$/, "") : undefined;
  const search = rule.search ?? {};
  const url = asUrl(urlLike);

  if (url.origin !== location.origin) return null;

  const params: GenericParams = {};

  // Match path
  if (path !== undefined) {
    const matcher = matchPath(path, {
      end: true,
      decode: decodeURIComponent
    });
    const pathResult = matcher(url.pathname);
    if (!pathResult) return null;
    Object.assign(params, pathResult.params);
  }

  // Match search
  for (let [name, pattern] of Object.entries(search)) {
    const matcher = matchPath(pattern, {
      end: true,
      decode: decodeURIComponent,
      delimiter: "&"
    });
    const queryResult = matcher(
      encodeURIComponent(url.searchParams.get(name) ?? "")
    );
    if (!queryResult) {
      return null;
    }
    Object.assign(params, queryResult.params as GenericParams);
  }

  const match = { params: params as T, url };

  if (rule.condition && !rule.condition(match)) {
    return null;
  }

  return match;
};
