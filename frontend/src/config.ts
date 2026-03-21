export const config = {
  appsScriptBaseUrl: import.meta.env.VITE_APPS_SCRIPT_BASE_URL || '',
  useMockApi: (import.meta.env.VITE_USE_MOCK_API || 'true') === 'true',
  seasonYear: Number(import.meta.env.VITE_SEASON_YEAR || '2026'),
  adminRouteSlug: import.meta.env.VITE_ADMIN_ROUTE_SLUG || 'commissioner-portal',
  uniqueLinkFlowEnabled: (import.meta.env.VITE_ENABLE_UNIQUE_LINK_FLOW || 'false') === 'true',
};
