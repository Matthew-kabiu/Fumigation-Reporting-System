"use client";

import { Tooltip } from "react-tooltip";

/**
 * The single global tooltip instance (§6.4). Mounted once in the root layout.
 * Icon-only controls opt in with `data-tooltip-id={APP_TOOLTIP_ID}` plus
 * `data-tooltip-content`, and still carry their own `aria-label` — the tooltip
 * is a visual affordance, never the accessible name.
 */
export const APP_TOOLTIP_ID = "app-tooltip";

export function AppTooltip() {
  return <Tooltip id={APP_TOOLTIP_ID} className="app-tooltip" place="right" delayShow={120} noArrow={false} />;
}
