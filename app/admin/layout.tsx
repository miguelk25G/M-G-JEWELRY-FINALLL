import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import AdminClientLayout from "./admin-client-layout"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  // Strict enforcement: If no valid session exists, boot the user to the login page.
  if (!session || !session.user) {
    redirect('/admin/login')
  }

  // Pass through the rendered children to our original interactive client UI
  return <AdminClientLayout>{children}</AdminClientLayout>
}
