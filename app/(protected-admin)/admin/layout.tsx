import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import AdminClientLayout from "./admin-client-layout"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Strict enforcement: If no valid session exists, boot the user to the login page.
  if (!session || !session.user) {
    redirect('/admin/login')
  }

  // Pass through the rendered children to our original interactive client UI
  return <AdminClientLayout>{children}</AdminClientLayout>
}
