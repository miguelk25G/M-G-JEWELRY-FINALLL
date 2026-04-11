import { LeadsClient } from "./leads-client"
import { db } from "@/lib/db"

export default async function LeadsPage() {
  const vipLeads = await db.vipWaitlist.findMany({
    orderBy: { createdAt: "desc" }
  })
  
  const contactLeads = await db.contactSubmission.findMany({
    orderBy: { createdAt: "desc" }
  })

  // Format datetimes and extract JSON metadata if any
  const formattedVips = vipLeads.map(v => ({
    id: v.id,
    email: v.email,
    phone: v.phone || "-",
    ig: v.igHandle || "-",
    lang: v.preferredLanguage,
    date: v.createdAt.toISOString().split("T")[0]
  }))

  const formattedContacts = contactLeads.map(c => {
    let budget = "-"
    let style = "-"
    try {
      if (c.metadata) {
        const meta = JSON.parse(c.metadata)
        if (meta.budget) budget = meta.budget
        if (meta.style) style = meta.style
      }
    } catch(e) {}
    
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || "-",
      reason: c.reason,
      message: c.message,
      budget,
      style,
      status: c.status,
      date: c.createdAt.toISOString().split("T")[0]
    }
  })

  return <LeadsClient vips={formattedVips} contacts={formattedContacts} />
}
