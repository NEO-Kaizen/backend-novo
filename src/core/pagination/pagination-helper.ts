import type { PageQuery } from "./page-query.ts";
import type { Page } from "./page.ts";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function sanitizePageQuery(query: PageQuery): { page: number; pageSize: number } {
  let page = Number(query.page);
  let pageSize = Number(query.pageSize);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return { page: Math.floor(page), pageSize: Math.floor(pageSize) };
}

export function buildPage<T>(items: readonly T[], total: number, requestedPage: number, pageSize: number): Page<T> {
  if (total === 0) {
    return {
      data: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0, // Regra §4.1: total 0 => totalPages 0
    };
  }

  const totalPages = Math.ceil(total / pageSize);
  // Regra do Clamp: se page > totalPages, a página efetiva é totalPages
  const effectivePage = requestedPage > totalPages ? totalPages : requestedPage;

  return {
    data: items,
    page: effectivePage,
    pageSize,
    total,
    totalPages,
  };
}