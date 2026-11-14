/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as board from "../board.js";
import type * as demo from "../demo.js";
import type * as discovery from "../discovery.js";
import type * as evaluation from "../evaluation.js";
import type * as evidence from "../evidence.js";
import type * as fixtures_data from "../fixtures/data.js";
import type * as fixtures_persona from "../fixtures/persona.js";
import type * as http from "../http.js";
import type * as intentions from "../intentions.js";
import type * as introductions from "../introductions.js";
import type * as matching from "../matching.js";
import type * as seed from "../seed.js";
import type * as sessions from "../sessions.js";
import type * as telem from "../telem.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  auth: typeof auth;
  board: typeof board;
  demo: typeof demo;
  discovery: typeof discovery;
  evaluation: typeof evaluation;
  evidence: typeof evidence;
  "fixtures/data": typeof fixtures_data;
  "fixtures/persona": typeof fixtures_persona;
  http: typeof http;
  intentions: typeof intentions;
  introductions: typeof introductions;
  matching: typeof matching;
  seed: typeof seed;
  sessions: typeof sessions;
  telem: typeof telem;
  validators: typeof validators;
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

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  auth: import("@convex-dev/auth/_generated/component.js").ComponentApi<"auth">;
  authGoogle: import("@convex-dev/auth/components/google/_generated/component.js").ComponentApi<"authGoogle">;
};
