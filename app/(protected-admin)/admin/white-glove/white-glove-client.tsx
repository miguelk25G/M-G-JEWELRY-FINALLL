"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Sparkles,
  Search,
  Mail,
  Instagram,
  Phone,
  ExternalLink,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  ArrowUpDown,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  WHITE_GLOVE_STATUSES,
  type WhiteGloveAdminRequest,
  type WhiteGloveStatus,
  type EmailDeliveryConfigStatus,
} from "@/lib/white-glove-shared"
import {
  updateWhiteGloveStatusAction,
  retryWhiteGloveNotificationAction,
} from "@/lib/actions/white-glove"

function getStatusBadgeStyle(status: WhiteGloveStatus) {
  switch (status) {
    case "New":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30"
    case "Contacted":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "In Progress":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30"
    case "Completed":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "Closed":
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
    default:
      return "bg-secondary text-foreground border-border"
  }
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function WhiteGloveClient({
  initialRequests,
  initialNewCount,
  initialSelectedId,
  emailConfigStatus,
}: {
  initialRequests: WhiteGloveAdminRequest[]
  initialNewCount: number
  initialSelectedId?: string | null
  emailConfigStatus?: EmailDeliveryConfigStatus
}) {
  const router = useRouter()
  const [requests, setRequests] = useState<WhiteGloveAdminRequest[]>(initialRequests)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")

  // Detail modal state
  const [selectedRequest, setSelectedRequest] = useState<WhiteGloveAdminRequest | null>(null)
  const [draftStatus, setDraftStatus] = useState<WhiteGloveStatus>("New")
  const [draftAdminNotes, setDraftAdminNotes] = useState<string>("")
  const [draftOrderId, setDraftOrderId] = useState("")
  const [draftChannel, setDraftChannel] = useState("Email")
  const [draftContactNote, setDraftContactNote] = useState("")
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isRetryingEmail, setIsRetryingEmail] = useState(false)

  useEffect(() => {
    setRequests(initialRequests)
  }, [initialRequests])

  // Auto-open request if deep-linked from email notification (?requestId=...)
  useEffect(() => {
    if (initialSelectedId) {
      const match = initialRequests.find((r) => r.id === initialSelectedId)
      if (match) {
        openDetailModal(match)
      }
    }
  }, [initialSelectedId, initialRequests])

  const openDetailModal = (req: WhiteGloveAdminRequest) => {
    setSelectedRequest(req)
    setDraftOrderId(req.linkedOrderId || "")
    setDraftChannel(req.preferredContact)
    setDraftContactNote("")
    setDraftStatus(req.status)
    setDraftAdminNotes(req.adminNotes || "")
  }

  const newRequestsCount = useMemo(
    () => requests.filter((r) => r.status === "New").length,
    [requests]
  )

  const filteredRequests = useMemo(() => {
    let list = [...requests]

    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter)
    }

    if (methodFilter !== "all") {
      list = list.filter((r) => r.preferredContact === methodFilter)
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.contactDisplay.toLowerCase().includes(q) ||
          (r.email && r.email.toLowerCase().includes(q)) ||
          (r.instagramHandle && r.instagramHandle.toLowerCase().includes(q)) ||
          (r.phone && r.phone.toLowerCase().includes(q))
      )
    }

    list.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime()
      const tB = new Date(b.createdAt).getTime()
      return sortOrder === "desc" ? tB - tA : tA - tB
    })

    return list
  }, [requests, statusFilter, methodFilter, searchQuery, sortOrder])

  const handleSaveStatus = async (
    targetId: string,
    nextStatus: WhiteGloveStatus,
    notes?: string
  ) => {
    setIsSavingStatus(true)
    const toastId = toast.loading("Saving request status...")

    try {
      const res = await updateWhiteGloveStatusAction({
        id: targetId,
        status: nextStatus,
        adminNotes: notes,
        orderId: selectedRequest?.id === targetId ? draftOrderId : undefined,
        channel: draftChannel as import("@/lib/white-glove-shared").WhiteGloveContactMethod,
        note: selectedRequest?.id === targetId ? draftContactNote : undefined,
      })

      if (!res.success || !res.request) {
        toast.error(res.error || "Failed to update request status.", { id: toastId })
        return
      }

      setRequests((prev) =>
        prev.map((r) => (r.id === targetId ? res.request! : r))
      )
      if (selectedRequest && selectedRequest.id === targetId) {
        setSelectedRequest(res.request)
        setDraftStatus(res.request.status)
        setDraftAdminNotes(res.request.adminNotes || "")
      }

      setDraftContactNote("")
      toast.success(`Request status updated to "${nextStatus}".`, { id: toastId })
      router.refresh()
    } catch {
      toast.error("An unexpected error occurred while saving.", { id: toastId })
    } finally {
      setIsSavingStatus(false)
    }
  }

  const handleRetryNotifications = async (targetId: string) => {
    setIsRetryingEmail(true)
    const toastId = toast.loading("Retrying email notifications...")

    try {
      const res = await retryWhiteGloveNotificationAction(targetId)
      if (!res.success || !res.request) {
        toast.error(res.error || "Failed to retry notifications.", { id: toastId })
        return
      }

      setRequests((prev) =>
        prev.map((r) => (r.id === targetId ? res.request! : r))
      )
      if (selectedRequest && selectedRequest.id === targetId) {
        setSelectedRequest(res.request)
      }

      const adminSent = res.request.notifications.adminEmail.status === "sent"
      if (adminSent) {
        toast.success("Email notifications sent successfully.", { id: toastId })
      } else {
        toast.warning(
          res.request.notifications.adminEmail.error ||
            "Notification attempt recorded. Check email transport configuration.",
          { id: toastId }
        )
      }
      router.refresh()
    } catch {
      toast.error("Failed to retry email notifications.", { id: toastId })
    } finally {
      setIsRetryingEmail(false)
    }
  }

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value)
    toast.success(`${label} copied to clipboard.`)
  }

  return (
    <div className="space-y-6">
      {/* Header & Unreviewed Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              White-Glove Requests
            </h1>
            <Badge
              variant="outline"
              className={
                newRequestsCount > 0
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30 px-2.5 py-0.5 text-xs font-semibold"
                  : "bg-secondary text-muted-foreground border-border px-2.5 py-0.5 text-xs"
              }
            >
              {newRequestsCount} Unreviewed New
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Review and manage customer submissions from the White-Glove Quiz.
          </p>
        </div>
        {emailConfigStatus && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs">
            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">Notifications to:</span>
            <span className="font-mono font-medium text-foreground">
              {emailConfigStatus.adminNotificationEmail}
            </span>
            <Badge
              variant="outline"
              className={
                emailConfigStatus.activeTransport !== "unconfigured"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 text-[11px]"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30 text-[11px]"
              }
            >
              {emailConfigStatus.activeTransport === "smtp"
                ? "SMTP Configured — delivery unverified"
                : emailConfigStatus.activeTransport === "resend"
                  ? "Resend Configured — delivery unverified"
                  : "SMTP Credentials Pending"}
            </Badge>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-2xl font-bold">{requests.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>New (Unreviewed)</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-400">
              {newRequestsCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Active Follow-Ups</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400">
              {
                requests.filter(
                  (r) => r.status === "Contacted" || r.status === "In Progress"
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400">
              {requests.filter((r) => r.status === "Completed").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search, Filters & Sort Controls */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, @instagram username, or request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[155px] bg-background">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {WHITE_GLOVE_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="Contact Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contact Methods</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Phone Text">SMS</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="default"
                className="gap-1.5 bg-background"
                onClick={() =>
                  setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                }
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortOrder === "desc" ? "Newest First" : "Oldest First"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Request ID</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Customer Contact</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Jewelry Preferences</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No White-Glove quiz requests found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => openDetailModal(req)}
                  >
                    <TableCell className="font-mono text-xs font-medium">
                      <span title={req.id}>#{req.id.slice(-8)}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(req.createdAt)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {req.email ? (
                        <a
                          href={req.mailtoHref || `mailto:${req.email}`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary underline-offset-4 hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{req.email}</span>
                        </a>
                      ) : req.instagramHandle && req.instagramUrl ? (
                        <a
                          href={req.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary underline-offset-4 hover:underline"
                        >
                          <Instagram className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>@{req.instagramHandle}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{req.contactDisplay}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {req.preferredContact === "Phone Text" ? "SMS" : req.preferredContact}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {req.preferences.pieceType && (
                          <Badge variant="secondary" className="text-[11px]">
                            {req.preferences.pieceType}
                          </Badge>
                        )}
                        {req.preferences.budget && (
                          <Badge variant="secondary" className="text-[11px]">
                            {req.preferences.budget}
                          </Badge>
                        )}
                        {req.preferences.metal && (
                          <Badge variant="secondary" className="text-[11px]">
                            {req.preferences.metal} Gold
                          </Badge>
                        )}
                        {req.preferences.sizing && (
                          <Badge variant="outline" className="text-[11px]">
                            {req.preferences.sizing}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={req.status}
                        onValueChange={(val) =>
                          handleSaveStatus(req.id, val as WhiteGloveStatus)
                        }
                        disabled={isSavingStatus}
                      >
                        <SelectTrigger
                          className={`h-8 w-[135px] text-xs font-medium border ${getStatusBadgeStyle(
                            req.status
                          )}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WHITE_GLOVE_STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => openDetailModal(req)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detailed Request Modal */}
      <Dialog
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                  <DialogTitle className="font-serif text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    White-Glove Request Details
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={getStatusBadgeStyle(selectedRequest.status)}
                  >
                    {selectedRequest.status}
                  </Badge>
                </div>
                <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1">
                  <span>
                    ID:{" "}
                    <strong className="font-mono text-foreground">
                      {selectedRequest.id}
                    </strong>
                  </span>
                  <span>
                    Received:{" "}
                    <strong className="text-foreground">
                      {formatDateTime(selectedRequest.createdAt)}
                    </strong>
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                <div className="space-y-3 rounded-md border p-3">
                  <p>{selectedRequest.linkedOrderId ? "Linked order: " + selectedRequest.linkedOrderId : "Lead — no confirmed order linked"}</p>
                  <Label htmlFor="wg-order">Real order ID (optional)</Label>
                  <Input id="wg-order" value={draftOrderId} onChange={e => setDraftOrderId(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Paid, In Production and Shipped require a linked order with confirmed payment. Request stages do not change the order or collect payment.</p>
                  <Label htmlFor="wg-channel">Contact channel used</Label>
                  <select id="wg-channel" className="bg-background border rounded p-2" value={draftChannel} onChange={e => setDraftChannel(e.target.value)}>
                    {["Email", "Instagram", "Phone Text", "WhatsApp"].map(c => <option key={c} value={c}>{c === "Phone Text" ? "SMS" : c}</option>)}
                  </select>
                  <Input aria-label="Contact follow-up note" placeholder="Record contact, response or next step" value={draftContactNote} onChange={e => setDraftContactNote(e.target.value)} />
                  {(selectedRequest.contactHistory || []).map((entry, i) => <p key={i} className="text-sm">{formatDateTime(entry.recordedAt)} · {entry.channel} · {entry.note}</p>)}
                  {selectedRequest.statusHistory.map((entry, i) => <p key={"status-" + i} className="text-xs text-muted-foreground">{formatDateTime(entry.changedAt)} · {entry.status}</p>)}
                </div>
                {/* 1. Customer Contact & Direct Action Links */}
                <div className="rounded-lg border border-border bg-background/60 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Customer Contact ({selectedRequest.preferredContact})
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {selectedRequest.contactDisplay}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedRequest.email && (
                        <Button size="sm" variant="default" className="gap-1.5" asChild>
                          <a
                            href={
                              selectedRequest.mailtoHref ||
                              `mailto:${selectedRequest.email}`
                            }
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Email Customer
                          </a>
                        </Button>
                      )}
                      {selectedRequest.instagramHandle &&
                        selectedRequest.instagramUrl && (
                          <Button size="sm" variant="default" className="gap-1.5" asChild>
                            <a
                              href={selectedRequest.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Instagram className="h-3.5 w-3.5" />
                              Open @{selectedRequest.instagramHandle}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() =>
                          copyToClipboard(
                            selectedRequest.contactDisplay,
                            "Customer contact"
                          )
                        }
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 2. Key Jewelry Preferences Summary */}
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                    Jewelry Selections &amp; Preferences Summary
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {[
                      { label: "For", val: selectedRequest.preferences.recipient },
                      { label: "Piece", val: selectedRequest.preferences.pieceType },
                      { label: "Budget", val: selectedRequest.preferences.budget },
                      { label: "Style", val: selectedRequest.preferences.style },
                      { label: "Metal", val: selectedRequest.preferences.metal },
                      { label: "Stone", val: selectedRequest.preferences.stonePreference },
                      { label: "Sizing", val: selectedRequest.preferences.sizing },
                      { label: "Usage", val: selectedRequest.preferences.usage },
                      { label: "Watch", val: selectedRequest.preferences.wearsWatch },
                      { label: "Deadline", val: selectedRequest.preferences.deadline },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-md border border-border bg-secondary/20 p-2.5"
                      >
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                          {item.val || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Complete Quiz Questions & Answers */}
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                    Complete Quiz Questions &amp; Answers (
                    {selectedRequest.questionsAndAnswers.length})
                  </h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead>Customer Answer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRequest.questionsAndAnswers.map((qa) => (
                          <TableRow key={qa.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              Q{qa.questionNumber}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {qa.questionEn}
                              {qa.isConditional && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-[10px] py-0 px-1.5"
                                >
                                  Dynamic
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-foreground">
                              {qa.answer}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 4. Additional Customer Information (if provided) */}
                {selectedRequest.additionalInfo && (
                  <div className="rounded-lg border border-border bg-secondary/20 p-4">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Additional Customer Information
                    </h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedRequest.additionalInfo}
                    </p>
                  </div>
                )}

                {/* 5. Email Email Sending Status & Safe Retry */}
                <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Notification Delivery Status
                    </h4>
                    {(selectedRequest.notifications.adminEmail.status !== "sent" ||
                      (selectedRequest.email &&
                        selectedRequest.notifications.customerEmail.status !==
                          "sent")) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        disabled={isRetryingEmail}
                        onClick={() => handleRetryNotifications(selectedRequest.id)}
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isRetryingEmail ? "animate-spin" : ""}`}
                        />
                        Retry Notifications
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">Sent means accepted by the email server; inbox delivery is not confirmed. Sending or uncertain attempts require provider review before another send.</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-2 rounded border border-border/60 p-2.5">
                      {selectedRequest.notifications.adminEmail.status === "sent" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : selectedRequest.notifications.adminEmail.status === "failed" ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          Business Notification Email
                        </p>
                        <p className="text-muted-foreground">
                          Status: {selectedRequest.notifications.adminEmail.status}
                          {selectedRequest.notifications.adminEmail.recipient
                            ? ` (${selectedRequest.notifications.adminEmail.recipient})`
                            : ""}
                        </p>
                        {selectedRequest.notifications.adminEmail.error && (
                          <p className="text-amber-400 mt-0.5">
                            {selectedRequest.notifications.adminEmail.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded border border-border/60 p-2.5">
                      {selectedRequest.notifications.customerEmail.status === "sent" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : selectedRequest.notifications.customerEmail.status ===
                        "skipped_not_applicable" ? (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      ) : selectedRequest.notifications.customerEmail.status ===
                        "failed" ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          Customer Confirmation Email
                        </p>
                        <p className="text-muted-foreground">
                          Status:{" "}
                          {selectedRequest.notifications.customerEmail.status ===
                          "skipped_not_applicable"
                            ? `Not applicable (${selectedRequest.preferredContact})`
                            : selectedRequest.notifications.customerEmail.status}
                        </p>
                        {selectedRequest.notifications.customerEmail.error && (
                          <p className="text-amber-400 mt-0.5">
                            {selectedRequest.notifications.customerEmail.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Request Status & Admin Internal Notes Update */}
                <div className="rounded-lg border border-border bg-secondary/10 p-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-status-select">Request Status</Label>
                      <Select
                        value={draftStatus}
                        onValueChange={(val) =>
                          setDraftStatus(val as WhiteGloveStatus)
                        }
                      >
                        <SelectTrigger id="detail-status-select" className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WHITE_GLOVE_STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="detail-admin-notes">
                      Internal Concierge Notes (Admin Only)
                    </Label>
                    <textarea
                      id="detail-admin-notes"
                      rows={2}
                      value={draftAdminNotes}
                      onChange={(e) => setDraftAdminNotes(e.target.value)}
                      placeholder="Add internal follow-up notes, quoted pieces, or consultation details..."
                      className="w-full rounded-md border border-border bg-background p-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                  disabled={isSavingStatus}
                >
                  Close
                </Button>
                <Button
                  onClick={() =>
                    handleSaveStatus(
                      selectedRequest.id,
                      draftStatus,
                      draftAdminNotes
                    )
                  }
                  disabled={isSavingStatus}
                >
                  {isSavingStatus ? "Saving..." : "Save Status & Notes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
