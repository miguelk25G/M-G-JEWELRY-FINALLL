"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Mail, MailOpen, Trash2, Reply, Star } from "lucide-react"
import { cn } from "@/lib/utils"

const messages = [
  {
    id: "1",
    from: "Maria Garcia",
    email: "maria@example.com",
    subject: "Question about diamond certification",
    preview: "Hello, I'm interested in the 2.99 carat diamond ring and would like to know more about the certification...",
    date: "2 hours ago",
    read: false,
    starred: true,
    type: "Inquiry",
  },
  {
    id: "2",
    from: "John Smith",
    email: "john@example.com",
    subject: "Custom ring request",
    preview: "I'd like to request a custom engagement ring with specific specifications. Can you help me with...",
    date: "5 hours ago",
    read: false,
    starred: false,
    type: "White-Glove",
  },
  {
    id: "3",
    from: "Ana Martinez",
    email: "ana@example.com",
    subject: "Re: Order confirmation",
    preview: "Thank you for the quick delivery! The necklace is beautiful and exactly as described...",
    date: "1 day ago",
    read: true,
    starred: false,
    type: "Support",
  },
  {
    id: "4",
    from: "Carlos Lopez",
    email: "carlos@example.com",
    subject: "Return request",
    preview: "I would like to return my recent purchase. The ring size doesn't fit properly...",
    date: "2 days ago",
    read: true,
    starred: false,
    type: "Return",
  },
  {
    id: "5",
    from: "Laura Wilson",
    email: "laura@example.com",
    subject: "VIP appointment request",
    preview: "I would like to schedule a private viewing at your showroom. I'm looking for a special piece...",
    date: "3 days ago",
    read: true,
    starred: true,
    type: "White-Glove",
  },
]

const typeColors: Record<string, string> = {
  Inquiry: "bg-blue-500/10 text-blue-500",
  White-Glove: "bg-purple-500/10 text-purple-500",
  Support: "bg-green-500/10 text-green-500",
  Return: "bg-orange-500/10 text-orange-500",
}

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)

  const filteredMessages = messages.filter(
    (message) =>
      message.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.preview.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const unreadCount = messages.filter((m) => !m.read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-muted-foreground">
            {unreadCount} unread messages
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                  !message.read && "bg-muted/30",
                  selectedMessage === message.id && "bg-muted"
                )}
                onClick={() => setSelectedMessage(message.id)}
              >
                <div className="flex-shrink-0 mt-1">
                  {message.read ? (
                    <MailOpen className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Mail className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("font-medium", !message.read && "text-primary")}>
                        {message.from}
                      </p>
                      <Badge className={typeColors[message.type]} variant="secondary">
                        {message.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {message.starred && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {message.date}
                      </span>
                    </div>
                  </div>
                  <p className={cn("text-sm mb-1", !message.read ? "font-medium" : "text-foreground")}>
                    {message.subject}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{message.preview}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Reply className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

