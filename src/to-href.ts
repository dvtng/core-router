import { Rule, GenericParams, Match } from "./types";
import { compile } from "path-to-regexp";
import { asUrl } from "./as-url";

const encodeParams = (params: GenericParams): GenericParams => {
  const encoded: GenericParams = {};

  for (let key of Object.keys(params)) {
    encoded[key] = encodeURIComponent(params[key]);
  }

  return encoded;
};

export function toHref(rule: Rule<{}>): string;
export function toHref<T extends {}>(rule: Rule<T>, params: T): string;
export function toHref<T extends {}>(
  rule: Rule<T>,
  params: T = {} as T
): string {
  const pathname = rule.path
    ? compile(rule.path, { encode: encodeURIComponent })(params as {})
    : "";
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const searchRules = Object.entries(rule.search ?? {}).sort(([keyA], [keyB]) =>
    keyA.localeCompare(keyB)
  );
  const searchStrings = [];
  for (let [name, pattern] of searchRules) {
    const value = compile(pattern, { delimiter: "&" })(encodeParams(params));
    if (value) {
      searchStrings.push(`${encodeURIComponent(name)}=${value}`);
    }
  }
  const href =
    normalizedPathname +
    (searchStrings.length ? "?" + searchStrings.join("&") : "");
  const match: Match<T> = {
    params,
    url: asUrl(href)
  };
  if (rule.condition && !rule.condition(match)) {
    throw new Error("Expected href to pass the condition defined on the rule");
  }
  return href;
}
