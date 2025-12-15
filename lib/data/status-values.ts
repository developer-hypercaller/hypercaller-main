/**
 * Status enum definitions
 * Standardized status values for businesses
 */

export type BusinessStatus = "active" | "inactive" | "pending" | "suspended";

export interface StatusDefinition {
  value: BusinessStatus;
  displayName: string;
  description: string;
  isActive: boolean; // Whether this status allows business to be shown in search
}

export const statusDefinitions: StatusDefinition[] = [
  {
    value: "active",
    displayName: "Active",
    description: "Business is active and operational",
    isActive: true,
  },
  {
    value: "inactive",
    displayName: "Inactive",
    description: "Business is temporarily inactive",
    isActive: false,
  },
  {
    value: "pending",
    displayName: "Pending",
    description: "Business is pending verification",
    isActive: false,
  },
  {
    value: "suspended",
    displayName: "Suspended",
    description: "Business is suspended",
    isActive: false,
  },
];

const statusMap = new Map<BusinessStatus, StatusDefinition>();
statusDefinitions.forEach((status) => {
  statusMap.set(status.value, status);
});

/**
 * Get status definition
 */
export function getStatusDefinition(value: BusinessStatus): StatusDefinition | undefined {
  return statusMap.get(value);
}

/**
 * Validate status
 */
export function isValidStatus(value: string): value is BusinessStatus {
  return value === "active" || value === "inactive" || value === "pending" || value === "suspended";
}

/**
 * Normalize status input
 */
export function normalizeStatus(input: string): BusinessStatus | null {
  if (isValidStatus(input)) {
    return input;
  }

  const lower = input.toLowerCase().trim();
  if (lower === "active" || lower === "enabled" || lower === "live") {
    return "active";
  }
  if (lower === "inactive" || lower === "disabled" || lower === "closed") {
    return "inactive";
  }
  if (lower === "pending" || lower === "waiting" || lower === "verification") {
    return "pending";
  }
  if (lower === "suspended" || lower === "banned" || lower === "blocked") {
    return "suspended";
  }

  return null;
}

/**
 * Check if status allows business to be active in search
 */
export function isActiveStatus(status: BusinessStatus): boolean {
  const definition = getStatusDefinition(status);
  return definition?.isActive ?? false;
}

/**
 * Get all statuses
 */
export function getAllStatuses(): BusinessStatus[] {
  return ["active", "inactive", "pending", "suspended"];
}

/**
 * Status transition rules
 * Defines which status transitions are allowed
 */
export interface StatusTransition {
  from: BusinessStatus;
  to: BusinessStatus;
  allowed: boolean;
  requiresAction?: string; // Optional action required for transition
}

export const statusTransitions: StatusTransition[] = [
  // From pending
  { from: "pending", to: "active", allowed: true, requiresAction: "verification" },
  { from: "pending", to: "suspended", allowed: true, requiresAction: "admin_action" },
  { from: "pending", to: "inactive", allowed: false }, // Cannot go directly to inactive from pending
  
  // From active
  { from: "active", to: "inactive", allowed: true },
  { from: "active", to: "suspended", allowed: true, requiresAction: "admin_action" },
  { from: "active", to: "pending", allowed: false }, // Cannot go back to pending
  
  // From inactive
  { from: "inactive", to: "active", allowed: true },
  { from: "inactive", to: "suspended", allowed: true, requiresAction: "admin_action" },
  { from: "inactive", to: "pending", allowed: false },
  
  // From suspended
  { from: "suspended", to: "active", allowed: true, requiresAction: "admin_action" },
  { from: "suspended", to: "inactive", allowed: false }, // Must go through active first
  { from: "suspended", to: "pending", allowed: false },
];

/**
 * Check if a status transition is allowed
 */
export function isStatusTransitionAllowed(from: BusinessStatus, to: BusinessStatus): boolean {
  if (from === to) {
    return true; // Same status is always allowed
  }

  const transition = statusTransitions.find((t) => t.from === from && t.to === to);
  return transition?.allowed ?? false;
}

/**
 * Get allowed status transitions from a given status
 */
export function getAllowedStatusTransitions(from: BusinessStatus): BusinessStatus[] {
  return statusTransitions
    .filter((t) => t.from === from && t.allowed)
    .map((t) => t.to);
}

/**
 * Get required action for a status transition
 */
export function getStatusTransitionAction(from: BusinessStatus, to: BusinessStatus): string | undefined {
  const transition = statusTransitions.find((t) => t.from === from && t.to === to);
  return transition?.requiresAction;
}

/**
 * Get status transition info
 */
export function getStatusTransition(from: BusinessStatus, to: BusinessStatus): StatusTransition | undefined {
  return statusTransitions.find((t) => t.from === from && t.to === to);
}

/**
 * Get all possible next statuses from current status
 */
export function getNextPossibleStatuses(currentStatus: BusinessStatus): BusinessStatus[] {
  return getAllowedStatusTransitions(currentStatus);
}

/**
 * Check if status can be changed by user (vs admin only)
 */
export function canUserChangeStatus(from: BusinessStatus, to: BusinessStatus): boolean {
  const transition = getStatusTransition(from, to);
  if (!transition || !transition.allowed) {
    return false;
  }
  
  // Users can only change to inactive from active
  if (from === "active" && to === "inactive") {
    return true;
  }
  
  // All other transitions require admin action
  return !transition.requiresAction || transition.requiresAction !== "admin_action";
}

