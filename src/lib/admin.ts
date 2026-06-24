import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export function isAdminRole(role?: string | null) {
  return role === "ADMIN";
}

export function isStaffRole(role?: string | null) {
  return role === "STAFF";
}

export function isOperationsRole(role?: string | null) {
  return isAdminRole(role) || isStaffRole(role);
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return null;
  }
  return session;
}

export async function requireOperations() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isOperationsRole(session.user.role)) {
    return null;
  }
  return session;
}
