import { db } from "@/lib/db"
import { requireAdminSession } from "@/lib/actions/auth-helper"
import {
  createWhiteGloveService,
  getEmailDeliveryConfigStatus,
} from "@/lib/white-glove"
import { WhiteGloveClient } from "./white-glove-client"

export const dynamic = "force-dynamic"

export default async function AdminWhiteGlovePage({
  searchParams,
}: {
  searchParams?: Promise<{ requestId?: string }>
}) {
  await requireAdminSession()

  const resolvedParams = searchParams ? await searchParams : {}
  const service = createWhiteGloveService(db)
  const { requests, newCount } = await service.listRequests({ sortOrder: "desc" })
  const emailConfigStatus = getEmailDeliveryConfigStatus()

  return (
    <WhiteGloveClient
      initialRequests={requests}
      initialNewCount={newCount}
      initialSelectedId={resolvedParams?.requestId || null}
      emailConfigStatus={emailConfigStatus}
    />
  )
}
