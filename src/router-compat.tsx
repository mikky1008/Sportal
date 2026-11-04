// A tiny stand-in for the parts of @tanstack/react-router the screens used (Link, useNavigate,
// search params), built on Ionic's router. Screens keep their markup; only this layer changed.

import { useCallback, useEffect, useRef, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useIonRouter } from "@ionic/react";

type Primitive = string | number | boolean | undefined | null;
export type SearchInput = Record<string, Primitive>;
export type ParamsInput = Record<string, string>;
export type Direction = "forward" | "root" | "back" | "none";

/** Builds "/recruiting/a-001?tab=messages" from "/recruiting/$athleteId" + params + search. */
export function buildHref(to: string, params?: ParamsInput, search?: SearchInput): string {
  let path = to;
  if (params) for (const [k, v] of Object.entries(params)) path = path.replace(`$${k}`, encodeURIComponent(v));
  const q = new URLSearchParams();
  if (search) for (const [k, v] of Object.entries(search)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  params?: ParamsInput;
  search?: SearchInput;
  /** "root" replaces the history (use it for main navigation); default is a normal push. */
  direction?: Direction;
  children?: ReactNode;
}

export function Link({ to, params, search, direction = "forward", onClick, children, ...rest }: LinkProps) {
  const router = useIonRouter();
  const href = buildHref(to, params, search);
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(href, direction);
  };
  return (
    <a href={href} onClick={handle} {...rest}>
      {children}
    </a>
  );
}

export interface NavigateOptions {
  to?: string;
  params?: ParamsInput;
  search?: SearchInput;
  replace?: boolean;
  direction?: Direction;
}

export function useNavigate() {
  const router = useIonRouter();
  const location = useLocation();
  return useCallback(
    (opts: NavigateOptions) => {
      const href = buildHref(opts.to ?? location.pathname, opts.params, opts.search);
      // replace = same screen, new query (no animation)
      if (opts.replace) router.push(href, opts.direction ?? "none", "replace");
      else router.push(href, opts.direction ?? "forward");
    },
    [router, location.pathname],
  );
}

/**
 * Reads ?query values for this screen. Ionic keeps earlier screens mounted underneath, and
 * `useLocation()` changes under them when you navigate elsewhere, so the query is only taken
 * from the location while it still belongs to this screen's own path.
 */
export function useSearch<T>(parse: (raw: Record<string, unknown>) => T): T {
  const location = useLocation();
  const ownPath = useRef(location.pathname);
  const [qs, setQs] = useState(location.search);
  useEffect(() => {
    if (location.pathname === ownPath.current) setQs(location.search);
  }, [location.pathname, location.search]);
  const raw: Record<string, unknown> = {};
  new URLSearchParams(qs).forEach((v, k) => {
    raw[k] = v;
  });
  return parse(raw);
}
