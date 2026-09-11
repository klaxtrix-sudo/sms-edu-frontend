/**
 * Granular Action-Level Permissions Evaluator
 * 
 * Supports:
 * - Full wildcard '*'
 * - Direct match e.g. 'finance:manage'
 * - Module-level wildcard e.g. 'finance' grants 'finance:manage' and 'finance:read'
 * - Manage implies read e.g. 'finance:manage' grants 'finance:read'
 */
export function hasPermission(permissions: string[] | undefined | null, required: string): boolean {
  if (!permissions || !Array.isArray(permissions)) return false;
  if (permissions.includes("*")) return true;
  if (permissions.includes(required)) return true;

  if (required.includes(":")) {
    const [reqModule, reqScope] = required.split(":");
    if (permissions.includes(reqModule)) return true;
    if (permissions.includes(`${reqModule}:manage`)) return true;
    if (reqScope === "read" && permissions.includes(`${reqModule}:read`)) return true;
  } else {
    if (permissions.includes(`${required}:manage`)) return true;
  }

  return false;
}
