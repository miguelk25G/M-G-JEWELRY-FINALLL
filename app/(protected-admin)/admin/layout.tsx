import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import AdminClientLayout from "./admin-client-layout"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { createWhiteGloveService } from "@/lib/white-glove"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Strict enforcement: If no valid admin session exists, redirect to the login page.
  if (!session || !session.user || (session.user as any).role !== "admin") {
    redirect("/admin/login")
  }

  const whiteGloveService = createWhiteGloveService(db)
  const newWhiteGloveCount = await whiteGloveService.getNewRequestsCount()

  return (
    <AdminClientLayout newWhiteGloveCount={newWhiteGloveCount}>
      {children}
    </AdminClientLayout>
  )
}
