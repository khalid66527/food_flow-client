"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowDownRight,
  ShieldCheck,
  Building2,
  Bike,
  Receipt,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  X,
  RotateCcw,
  Loader2,
} from "lucide-react";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { refundOrderApi } from "@/lib/api/order";
import { useSession } from "@/lib/auth-client";

interface Transaction {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  vatAmount: number;
  discount: number;
  adminNetProfit: number;
  restaurantPayout: number;
  riderPayout: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  transactionId: string;
  refundInfo?: {

    refundId: string;
    amount: number;
    reason?: string;
    refundedAt: string;
    status: string;
    refundedBy?: string;
  };
  createdAt: string;
}

interface TransactionStats {
  totalGrossVolume: number;
  totalAdminProfit: number;
  totalRestaurantPayout: number;
  totalRiderPayout: number;
  totalTaxFundVat: number;
  totalRefundedAmount: number;
  totalOrdersCount: number;
  paidCount: number;
  pendingCount: number;
  refundedCount: number;
  codCount: number;
  stripeCount: number;
  mobileWalletCount: number;
}

export default function AdminTransactions() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Refund Modal State
  const [selectedTxForRefund, setSelectedTxForRefund] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>("");
  const [isProcessingRefund, setIsProcessingRefund] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState<string | null>(null);

  // Details Modal
  const [selectedTxForDetails, setSelectedTxForDetails] = useState<Transaction | null>(null);

  const fetchTransactions = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const query = new URLSearchParams();
      if (searchQuery) query.set("search", searchQuery);
      if (methodFilter !== "ALL") query.set("method", methodFilter);
      if (statusFilter !== "ALL") query.set("status", statusFilter);

      const res = await fetch(`/api/admin/transactions?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        setTransactions(data.transactions || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [methodFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Refund Submit
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxForRefund) return;

    setIsProcessingRefund(true);
    setRefundError(null);
    setRefundSuccessMsg(null);

    const res = await refundOrderApi(
      selectedTxForRefund.orderId,
      {
        amount: Number(refundAmount),
        reason: refundReason || "Administrator issued refund",
        markAsCancelled: true,
      },
      session?.user?.id,
      session?.user?.email
    );

    setIsProcessingRefund(false);

    if (res.success) {
      setRefundSuccessMsg(res.message || "Refund processed successfully!");
      setTimeout(() => {
        setSelectedTxForRefund(null);
        setRefundSuccessMsg(null);
        fetchTransactions(true);
      }, 1500);
    } else {
      setRefundError(res.message || "Failed to process refund.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    const headers = [
      "Order ID",
      "Transaction ID",
      "Customer Name",
      "Customer Email",
      "Date",
      "Payment Method",
      "Payment Status",
      "Order Status",
      "Total Amount (৳)",
      "Subtotal (৳)",
      "VAT (৳)",
      "Admin Profit (৳)",
      "Restaurant Payout (৳)",
      "Rider Payout (৳)",
      "Refund Status",
    ];

    const rows = transactions.map((t) => [
      t.orderId,
      t.transactionId,
      `"${t.userName}"`,
      t.userEmail,
      new Date(t.createdAt).toLocaleString(),
      t.paymentMethod,
      t.paymentStatus,
      t.orderStatus,
      t.totalAmount.toFixed(2),
      t.subtotal.toFixed(2),
      t.vatAmount.toFixed(2),
      t.adminNetProfit.toFixed(2),
      t.restaurantPayout.toFixed(2),
      t.riderPayout.toFixed(2),
      t.refundInfo ? `Refunded: ৳${t.refundInfo.amount.toFixed(2)}` : "None",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FoodFlow_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMethodBadge = (method: string) => {
    switch (method?.toUpperCase()) {
      case "STRIPE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3 h-3" /> Stripe Card
          </span>
        );
      case "COD":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Cash on Delivery
          </span>
        );
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case "refunded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
            <RotateCcw className="w-3 h-3 text-amber-700" /> Refunded
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  if (loading && !stats) {
    return <LoadingSpinner size={45} minHeight="60vh" />;
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-[#FF6B35] to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-xs font-bold uppercase tracking-wider text-white mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Financial Hub &amp; Settlements
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Payment Transactions &amp; Refunds
            </h1>
            <p className="text-orange-50 text-sm mt-1 max-w-xl font-medium">
              Real-time audit log of all online payments (Stripe &amp; Mobile Wallets), COD collections, automated refund dispatches, and platform commission shares.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchTransactions(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition backdrop-blur-md border border-white/30 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh Log</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-orange-50 text-[#FF6B35] hover:text-[#e85b27] text-xs font-black shadow-lg shadow-black/10 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📊 KPI Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Gross Revenue */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-orange-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Volume</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900 mt-2">
              ৳{stats.totalGrossVolume.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span>{stats.paidCount} Paid Orders</span>
              <span className="text-emerald-600 font-bold">Live Flow</span>
            </div>
          </div>

          {/* Admin Net Commission */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-orange-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Net Profit</span>
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900 mt-2">
              ৳{stats.totalAdminProfit.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span>Net Platform Cut</span>
              <span className="text-[#FF6B35] font-bold">~15% Margin</span>
            </div>
          </div>

          {/* Restaurant & Rider Payouts */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-orange-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor &amp; Rider Share</span>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900 mt-2">
              ৳{(stats.totalRestaurantPayout + stats.totalRiderPayout).toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span>Rest: ৳{stats.totalRestaurantPayout.toLocaleString()}</span>
              <span>Rider: ৳{stats.totalRiderPayout.toLocaleString()}</span>
            </div>
          </div>

          {/* Total Refunds */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Refunded</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900 mt-2">
              ৳{stats.totalRefundedAmount.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span>{stats.refundedCount} Orders Refunded</span>
              <span className="text-amber-700 font-bold">Automated</span>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 Search & Filter Bar */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID, Transaction ID, Customer Name, or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] bg-gray-50/50"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Method Filter */}
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
              <span className="text-xs font-bold text-gray-500 hidden sm:inline">Method:</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2.5 text-xs rounded-2xl border border-gray-200 bg-white font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] cursor-pointer"
              >
                <option value="ALL">All Methods</option>
                <option value="STRIPE">Stripe Card</option>
                <option value="COD">Cash on Delivery</option>
              </select>

            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
              <span className="text-xs font-bold text-gray-500 hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 text-xs rounded-2xl border border-gray-200 bg-white font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="REFUNDED">Refunded</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 Transactions Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              Audit Logs ({transactions.length})
            </h2>
            <p className="text-xs text-gray-400">Complete transaction histories across platform channels</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-gray-800">No Transactions Found</h3>
            <p className="text-xs text-gray-400 mt-1">Try changing your search keywords or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Order Reference</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Gross Amount</th>
                  <th className="py-3.5 px-4">Admin Net</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {transactions.map((tx) => (
                  <tr key={tx.id || tx.orderId} className="hover:bg-gray-50/50 transition">
                    <td className="py-4 px-5">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-gray-900 block font-mono">
                          #{tx.orderId}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {new Date(tx.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono block truncate max-w-[130px]">
                          Trx: {tx.transactionId}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-gray-900 flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          {tx.userName}
                        </p>
                        <p className="text-[11px] text-gray-400">{tx.userEmail}</p>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {getMethodBadge(tx.paymentMethod)}
                    </td>


                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className="font-black text-gray-900 text-sm block">
                          ৳{tx.totalAmount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Sub: ৳{tx.subtotal.toFixed(2)} | Fee: ৳{tx.deliveryFee.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-emerald-700 block">
                          +৳{tx.adminNetProfit.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Rest: ৳{tx.restaurantPayout.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {getStatusBadge(tx.paymentStatus)}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tx.paymentStatus === "Paid" && (
                          <button
                            onClick={() => {
                              setSelectedTxForRefund(tx);
                              setRefundAmount(tx.totalAmount);
                              setRefundReason("Order cancellation & refund by administrator");
                              setRefundError(null);
                              setRefundSuccessMsg(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200/80 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            Refund
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedTxForDetails(tx)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔴 REFUND MODAL */}
      {selectedTxForRefund && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Process Refund</h3>
                  <p className="text-xs text-gray-400">Order #{selectedTxForRefund.orderId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxForRefund(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-amber-900">
                <span>Customer:</span>
                <span>{selectedTxForRefund.userName}</span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span>Payment Method:</span>
                <span>{selectedTxForRefund.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-extrabold text-amber-950 pt-1 border-t border-amber-200">
                <span>Original Total:</span>
                <span>৳{selectedTxForRefund.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {refundError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{refundError}</span>
              </div>
            )}

            {refundSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{refundSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Refund Amount (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedTxForRefund.totalAmount}
                  min="1"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Reason for Refund
                </label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Order cancelled upon customer request / Out of stock item"
                  className="w-full px-4 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxForRefund(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-md transition disabled:opacity-50"
                >
                  {isProcessingRefund ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Confirm &amp; Execute Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📄 TRANSACTION DETAILS MODAL */}
      {selectedTxForDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Transaction Breakdown</h3>
                  <p className="text-xs text-gray-400 font-mono">#{selectedTxForDetails.orderId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxForDetails(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs divide-y divide-gray-100">
              <div className="pt-2 flex justify-between text-gray-600">
                <span>Customer:</span>
                <span className="font-bold text-gray-900">{selectedTxForDetails.userName} ({selectedTxForDetails.userEmail})</span>
              </div>
              <div className="pt-2 flex justify-between text-gray-600">
                <span>Payment Gateway:</span>
                <span className="font-bold text-gray-900">{selectedTxForDetails.paymentMethod}</span>
              </div>
              <div className="pt-2 flex justify-between text-gray-600">
                <span>Transaction Ref ID:</span>
                <span className="font-mono text-gray-800 select-all font-bold">{selectedTxForDetails.transactionId}</span>
              </div>
              <div className="pt-2 flex justify-between text-gray-600">
                <span>Order Status:</span>
                <span className="font-bold text-gray-900">{selectedTxForDetails.orderStatus}</span>
              </div>
              <div className="pt-2 flex justify-between text-gray-600">
                <span>Food Items Subtotal:</span>
                <span className="font-bold text-gray-900">৳{selectedTxForDetails.subtotal.toFixed(2)}</span>
              </div>
              <div className="pt-2 flex justify-between text-gray-600">
                <span>Government VAT (5%):</span>
                <span className="font-bold text-gray-900">৳{selectedTxForDetails.vatAmount.toFixed(2)}</span>
              </div>
              <div className="pt-2 flex justify-between text-gray-600">
                <span>Delivery Fee:</span>
                <span className="font-bold text-gray-900">৳{selectedTxForDetails.deliveryFee.toFixed(2)}</span>
              </div>
              {selectedTxForDetails.discount > 0 && (
                <div className="pt-2 flex justify-between text-emerald-700">
                  <span>Applied Discount / Coupon:</span>
                  <span className="font-bold">-৳{selectedTxForDetails.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 flex justify-between text-sm font-black text-gray-900 border-t-2 border-gray-200">
                <span>Grand Total Paid:</span>
                <span className="text-[#FF6B35]">৳{selectedTxForDetails.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Split Breakdown */}
            <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-1.5 border border-gray-200/80">
              <span className="font-bold text-gray-700 block mb-1 text-[11px] uppercase tracking-wider">Settlement Split:</span>
              <div className="flex justify-between text-gray-600">
                <span>Platform Net Commission:</span>
                <span className="font-bold text-emerald-700">৳{selectedTxForDetails.adminNetProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Restaurant Earnings:</span>
                <span className="font-bold text-blue-700">৳{selectedTxForDetails.restaurantPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Rider Delivery Payout:</span>
                <span className="font-bold text-purple-700">৳{selectedTxForDetails.riderPayout.toFixed(2)}</span>
              </div>
            </div>

            {selectedTxForDetails.refundInfo && (
              <div className="bg-amber-50 rounded-2xl p-4 text-xs space-y-1 border border-amber-200">
                <span className="font-extrabold text-amber-900 block">Refund Issued:</span>
                <p className="text-amber-800">Refund ID: <span className="font-mono">{selectedTxForDetails.refundInfo.refundId}</span></p>
                <p className="text-amber-800">Amount: <strong>৳{selectedTxForDetails.refundInfo.amount.toFixed(2)}</strong></p>
                <p className="text-amber-700 text-[11px]">Reason: {selectedTxForDetails.refundInfo.reason || "N/A"}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTxForDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
