"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FolderTree,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Sparkles,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  SlidersHorizontal,
  Layers,
  ArrowUpDown,
  Tag,
} from "lucide-react";
import {
  IGlobalCategory,
  getGlobalCategories,
  createGlobalCategory,
  updateGlobalCategory,
  deleteGlobalCategory,
} from "@/lib/api/category";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

const POPULAR_EMOJIS = [
  "🍕", "🍔", "🍛", "🍝", "🍖", "🍰", "🥤", "🍣", "🍲", "🌿", "🥗", "🥣", "🍿", "🐟", "🌮", "☕", "🍦", "🥞", "🍗", "🥩", "📦"
];

export default function AdminCategories() {
  const [categories, setCategories] = useState<IGlobalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<IGlobalCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<IGlobalCategory | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    emoji: "🍕",
    description: "",
    displayOrder: 1,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Categories
  const fetchCategoriesData = useCallback(async () => {
    try {
      const res = await getGlobalCategories(true); // Fetch all including inactive for admin
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load global categories.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategoriesData();
  }, [fetchCategoriesData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCategoriesData();
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: "",
      emoji: "🍕",
      description: "",
      displayOrder: (categories.length || 0) + 1,
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cat: IGlobalCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || "",
      emoji: cat.emoji || "🏷️",
      description: cat.description || "",
      displayOrder: cat.displayOrder || 1,
      isActive: cat.isActive ?? true,
    });
  };

  // Handle Create / Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("error", "Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createGlobalCategory({
        name: formData.name.trim(),
        emoji: formData.emoji.trim() || "🏷️",
        description: formData.description.trim(),
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive,
      });

      if (res.success && res.data) {
        showToast("success", res.message || `Category "${res.data.name}" created successfully!`);
        setIsAddModalOpen(false);
        fetchCategoriesData();
      } else {
        showToast("error", res.message || "Failed to create category.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?._id) return;

    if (!formData.name.trim()) {
      showToast("error", "Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateGlobalCategory(editingCategory._id, {
        name: formData.name.trim(),
        emoji: formData.emoji.trim() || "🏷️",
        description: formData.description.trim(),
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive,
      });

      if (res.success && res.data) {
        showToast("success", res.message || `Category "${res.data.name}" updated successfully!`);
        setEditingCategory(null);
        fetchCategoriesData();
      } else {
        showToast("error", res.message || "Failed to update category.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (cat: IGlobalCategory) => {
    if (!cat._id) return;
    const newStatus = !cat.isActive;

    // Optimistic Update
    setCategories((prev) =>
      prev.map((c) => (c._id === cat._id ? { ...c, isActive: newStatus } : c))
    );

    try {
      const res = await updateGlobalCategory(cat._id, { isActive: newStatus });
      if (res.success) {
        showToast(
          "success",
          `Category "${cat.name}" is now ${newStatus ? "Active" : "Inactive"}.`
        );
      } else {
        fetchCategoriesData(); // revert
        showToast("error", res.message || "Failed to update status.");
      }
    } catch {
      fetchCategoriesData(); // revert
      showToast("error", "Failed to update status.");
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingCategory?._id) return;
    setSubmitting(true);

    try {
      const res = await deleteGlobalCategory(deletingCategory._id);
      if (res.success) {
        showToast("success", `Category "${deletingCategory.name}" has been deleted.`);
        setDeletingCategory(null);
        fetchCategoriesData();
      } else {
        showToast("error", res.message || "Failed to delete category.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "An error occurred while deleting.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter categories for view
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? cat.isActive
          : !cat.isActive;

    return matchesSearch && matchesStatus;
  });

  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.isActive).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 space-y-6">

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-3 transition-all animate-bounce ${toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-bold">{toast.text}</span>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white p-7 sm:p-9 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Admin Global Category Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Manage Food Categories
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm max-w-2xl">
              Control the global categories available to restaurant owners, home page explore section, and dish filter sidebars.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#FF6B35] font-extrabold text-sm shadow-lg shadow-black/10 hover:bg-orange-50 transition cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Add Global Category</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Categories</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{totalCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B35]">
            <FolderTree className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Categories</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inactive Categories</p>
            <h3 className="text-2xl font-black text-rose-500 mt-1">{inactiveCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Control Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search global category name or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${statusFilter === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${statusFilter === "active" ? "bg-white text-emerald-600 shadow-xs" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${statusFilter === "inactive" ? "bg-white text-rose-500 shadow-xs" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-[#FF6B35] transition cursor-pointer disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* CATEGORY GRID */}
      {loading ? (
        <div className="flex items-center justify-center py-28 bg-white rounded-3xl border border-gray-100">
          <LoadingSpinner size={50} color="#f97316" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 text-center p-6">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B35] mb-3">
            <FolderTree className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No categories found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            No global category matches your filter or search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.map((cat) => (
            <div
              key={cat._id}
              className={`group relative bg-white rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between ${cat.isActive
                  ? "border-gray-200/90 hover:border-orange-300"
                  : "border-gray-200 bg-gray-50/60 opacity-80"
                }`}
            >
              <div>
                {/* Header: Emoji Badge + Actions */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/60 border border-orange-100 flex items-center justify-center text-2xl shadow-xs group-hover:scale-105 transition-transform">
                      {cat.emoji || "🏷️"}
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] font-semibold text-gray-400 block font-mono">
                        slug: /{cat.slug}
                      </span>
                    </div>
                  </div>

                  {/* Active Badge & Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${cat.isActive
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                      }`}
                    title="Click to toggle active status"
                  >
                    {cat.isActive ? "● Active" : "○ Inactive"}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed min-h-[36px]">
                  {cat.description || "No description provided."}
                </p>
              </div>

              {/* Card Footer: Display Order + Edit/Delete Buttons */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-gray-400 font-semibold text-[11px]">
                  <ArrowUpDown className="w-3.5 h-3.5 text-orange-400" />
                  Order: #{cat.displayOrder ?? 0}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="p-2 rounded-xl bg-orange-50 text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white transition-all cursor-pointer"
                    title="Edit Category"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingCategory(cat)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 🌟 ADD NEW CATEGORY MODAL                                            */}
      {/* ==================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5" />
                <h2 className="text-base font-extrabold">Add New Global Category</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {/* Category Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Mexican Tacos, Sea Food, Waffles..."
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none transition"
                />
              </div>

              {/* Emoji Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Icon / Emoji Symbol <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={formData.emoji}
                    onChange={(e) => setFormData((p) => ({ ...p, emoji: e.target.value }))}
                    className="w-16 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-center text-xl font-bold focus:bg-white focus:border-[#FF6B35] outline-none"
                  />
                  <div className="flex-1 flex items-center gap-1.5 overflow-x-auto p-1.5 bg-gray-50 rounded-xl border border-gray-100 max-h-12">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, emoji }))}
                        className={`text-base p-1 rounded-lg transition hover:bg-white hover:scale-110 cursor-pointer ${formData.emoji === emoji ? "bg-white shadow-xs border border-orange-300" : ""
                          }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Category Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief summary describing food items under this category..."
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none transition resize-none"
                />
              </div>

              {/* Display Order & Active Toggle */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Display Priority Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData((p) => ({ ...p, displayOrder: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Initial Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, isActive: !p.isActive }))}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${formData.isActive
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                      }`}
                  >
                    {formData.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>{formData.isActive ? "Active (Visible)" : "Inactive (Hidden)"}</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:bg-[#e85b27] transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 🌟 EDIT CATEGORY MODAL                                               */}
      {/* ==================================================================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                <h2 className="text-base font-extrabold">Edit Global Category</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Icon / Emoji Symbol <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={formData.emoji}
                    onChange={(e) => setFormData((p) => ({ ...p, emoji: e.target.value }))}
                    className="w-16 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-center text-xl font-bold focus:bg-white focus:border-[#FF6B35] outline-none"
                  />
                  <div className="flex-1 flex items-center gap-1.5 overflow-x-auto p-1.5 bg-gray-50 rounded-xl border border-gray-100 max-h-12">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, emoji }))}
                        className={`text-base p-1 rounded-lg transition hover:bg-white hover:scale-110 cursor-pointer ${formData.emoji === emoji ? "bg-white shadow-xs border border-orange-300" : ""
                          }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Display Priority Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData((p) => ({ ...p, displayOrder: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Category Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, isActive: !p.isActive }))}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${formData.isActive
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                      }`}
                  >
                    {formData.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>{formData.isActive ? "Active (Visible)" : "Inactive (Hidden)"}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:bg-[#e85b27] transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 🌟 DELETE CONFIRMATION MODAL                                         */}
      {/* ==================================================================== */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-md p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900">
                Delete "{deletingCategory.name}"?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to permanently delete this global category? Dishes associated with this category will remain intact.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:bg-rose-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
