/** Where Clerk returns the user when an SSO attempt needs more information. */
export const SSO_CALLBACK_ROUTE = "/sso-callback";

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  customers: "/customers",
  jobs: "/jobs",
  newJob: "/jobs/new",
  field: "/field",
  inventory: "/inventory",
  reports: "/reports",
  portalReports: "/portal/reports",
  branches: "/branches",
  team: "/team",
  signIn: "/sign-in",
  signUp: "/sign-up",
  job: (jobId: string) => `/jobs/${jobId}`,
  fieldJob: (jobId: string) => `/field/jobs/${jobId}`,
  report: (reportId: string) => `/reports/${reportId}`,
  portalReport: (reportId: string) => `/portal/reports/${reportId}`,
} as const;
