import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

/**
 * Validates that a session object is authenticated and carries the 'admin' role.
 * Throws an explicit Error if invalid.
 */
export function validateAdminRole(session: any) {
  if (!session || !session.user) {
    throw new Error("Unauthorized: Session required.")
  }

  const role = (session.user as any).role
  if (role !== "admin") {
    throw new Error("Forbidden: Administrator privileges required.")
  }

  return session
}

/**
 * Validates that the current request has an authenticated session with 'admin' role.
 * Throws an error if unauthenticated or unauthorized.
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  return validateAdminRole(session)
}
