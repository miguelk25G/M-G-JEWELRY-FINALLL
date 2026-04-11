import { SettingsClient } from "./settings-client"
import { db } from "@/lib/db"

export default async function SettingsPage() {
  let settings = await db.siteSettings.findUnique({ where: { id: "main" } })
  
  if (!settings) {
    settings = await db.siteSettings.create({
      data: {
        id: "main",
        whatsappNumber: "+15125760229",
        contactEmail: "info@mgjewelry.com",
        siteName: "M&G Jewelry",
      }
    })
  }

  return <SettingsClient settings={settings} />
}
