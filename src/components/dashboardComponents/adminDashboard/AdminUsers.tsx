"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  Store,
  Bike,
  ShieldCheck,
  User,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Star,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Check,
  Info,
} from "lucide-react";
import {
  IUser,
  IUserStats,
  IRestaurantSnippet,
  getAllUsers,
  getUserRestaurantDetails,
} from "@/lib/api/user";
import {
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from "@/lib/actions/user";
import LoadingSpinner from "@/components/LoadingSpinner";

type TCategoryTab = "all" | "restaurant" | "customer" | "rider" | "admin";

export default function AdminUsers() {
  // State management
  const [users, setUsers] = useState<IUser[]>([]);
  const [stats, setStats] = useState<IUserStats>({
    totalUsers: 0,
    customers: 0,
    restaurants: 0,
    riders: 0,
    admins: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TCategoryTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Role dropdown state
  const [openRoleDropdownId, setOpenRoleDropdownId] = useState<string | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);

  // Action states
  const [newRole, setNewRole] = useState<string>("Customer");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [modalRestaurantDetails, setModalRestaurantDetails] =
    useState<IRestaurantSnippet | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(false);

  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".role-dropdown-container")) {
        setOpenRoleDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Notification toast state
  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 3500);
  };

  // Helper to format role safely
  const formatRole = (rawRole?: any): string => {
    if (!rawRole) return "Customer";
    const str = String(rawRole).trim();
    if (/^(admin|super-admin|super_admin)/i.test(str)) return "Admin";
    if (/^(restaurant|restaurant partner|restaurant_partner|vendor)/i.test(str)) return "Restaurant";
    if (/^(rider|delivery partner|delivery_partner|delivery|driver)/i.test(str)) return "Rider";
    if (/^(customer|user|client)/i.test(str)) return "Customer";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Fetch users function
  const fetchUsersData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAllUsers({
        role: activeTab === "all" ? undefined : activeTab,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchTerm.trim() || undefined,
        page: currentPage,
        limit: pageSize,
      });

      if (response.success && Array.isArray(response.data)) {
        setUsers(response.data);
        if (response.meta) {
          setTotalPages(response.meta.totalPages || 1);
          setTotalCount(response.meta.total || 0);
          if (response.meta.stats) {
            setStats(response.meta.stats);
          }
        }
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      console.error("Failed to load users:", err);
      showToast("error", "Failed to fetch users. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, statusFilter, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  // Handle Tab change
  const handleTabChange = (tab: TCategoryTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // View user details & fetch restaurant if applicable
  const handleOpenViewModal = async (user: IUser) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
    setModalRestaurantDetails(user.restaurant || null);

    const isRestaurant =
      formatRole(user.role) === "Restaurant" || Boolean(user.restaurant);

    if (isRestaurant && (!user.restaurant || !user.restaurant.address)) {
      setIsLoadingRestaurant(true);
      try {
        const res = await getUserRestaurantDetails(user.email || user._id);
        if (res.success && res.data) {
          setModalRestaurantDetails(res.data);
        }
      } catch (e) {
        console.error("Error fetching restaurant details for modal:", e);
      } finally {
        setIsLoadingRestaurant(false);
      }
    }
  };

  // Open role change modal
  const handleOpenRoleModal = (user: IUser) => {
    setSelectedUser(user);
    setNewRole(formatRole(user.role));
    setIsRoleModalOpen(true);
  };

  // Open delete modal
  const handleOpenDeleteModal = (user: IUser) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Execute Role Update
  const handleConfirmRoleUpdate = async () => {
    if (!selectedUser || !newRole) return;
    setIsActionLoading(true);
    try {
      const res = await updateUserRole(selectedUser._id, newRole);
      if (res.success) {
        // Optimistically update locally
        setUsers((prev) =>
          prev.map((u) =>
            u._id === selectedUser._id ? { ...u, role: newRole } : u
          )
        );
        showToast("success", `Role successfully updated to "${newRole}" for ${selectedUser.name}!`);
        setIsRoleModalOpen(false);
        fetchUsersData();
      } else {
        showToast("error", res.message || "Failed to update user role.");
      }
    } catch (err: any) {
      showToast("error", err.message || "An error occurred while updating role.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Execute Status Toggle (Active / Blocked)
  const handleToggleStatus = async (user: IUser) => {
    const currentStatus = user.status || "active";
    const nextStatus = currentStatus === "active" ? "blocked" : "active";
    try {
      const res = await updateUserStatus(user._id, nextStatus);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === user._id ? { ...u, status: nextStatus } : u
          )
        );
        showToast(
          "success",
          `User is now ${nextStatus === "active" ? "Active" : "Blocked"}`
        );
        fetchUsersData();
      } else {
        showToast("error", res.message || "Failed to update status.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to update status.");
    }
  };

  // Execute Delete User
  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      const res = await deleteUser(selectedUser._id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));
        showToast("success", `User ${selectedUser.name} deleted successfully.`);
        setIsDeleteModalOpen(false);
        fetchUsersData();
      } else {
        showToast("error", res.message || "Failed to delete user.");
      }
    } catch (err: any) {
      showToast("error", err.message || "An error occurred while deleting user.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Execute Direct Role Update from dropdown
  const handleSelectRole = async (user: IUser, targetRole: string) => {
    if (formatRole(user.role).toLowerCase() === formatRole(targetRole).toLowerCase()) {
      setOpenRoleDropdownId(null);
      return;
    }
    setOpenRoleDropdownId(null);
    setUpdatingRoleUserId(user._id);
    try {
      const res = await updateUserRole(user._id, targetRole);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, role: targetRole } : u))
        );
        showToast("success", `Role updated to "${targetRole}" for ${user.name}!`);
        fetchUsersData();
      } else {
        showToast("error", res.message || "Failed to update user role.");
      }
    } catch (err: any) {
      showToast("error", err.message || "An error occurred while updating role.");
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  // Role pill badge renderer (for view modal static preview)
  const renderRoleBadge = (roleStr?: any) => {
    const role = formatRole(roleStr);
    if (role === "Admin") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
          Admin
        </span>
      );
    }
    if (role === "Restaurant") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Store className="w-3.5 h-3.5 text-amber-600" />
          Restaurant
        </span>
      );
    }
    if (role === "Rider") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Bike className="w-3.5 h-3.5 text-blue-600" />
          Rider
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <User className="w-3.5 h-3.5 text-emerald-600" />
        Customer
      </span>
    );
  };

  // Interactive Role Dropdown Menu for table column
  const renderRoleDropdown = (user: IUser) => {
    const role = formatRole(user.role);
    const isOpen = openRoleDropdownId === user._id;
    const isUpdating = updatingRoleUserId === user._id;

    let badgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70";
    let icon = <User className="w-3.5 h-3.5 text-emerald-600" />;

    if (role === "Admin") {
      badgeClasses = "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/70";
      icon = <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />;
    } else if (role === "Restaurant") {
      badgeClasses = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70";
      icon = <Store className="w-3.5 h-3.5 text-amber-600" />;
    } else if (role === "Rider") {
      badgeClasses = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70";
      icon = <Bike className="w-3.5 h-3.5 text-blue-600" />;
    }

    const availableRoles = [
      {
        id: "Customer",
        name: "Customer",
        icon: User,
        color: "text-emerald-600",
        bg: "hover:bg-emerald-50 text-emerald-700",
      },
      {
        id: "Restaurant Partner",
        name: "Restaurant Partner",
        icon: Store,
        color: "text-amber-600",
        bg: "hover:bg-amber-50 text-amber-700",
      },
      {
        id: "Delivery Partner",
        name: "Delivery Partner (Rider)",
        icon: Bike,
        color: "text-blue-600",
        bg: "hover:bg-blue-50 text-blue-700",
      },
      {
        id: "Admin",
        name: "Admin",
        icon: ShieldCheck,
        color: "text-purple-600",
        bg: "hover:bg-purple-50 text-purple-700",
      },
    ];

    return (
      <div className="relative inline-block text-left role-dropdown-container">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenRoleDropdownId(isOpen ? null : user._id);
          }}
          disabled={isUpdating}
          title="Click to change role"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer shadow-2xs ${badgeClasses} ${
            isOpen ? "ring-2 ring-orange-400 ring-offset-1" : ""
          }`}
        >
          {isUpdating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-500" />
          ) : (
            icon
          )}
          <span>{role}</span>
          <ChevronDown
            className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-gray-600" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 mt-1.5 w-52 rounded-2xl bg-white shadow-xl border border-gray-100 py-1.5 z-40 animate-fadeIn divide-y divide-gray-50"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Change Role
            </div>
            <div className="p-1 space-y-0.5">
              {availableRoles.map((roleOpt) => {
                const RoleIcon = roleOpt.icon;
                const isCurrent =
                  formatRole(user.role).toLowerCase() ===
                  formatRole(roleOpt.id).toLowerCase();

                return (
                  <button
                    key={roleOpt.id}
                    type="button"
                    onClick={() => handleSelectRole(user, roleOpt.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isCurrent
                        ? "bg-gray-100/90 text-gray-900 font-bold"
                        : `text-gray-700 ${roleOpt.bg}`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RoleIcon className={`w-4 h-4 ${roleOpt.color}`} />
                      <span>{roleOpt.name}</span>
                    </div>
                    {isCurrent && (
                      <Check className="w-3.5 h-3.5 text-[#FF6B35] font-bold" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Status pill badge renderer
  const renderStatusBadge = (statusStr?: string) => {
    const status = (statusStr || "active").toLowerCase();
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        Blocked
      </span>
    );
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-medium ${
              toast.type === "success"
                ? "bg-white border-emerald-200 text-emerald-800 shadow-emerald-500/10"
                : "bg-white border-rose-200 text-rose-800 shadow-rose-500/10"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Banner - Clean White Aesthetic */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold mb-2.5 border border-orange-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Admin Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              User Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              View, filter, and manage all registered users, roles, and restaurant accounts.
            </p>
          </div>
          <button
            onClick={() => fetchUsersData()}
            disabled={isLoading}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF6B35] hover:bg-[#e85a27] text-white text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards - Clean White Theme */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div
          onClick={() => handleTabChange("all")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
            activeTab === "all"
              ? "bg-white border-[#FF6B35] shadow-md ring-2 ring-orange-500/20"
              : "bg-white border-gray-100 hover:border-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Users
            </span>
            <div className="p-2.5 rounded-xl bg-orange-50 text-[#FF6B35]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">
            {stats.totalUsers.toLocaleString()}
          </div>
        </div>

        {/* Restaurants */}
        <div
          onClick={() => handleTabChange("restaurant")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
            activeTab === "restaurant"
              ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20"
              : "bg-white border-gray-100 hover:border-amber-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Restaurants
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {stats.restaurants.toLocaleString()}
          </div>
        </div>

        {/* Customers */}
        <div
          onClick={() => handleTabChange("customer")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
            activeTab === "customer"
              ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
              : "bg-white border-gray-100 hover:border-emerald-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Customers
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {stats.customers.toLocaleString()}
          </div>
        </div>

        {/* Riders */}
        <div
          onClick={() => handleTabChange("rider")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
            activeTab === "rider"
              ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20"
              : "bg-white border-gray-100 hover:border-blue-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Riders
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">
            {stats.riders.toLocaleString()}
          </div>
        </div>

        {/* Admins */}
        <div
          onClick={() => handleTabChange("admin")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 col-span-2 sm:col-span-1 ${
            activeTab === "admin"
              ? "bg-white border-purple-500 shadow-md ring-2 ring-purple-500/20"
              : "bg-white border-gray-100 hover:border-purple-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Admins
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 mt-2">
            {stats.admins.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Controls Bar: Category Tabs, Search & Status Filter */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "All Users", icon: Users, count: stats.totalUsers },
            {
              id: "restaurant",
              label: "Restaurants",
              icon: Store,
              count: stats.restaurants,
            },
            {
              id: "customer",
              label: "Customers",
              icon: User,
              count: stats.customers,
            },
            { id: "rider", label: "Riders", icon: Bike, count: stats.riders },
            {
              id: "admin",
              label: "Admins",
              icon: ShieldCheck,
              count: stats.admins,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TCategoryTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#FF6B35] text-white shadow-md shadow-orange-500/20"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-gray-200/80 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search and Status Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, or phone number..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center flex items-center justify-center">
            <LoadingSpinner size={50} color="#f97316" message="Loading users list..." />
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="inline-block p-4 rounded-2xl bg-gray-50 text-gray-400 border border-gray-100">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-base font-bold text-gray-800">
              No users found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No matching records found for your search or category filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-4 px-6">User Profile</th>
                  <th className="py-4 px-4">Contact</th>
                  <th className="py-4 px-4">Joined</th>
                  <th className="py-4 px-4">Restaurant</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Role</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {users.map((user) => {
                  const currentRole = formatRole(user.role);
                  const isRestaurant =
                    currentRole === "Restaurant" || Boolean(user.restaurant);

                  return (
                    <tr
                      key={user._id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-50 flex items-center justify-center font-bold text-orange-600 border border-orange-100 flex-shrink-0">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              <span>{user.name || "Unnamed User"}</span>
                              {user.emailVerified && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline-block" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4">
                        <div className="text-xs text-gray-600 font-medium">
                          {user.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {user.phone}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Not set</span>
                          )}
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Recent"}
                        </span>
                      </td>

                      {/* Associated Restaurant */}
                      <td className="py-4 px-4">
                        {user.restaurant ? (
                          <button
                            onClick={() => handleOpenViewModal(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold border border-orange-200 transition-colors"
                          >
                            <Store className="w-3.5 h-3.5 text-orange-500" />
                            <span className="truncate max-w-[140px]">
                              {user.restaurant.restaurantName}
                            </span>
                          </button>
                        ) : isRestaurant ? (
                          <span className="text-xs text-amber-600 font-medium italic">
                            Profile Pending
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          title="Click to toggle status"
                          className="focus:outline-none transition-transform active:scale-95"
                        >
                          {renderStatusBadge(user.status)}
                        </button>
                      </td>

                      {/* Role Dropdown */}
                      <td className="py-4 px-4">
                        {renderRoleDropdown(user)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Modal */}
                          <button
                            onClick={() => handleOpenViewModal(user)}
                            title="View Profile Details"
                            className="p-2 rounded-xl text-gray-500 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleOpenDeleteModal(user)}
                            title="Delete User"
                            className="p-2 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

        {/* Pagination Footer */}
        {!isLoading && users.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-gray-100 text-xs text-gray-500 font-medium">
            <div>
              Showing{" "}
              <span className="font-bold text-gray-800">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-gray-800">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-800">
                {totalCount}
              </span>{" "}
              users
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-gray-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <div className="px-2 font-bold text-gray-800">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-gray-700"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW USER & RESTAURANT DETAILS MODAL */}
      {/* ========================================================================= */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-50 text-[#FF6B35]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">
                    User Details
                  </h3>
                  <p className="text-xs text-gray-500">
                    User ID: {selectedUser._id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="mt-5 p-5 rounded-2xl bg-gray-50/80 border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center font-bold text-xl text-orange-600 border-2 border-orange-200 flex-shrink-0">
                {selectedUser.image ? (
                  <img
                    src={selectedUser.image}
                    alt={selectedUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "U"}
                  </span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-base font-extrabold text-gray-900">
                    {selectedUser.name}
                  </h4>
                  {renderRoleBadge(selectedUser.role)}
                  {renderStatusBadge(selectedUser.status)}
                </div>
                <div className="text-xs text-gray-500 font-medium flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {selectedUser.email}
                  </span>
                  {selectedUser.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {selectedUser.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Joined:{" "}
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Restaurant Details Section from Database */}
            {(formatRole(selectedUser.role) === "Restaurant" ||
              modalRestaurantDetails) && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#FF6B35]" />
                    Restaurant Profile Information
                  </h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    Database Record
                  </span>
                </div>

                {isLoadingRestaurant ? (
                  <div className="p-6 text-center text-xs text-gray-500 animate-pulse bg-gray-50 rounded-2xl border border-gray-100">
                    Fetching restaurant record from database...
                  </div>
                ) : modalRestaurantDetails ? (
                  <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 space-y-4">
                    {/* Banner */}
                    {modalRestaurantDetails.bannerImage && (
                      <div className="relative h-28 w-full rounded-xl overflow-hidden">
                        <img
                          src={modalRestaurantDetails.bannerImage}
                          alt="Banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {modalRestaurantDetails.logo ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 bg-white">
                          <img
                            src={modalRestaurantDetails.logo}
                            alt="Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                          <Store className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm">
                          {modalRestaurantDetails.restaurantName}
                        </h5>
                        <p className="text-xs text-gray-500">
                          Slug: /{modalRestaurantDetails.slug || "n/a"}
                        </p>
                      </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-gray-100">
                        <span className="text-gray-400 block mb-1 font-semibold">
                          Cuisines / Categories
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {modalRestaurantDetails.cuisineTypes &&
                          modalRestaurantDetails.cuisineTypes.length > 0 ? (
                            modalRestaurantDetails.cuisineTypes.map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md text-[11px] font-semibold"
                              >
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic">Not set</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100">
                        <span className="text-gray-400 block mb-1 font-semibold">
                          Rating & Reviews
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-gray-800 mt-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span>
                            {modalRestaurantDetails.rating || "0.0"} (
                            {modalRestaurantDetails.totalReviews || 0} reviews)
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100">
                        <span className="text-gray-400 block mb-1 font-semibold">
                          Contact Number
                        </span>
                        <span className="font-semibold text-gray-800">
                          {modalRestaurantDetails.contactNumber ||
                            modalRestaurantDetails.ownerPhone ||
                            "Not provided"}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100">
                        <span className="text-gray-400 block mb-1 font-semibold">
                          Address
                        </span>
                        <span className="font-semibold text-gray-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {modalRestaurantDetails.address?.street
                            ? `${modalRestaurantDetails.address.street}, ${modalRestaurantDetails.address.city || ""}`
                            : "Address not set"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-500 bg-gray-50/50">
                    <Info className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    This user has role &ldquo;Restaurant&rdquo; but has not yet completed
                    their restaurant profile.
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-2.5">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenRoleModal(selectedUser);
                }}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#FF6B35] hover:bg-[#e85a27] text-white shadow-sm transition-colors"
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CHANGE ROLE MODAL */}
      {/* ========================================================================= */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900">
                  Change User Role
                </h3>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Select a new role for{" "}
              <strong className="text-gray-800">
                {selectedUser.name}
              </strong>{" "}
              ({selectedUser.email}):
            </div>

            {/* Role Options */}
            <div className="space-y-2.5">
              {[
                {
                  id: "Customer",
                  name: "Customer",
                  desc: "Browse food items, place orders, and review restaurants.",
                  icon: User,
                },
                {
                  id: "Restaurant Partner",
                  name: "Restaurant Partner",
                  desc: "Manage restaurant profile, menu items, and incoming food orders.",
                  icon: Store,
                },
                {
                  id: "Delivery Partner",
                  name: "Delivery Partner (Rider)",
                  desc: "Accept and fulfill delivery orders for nearby restaurants.",
                  icon: Bike,
                },
                {
                  id: "Admin",
                  name: "Admin",
                  desc: "Full administrative access to manage all users and platform features.",
                  icon: ShieldCheck,
                },
              ].map((roleOption) => {
                const Icon = roleOption.icon;
                const isSelected =
                  formatRole(newRole).toLowerCase() ===
                  formatRole(roleOption.id).toLowerCase();
                return (
                  <div
                    key={roleOption.id}
                    onClick={() => setNewRole(roleOption.id)}
                    className={`cursor-pointer flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-[#FF6B35] bg-orange-50/50 shadow-sm"
                        : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected
                          ? "bg-[#FF6B35] text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">
                          {roleOption.name}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#FF6B35] font-bold" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {roleOption.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleUpdate}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#FF6B35] hover:bg-[#e85a27] text-white shadow-sm disabled:opacity-50"
              >
                {isActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DELETE USER MODAL */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">
                  Delete User Account
                </h3>
                <p className="text-xs text-gray-500">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-rose-50/60 p-4 rounded-2xl border border-rose-100">
              Are you sure you want to permanently delete account for{" "}
              <strong className="text-gray-900">{selectedUser.name}</strong> (
              {selectedUser.email})?
            </p>

            <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-50"
              >
                {isActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
