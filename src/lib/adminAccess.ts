export const ADMIN_BASE = "/546498@18";

/** Rotas do painel liberadas para a role `moderator` (apoio operacional). */
export const MODERATOR_ALLOWED_PATHS = [
  ADMIN_BASE,
  `${ADMIN_BASE}/orders`,
  `${ADMIN_BASE}/reviews`,
  `${ADMIN_BASE}/banners`,
];

export const isPathAllowedForModerator = (pathname: string) => {
  const clean = pathname.replace(/\/+$/, "") || ADMIN_BASE;
  if (clean === ADMIN_BASE) return true;
  return MODERATOR_ALLOWED_PATHS.some(
    (p) => p !== ADMIN_BASE && (clean === p || clean.startsWith(`${p}/`))
  );
};
