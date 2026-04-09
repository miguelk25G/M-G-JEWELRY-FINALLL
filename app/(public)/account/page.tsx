"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Package,
  Heart,
  MapPin,
  CreditCard,
  LogOut,
  Pencil,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { useLocale } from "@/i18n/locale-context"

const orders = [
  {
    id: "ORD-001",
    date: "January 15, 2024",
    status: "Delivered",
    total: 2450.0,
    items: [
      { name: "2.99 Carat Diamond Ring", image: "/placeholder.svg?height=80&width=80", quantity: 1, price: 2450 },
    ],
  },
  {
    id: "ORD-002",
    date: "December 20, 2023",
    status: "Delivered",
    total: 1890.0,
    items: [
      { name: "Diamond Tennis Bracelet", image: "/placeholder.svg?height=80&width=80", quantity: 1, price: 1890 },
    ],
  },
]

const addresses = [
  {
    id: "1",
    name: "Home",
    address: "123 Main Street, Apt 4B",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "United States",
    isDefault: true,
  },
  {
    id: "2",
    name: "Office",
    address: "456 Business Ave, Suite 100",
    city: "New York",
    state: "NY",
    zip: "10022",
    country: "United States",
    isDefault: false,
  },
]

export default function AccountPage() {
  const { t } = useLocale()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState({
    firstName: "Demo",
    lastName: "User",
    email: "demo@example.com",
    phone: "+1 (555) 123-4567",
  })

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    setIsEditing(false)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold mb-8">{t("account.myAccount")}</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-4 w-4 mr-2" />
              {t("account.profile")}
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="h-4 w-4 mr-2" />
              {t("account.orders")}
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Heart className="h-4 w-4 mr-2" />
              {t("account.wishlist")}
            </TabsTrigger>
            <TabsTrigger value="addresses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              {t("account.addresses")}
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="h-4 w-4 mr-2" />
              {t("account.payment")}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("account.profileInfo")}</CardTitle>
                  <CardDescription>{t("account.profileDescription")}</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("common.edit")}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("auth.firstName")}</Label>
                      <Input
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("auth.lastName")}</Label>
                      <Input
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("auth.email")}</Label>
                    <Input value={profile.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("contact.phone")}</Label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  {isEditing && (
                    <div className="flex gap-3">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("common.saving")}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t("common.saveChanges")}
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
            <Card className="mt-6">
              <CardContent className="p-6">
                <Button variant="destructive" className="w-full sm:w-auto">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("account.signOut")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      {order.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {order.items.map((item) => (
                      <div key={item.name} className="flex items-center gap-4 py-2">
                        <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">{formatPrice(item.price)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 border-t mt-4">
                      <span className="font-medium">{t("cart.total")}</span>
                      <span className="font-semibold text-lg">{formatPrice(order.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist">
            <Card>
              <CardContent className="p-6 text-center">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("account.emptyWishlist")}</h3>
                <p className="text-muted-foreground mb-4">{t("account.emptyWishlistMessage")}</p>
                <Button asChild>
                  <Link href="/collections">{t("common.shopNow")}</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <div className="grid sm:grid-cols-2 gap-4">
              {addresses.map((address) => (
                <Card key={address.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{address.name}</h3>
                      {address.isDefault && (
                        <Badge variant="secondary">{t("account.default")}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {address.address}
                      <br />
                      {address.city}, {address.state} {address.zip}
                      <br />
                      {address.country}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm">
                        {t("common.edit")}
                      </Button>
                      {!address.isDefault && (
                        <Button variant="ghost" size="sm">
                          {t("account.setDefault")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                  <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">{t("account.addNewAddress")}</p>
                  <Button variant="outline">{t("common.add")}</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment">
            <Card>
              <CardContent className="p-6 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("account.noPaymentMethods")}</h3>
                <p className="text-muted-foreground mb-4">{t("account.noPaymentMethodsMessage")}</p>
                <Button>{t("account.addPaymentMethod")}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
