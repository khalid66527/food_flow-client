"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  Sparkles,
  User,
  Phone,
  HelpCircle,
  Building2,
  Bike,
  Check,
  X,
  Reply,
  AlertCircle,
  Inbox,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  IContactMessage,
  IContactStats,
  TContactStatus,
  getContactMessages,
  getContactStats,
} from "@/lib/api/contact";
import {
  replyToContactMessageAction,
  updateContactStatusAction,
  deleteContactMessageAction,
} from "@/lib/actions/contact";
import { useSession } from "@/lib/auth-client";

type TTabFilter = "all" | "pending" | "in-progress" | "replied" | "resolved";

export default function AdminContactMessages() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<IContactMessage[]>([]);
  const [stats, setStats] = useState<IContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<TTabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Active Modals
  const [viewMessage, setViewMessage] = useState<IContactMessage | null>(null);
  const [replyMessage, setReplyMessage] = useState<IContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<IContactMessage | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      const [msgRes, statsRes] = await Promise.all([
        getContactMessages({
          status: activeTab === "all" ? undefined : activeTab,
          category: categoryFilter === "all" ? undefined : categoryFilter,
          search: searchQuery,
          limit: 100,
        }),
        getContactStats(),
      ]);

      if (msgRes.success && msgRes.data) {
        setMessages(msgRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Error loading contact messages:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, categoryFilter, searchQuery]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Handle Send Email Reply
  const handleSendReply = async () => {
    if (!replyMessage || !replyText.trim()) {
      showToast("error", "Please write a response message before sending.");
      return;
    }

    setIsSendingReply(true);
    try {
      const res = await replyToContactMessageAction({
        messageId: replyMessage._id,
        toEmail: replyMessage.email,
        recipientName: replyMessage.name,
        ticketId: replyMessage.ticketId,
        subject: replyMessage.subject,
        replyText: replyText.trim(),
        adminName: session?.user?.name || "Food Flow Support Team",
        adminEmail: session?.user?.email || "support.foodflow@gmail.com",
      });

      if (res.success) {
        showToast("success", `Email response successfully sent to ${replyMessage.email}!`);
        setReplyMessage(null);
        setReplyText("");
        fetchData();
      } else {
        showToast("error", res.message || "Failed to send email reply.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error sending email reply.");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Handle Status Update
  const handleStatusUpdate = async (id: string, newStatus: TContactStatus) => {
    setActionLoadingId(id);
    try {
      const res = await updateContactStatusAction(id, newStatus);
      if (res.success) {
        showToast("success", `Status updated to ${newStatus}`);
        setMessages((prev) =>
          prev.map((msg) => (msg._id === id ? { ...msg, status: newStatus } : msg))
        );
        if (viewMessage && viewMessage._id === id) {
          setViewMessage({ ...viewMessage, status: newStatus });
        }
      } else {
        showToast("error", res.message || "Failed to update status.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error updating status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setActionLoadingId(deleteConfirm._id);
    try {
      const res = await deleteContactMessageAction(deleteConfirm._id);
      if (res.success) {
        showToast("success", "Message deleted successfully.");
        setMessages((prev) => prev.filter((m) => m._id !== deleteConfirm._id));
        setDeleteConfirm(null);
        if (viewMessage && viewMessage._id === deleteConfirm._id) {
          setViewMessage(null);
        }
      } else {
        showToast("error", res.message || "Failed to delete message.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error deleting message.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: TContactStatus) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending Review",
          color: "bg-amber-50 text-amber-700 border-amber-200/80",
          dot: "bg-amber-500",
        };
      case "in-progress":
        return {
          label: "In Progress",
          color: "bg-blue-50 text-blue-700 border-blue-200/80",
          dot: "bg-blue-500",
        };
      case "replied":
        return {
          label: "Replied via Email",
          color: "bg-purple-50 text-purple-700 border-purple-200/80",
          dot: "bg-purple-500",
        };
      case "resolved":
        return {
          label: "Resolved",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          dot: "bg-emerald-500",
        };
      default:
        return {
          label: status,
          color: "bg-gray-50 text-gray-700 border-gray-200/80",
          dot: "bg-gray-400",
        };
    }
  };

  // Category Icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Restaurant":
        return <Building2 className="w-3.5 h-3.5 text-orange-500" />;
      case "Delivery Partner":
        return <Bike className="w-3.5 h-3.5 text-blue-500" />;
      case "Customer":
        return <User className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold animate-fade-in-up ${
            toast.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-rose-900 text-white border-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-300" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-[#FF8C42] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Support & Contact Inquiries
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            View inquiries submitted from the Contact page and respond directly via email.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#FF6B35]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Total Inquiries</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">
            {stats?.total ?? messages.length}
          </p>
          <p className="text-[11px] text-gray-400">All received messages</p>
        </div>

        {/* Pending */}
        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-900">
            {stats?.pending ?? messages.filter((m) => m.status === "pending").length}
          </p>
          <p className="text-[11px] text-amber-600 font-medium">Awaiting first response</p>
        </div>

        {/* Replied */}
        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700">Replied via Email</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Reply className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-900">
            {stats?.replied ?? messages.filter((m) => m.status === "replied").length}
          </p>
          <p className="text-[11px] text-purple-600 font-medium">Responses dispatched</p>
        </div>

        {/* Resolved */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900">
            {stats?.resolved ?? messages.filter((m) => m.status === "resolved").length}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">Closed & complete</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { id: "all", label: "All Inquiries" },
              { id: "pending", label: "Pending" },
              { id: "in-progress", label: "In Progress" },
              { id: "replied", label: "Replied" },
              { id: "resolved", label: "Resolved" },
            ] as { id: TTabFilter; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#FF6B35] text-white shadow-md shadow-orange-500/20"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ticket #, sender name, email, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#FF6B35] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold text-gray-700 focus:outline-none focus:border-[#FF6B35] cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Customer">Customer</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Delivery Partner">Delivery Partner</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages List Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
            <p className="text-xs font-bold text-gray-500 animate-pulse">Loading inquiries...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No Inquiries Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || activeTab !== "all" || categoryFilter !== "all"
                ? "No contact messages matched your search criteria."
                : "No contact messages have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4 sm:px-6">Ticket & Sender</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Subject & Message</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {messages.map((msg) => {
                  const statusStyle = getStatusBadge(msg.status);
                  const isActionLoading = actionLoadingId === msg._id;

                  return (
                    <tr key={msg._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Ticket & Sender */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-[#FF6B35] text-[10px] font-black tracking-wider">
                            #{msg.ticketId}
                          </div>
                          <div className="font-extrabold text-gray-900 text-xs sm:text-sm">
                            {msg.name}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{msg.email}</span>
                          </div>
                          {msg.phone && (
                            <div className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{msg.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold">
                          {getCategoryIcon(msg.category)}
                          <span>{msg.category}</span>
                        </div>
                      </td>

                      {/* Subject & Message Snippet */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-gray-900 line-clamp-1">
                          {msg.subject}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {msg.message}
                        </p>
                        {msg.replies && msg.replies.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 mt-1">
                            <Reply className="w-3 h-3" />
                            {msg.replies.length} reply sent
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusStyle.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          <span>{statusStyle.label}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reply Button */}
                          <button
                            onClick={() => {
                              setReplyMessage(msg);
                              setReplyText(
                                `Hello ${msg.name},\n\nThank you for contacting Food Flow Support regarding "${msg.subject}".\n\n`
                              );
                            }}
                            title="Reply via Email"
                            className="p-2 rounded-xl bg-orange-50 text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white transition-all cursor-pointer"
                          >
                            <Reply className="w-4 h-4" />
                          </button>

                          {/* View Detail */}
                          <button
                            onClick={() => setViewMessage(msg)}
                            title="View Full Message"
                            className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-200 transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirm(msg)}
                            disabled={isActionLoading}
                            title="Delete Inquiry"
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── EMAIL REPLY MODAL ─── */}
      {replyMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Email Direct Reply</h3>
                  <p className="text-xs text-gray-500">
                    To: <strong>{replyMessage.name}</strong> ({replyMessage.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReplyMessage(null);
                  setReplyText("");
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Info Preview */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold">Ticket:</span>
                <span className="font-extrabold text-[#FF6B35]">#{replyMessage.ticketId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold">Subject:</span>
                <span className="font-bold text-gray-800">{replyMessage.subject}</span>
              </div>
              <div className="pt-1 text-gray-600 line-clamp-2 italic">
                &ldquo;{replyMessage.message}&rdquo;
              </div>
            </div>

            {/* Reply Textarea */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Your Email Message to Customer:
              </label>
              <textarea
                rows={6}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your detailed response here..."
                className="w-full p-4 rounded-2xl border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] transition-all"
              />
              <p className="text-[11px] text-gray-400">
                This response will be dispatched directly to <strong>{replyMessage.email}</strong> from <code>support.foodflow@gmail.com</code> and recorded in history.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setReplyMessage(null);
                  setReplyText("");
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={isSendingReply || !replyText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white text-xs font-bold shadow-md shadow-orange-500/25 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSendingReply ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Email Reply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DETAIL VIEW MODAL ─── */}
      {viewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-[#FF6B35] text-xs font-black">
                    #{viewMessage.ticketId}
                  </span>
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                      getStatusBadge(viewMessage.status).color
                    }`}
                  >
                    <span>{getStatusBadge(viewMessage.status).label}</span>
                  </div>
                </div>
                <h3 className="text-xl font-black text-gray-900 mt-1">{viewMessage.subject}</h3>
              </div>
              <button
                onClick={() => setViewMessage(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/80 text-xs">
              <div>
                <span className="text-gray-500 font-bold block">Sender Name:</span>
                <span className="font-extrabold text-gray-900">{viewMessage.name}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold block">Email:</span>
                <a
                  href={`mailto:${viewMessage.email}`}
                  className="font-bold text-[#FF6B35] hover:underline"
                >
                  {viewMessage.email}
                </a>
              </div>
              {viewMessage.phone && (
                <div>
                  <span className="text-gray-500 font-bold block">Phone:</span>
                  <a
                    href={`tel:${viewMessage.phone}`}
                    className="font-bold text-gray-800 hover:underline"
                  >
                    {viewMessage.phone}
                  </a>
                </div>
              )}
              <div>
                <span className="text-gray-500 font-bold block">Category:</span>
                <span className="font-bold text-gray-800">{viewMessage.category}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold block">Submitted On:</span>
                <span className="font-medium text-gray-700">
                  {new Date(viewMessage.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Inquiry Message
              </h4>
              <div className="bg-orange-50/40 border border-orange-100 rounded-2xl p-4 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {viewMessage.message}
              </div>
            </div>

            {/* Reply History */}
            {viewMessage.replies && viewMessage.replies.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Reply className="w-4 h-4" />
                  <span>Admin Responses ({viewMessage.replies.length})</span>
                </h4>
                <div className="space-y-2.5">
                  {viewMessage.replies.map((r, idx) => (
                    <div
                      key={idx}
                      className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-purple-900">{r.repliedBy}</span>
                        <span className="text-purple-600">
                          {new Date(r.repliedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{r.replyMessage}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Status Selector & Reply trigger */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Change Status:</span>
                <select
                  value={viewMessage.status}
                  onChange={(e) =>
                    handleStatusUpdate(viewMessage._id, e.target.value as TContactStatus)
                  }
                  className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
                >
                  <option value="pending">Pending Review</option>
                  <option value="in-progress">In Progress</option>
                  <option value="replied">Replied</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <button
                onClick={() => {
                  const target = viewMessage;
                  setViewMessage(null);
                  setReplyMessage(target);
                  setReplyText(
                    `Hello ${target.name},\n\nThank you for contacting Food Flow Support regarding "${target.subject}".\n\n`
                  );
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:opacity-95 transition-all cursor-pointer"
              >
                <Reply className="w-4 h-4" />
                <span>Write Email Reply</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 space-y-6 text-center animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900">Delete Contact Inquiry?</h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to permanently delete ticket <strong>#{deleteConfirm.ticketId}</strong> from <strong>{deleteConfirm.name}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:bg-rose-700 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
