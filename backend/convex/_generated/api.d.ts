/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as branches from "../branches.js";
import type * as checklists from "../checklists.js";
import type * as customers from "../customers.js";
import type * as evidence from "../evidence.js";
import type * as inventory from "../inventory.js";
import type * as jobs from "../jobs.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_jobPolicy from "../lib/jobPolicy.js";
import type * as lib_reports from "../lib/reports.js";
import type * as lib_submissionValidation from "../lib/submissionValidation.js";
import type * as reports from "../reports.js";
import type * as settings from "../settings.js";
import type * as sites from "../sites.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  branches: typeof branches;
  checklists: typeof checklists;
  customers: typeof customers;
  evidence: typeof evidence;
  inventory: typeof inventory;
  jobs: typeof jobs;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/jobPolicy": typeof lib_jobPolicy;
  "lib/reports": typeof lib_reports;
  "lib/submissionValidation": typeof lib_submissionValidation;
  reports: typeof reports;
  settings: typeof settings;
  sites: typeof sites;
  submissions: typeof submissions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
