import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Eye,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  UserPlus,
  Pencil,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import AdminNavigation from "./AdminNavigation";
import UserFormModal from "./Modals/UserFormModal";
import UserViewModal from "./Modals/UserViewModal";

// ✅ FIXED: Store socket globally to avoid multiple connections
const socket = io(`${import.meta.env.VITE_API_URL}`);
window.socket = socket; // Make it globally accessible

function AdminUsers({ setView, onLogout }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [suspendFilter, setSuspendFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({ type: null, user: null });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({ 
    show: false, 
    title: "", 
    message: "", 
    action: null, 
    loading: false,
    type: "default" // "default", "revokeAll", "bulkVerify"
  });

  const formatPHDateTime = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const showConfirmation = (title, message, action, type = "default") => {
    setConfirmationModal({
      show: true,
      title,
      message,
      action,
      loading: false,
      type
    });
  };

  const hideConfirmation = () => {
    setConfirmationModal({
      show: false,
      title: "",
      message: "",
      action: null,
      loading: false,
      type: "default"
    });
  };

  const executeAction = async () => {
    if (!confirmationModal.action) return;
    
    setConfirmationModal(prev => ({ ...prev, loading: true }));
    
    try {
      await confirmationModal.action();
      hideConfirmation();
    } catch (error) {
      console.error("Action failed:", error);
      setConfirmationModal(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // ✅ FIXED: Enhanced socket event listeners
    socket.on("user-updated", (updatedUser) => {
      console.log("User updated via socket:", updatedUser);
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === updatedUser._id ? updatedUser : user
        )
      );
      
      // Update modal if it's open for this user
      setModal(prevModal => 
        prevModal.user && prevModal.user._id === updatedUser._id 
          ? { ...prevModal, user: updatedUser }
          : prevModal
      );

      // Update selected users if this user is selected
      setSelectedUsers(prevSelected => 
        prevSelected.includes(updatedUser._id) ? prevSelected : prevSelected
      );
    });

    socket.on("user-created", (newUser) => {
      console.log("New user created via socket:", newUser);
      setUsers(prevUsers => [...prevUsers, newUser]);
    });

    socket.on("user-archived", (archivedUserId) => {
      console.log("User archived via socket:", archivedUserId);
      setUsers(prevUsers => prevUsers.filter(user => user._id !== archivedUserId));
      // Remove from selected if archived
      setSelectedUsers(prevSelected => prevSelected.filter(id => id !== archivedUserId));
    });

    socket.on("bulk-verification-updated", (data) => {
      console.log("Bulk verification updated via socket:", data);
      // Refresh users to get latest data
      fetchUsers();
      // Clear selections
      setSelectedUsers([]);
      setSelectAll(false);
    });

    return () => {
      socket.off("user-updated");
      socket.off("user-created");
      socket.off("user-archived");
      socket.off("bulk-verification-updated");
    };
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/all/users`);
      if (res.data.success) {
        setUsers(res.data.users);
        // Clear selections when refreshing
        setSelectedUsers([]);
        setSelectAll(false);
      } else {
        console.error("Failed to fetch users:", res.data.message);
        showConfirmation(
          "Error",
          `Failed to fetch users: ${res.data.message}`,
          null
        );
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      showConfirmation(
        "Error",
        "Failed to fetch users. Please check your connection.",
        null
      );
    } finally {
      setIsLoading(false);
    }
  };

// ✅ NEW: Revoke all verification for students only
const revokeAllStudentVerification = async () => {
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/users/revoke-all-verification`,
      {
        roles: ["Student"] // Only revoke for students
      }
    );

    if (res.data.success) {
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.role === "Student") {
            return { ...user, verified: false };
          }
          return user;
        })
      );

      // Clear selections
      setSelectedUsers([]);
      setSelectAll(false);

      // Show success message
      showConfirmation(
        "Success",
        `Successfully revoked verification for ${res.data.count} students.`,
        null
      );

      // Emit socket event for real-time updates
      socket.emit("bulk-verification-updated", {
        roles: ["Student"],
        verified: false,
        count: res.data.count
      });

      // Refresh users to ensure we have the latest data
      fetchUsers();

      console.log("Revoked all student verifications successfully");
    } else {
      throw new Error(res.data.message || "Failed to revoke verifications");
    }
  } catch (err) {
    console.error("Failed to revoke verifications:", err);
    showConfirmation(
      "Error",
      err.response?.data?.message || "Failed to revoke verifications. Please try again.",
      null
    );
  }
};

  // ✅ NEW: Bulk verify selected users
  const bulkVerifyUsers = async (verifyStatus) => {
    if (selectedUsers.length === 0) {
      showConfirmation(
        "No Users Selected",
        "Please select at least one user to verify.",
        null
      );
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/bulk-verify`,
        {
          userIds: selectedUsers,
          verified: verifyStatus
        }
      );

      if (res.data.success) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (selectedUsers.includes(user._id)) {
              return { ...user, verified: verifyStatus };
            }
            return user;
          })
        );

        // Clear selections
        setSelectedUsers([]);
        setSelectAll(false);

        // Show success message
        showConfirmation(
          "Success",
          `Successfully ${verifyStatus ? 'verified' : 'unverified'} ${res.data.count} users.`,
          null
        );

        // Emit socket event for real-time updates
        socket.emit("bulk-verification-updated", {
          userIds: selectedUsers,
          verified: verifyStatus,
          count: res.data.count
        });

        console.log(`Bulk ${verifyStatus ? 'verification' : 'unverification'} successful`);
      } else {
        throw new Error(res.data.message || `Failed to ${verifyStatus ? 'verify' : 'unverify'} users`);
      }
    } catch (err) {
      console.error("Bulk verify error:", err);
      showConfirmation(
        "Error",
        err.response?.data?.message || `Failed to ${verifyStatus ? 'verify' : 'unverify'} users. Please try again.`,
        null
      );
    }
  };

  // ✅ FIXED: Improved toggleVerified function with notification creation
// FIXED: toggleVerified function with correct endpoint
const toggleVerified = async (user) => {
  try {
    console.log("Toggling verification for:", user._id, "Current verified:", user.verified);
    
    // Use PATCH method as defined in routes - FIXED: Using /verify/:id endpoint
    const res = await axios.patch(
      `${import.meta.env.VITE_API_URL}/api/users/verify/${user._id}`,
      { verified: !user.verified } // Send as 'verified' not 'verify'
    );

    if (res.data.success) {
      const updatedUser = res.data.user;
      
      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u._id === user._id ? { ...u, verified: updatedUser.verified } : u
        )
      );

      // Update modal state if open
      setModal((m) =>
        m.user && m.user._id === user._id
          ? { ...m, user: updatedUser }
          : m
      );

      // Emit socket event for real-time updates
      socket.emit("user-updated", updatedUser);
      
      console.log("Verification toggled successfully:", updatedUser.verified);
    } else {
      console.error("Failed to toggle verification:", res.data.message);
      showConfirmation(
        "Error",
        `Failed to change verification status: ${res.data.message}`,
        null
      );
    }
  } catch (err) {
    console.error("Failed to toggle verification:", err);
    console.error("Error response:", err.response?.data);
    showConfirmation(
      "Error",
      err.response?.data?.message || "Failed to change verification status. Please try again.",
      null
    );
  }
};

  const archiveUser = async (user) => {
    showConfirmation(
      "Archive User",
      `Are you sure you want to archive ${user.name}? This action cannot be undone.`,
      async () => {
        try {
          const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/users/archive/${user._id}`);
          
          if (response.data.success) {
            // ✅ FIXED: Emit socket event for real-time updates
            socket.emit("user-archived", user._id);
            
            // Update local state
            setUsers(prevUsers => prevUsers.filter(u => u._id !== user._id));
            
            // Remove from selected if archived
            setSelectedUsers(prevSelected => prevSelected.filter(id => id !== user._id));
            
            closeModal();
          } else {
            throw new Error(response.data.message || "Failed to archive user");
          }
        } catch (err) {
          console.error("Failed to archive user:", err.response?.data || err.message);
          showConfirmation(
            "Error",
            "Failed to archive user. Please try again.",
            null
          );
        }
      }
    );
  };

  // ✅ NEW: Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      const filteredIds = filteredUsers.map(user => user._id);
      setSelectedUsers(filteredIds);
    }
    setSelectAll(!selectAll);
  };

  // ✅ NEW: Handle individual user selection
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        const newSelected = prev.filter(id => id !== userId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, userId];
        // Check if all filtered users are selected
        if (newSelected.length === filteredUsers.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  // ✅ FIXED: Added function to handle user updates from modals
  const handleUserUpdated = (updatedUser) => {
    // Update users state
    setUsers((prev) =>
      prev.map((u) => (u._id === updatedUser._id ? updatedUser : u))
    );
    
    // Update modal state if open
    setModal((m) =>
      m.user && m.user._id === updatedUser._id
        ? { ...m, user: updatedUser }
        : m
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchesStatus =
      filter === "All" ||
      (filter === "Verified" && user.verified) ||
      (filter === "Not Verified" && !user.verified);
    
    const matchesRole = 
      roleFilter === "All" || 
      user.role === roleFilter ||
      (roleFilter === "Staff_Office" && user.role === "Staff_Office");
    
    const matchesSuspendStatus =
      suspendFilter === "All" ||
      (suspendFilter === "Suspended" && user.suspended) ||
      (suspendFilter === "Active" && !user.suspended);
    
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.id_number || "").toLowerCase().includes(search.toLowerCase());
    
    return matchesStatus && matchesRole && matchesSuspendStatus && matchesSearch;
  });

  const closeModal = () => setModal({ type: null, user: null });

  // For cleaner conditional rendering
  const isViewModal = modal.type === "view";
  const isEditOrAddModal = ["edit", "add"].includes(modal.type);

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminUsers" onLogout={onLogout}/>
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                User Management
              </h1>
              <p className="text-gray-600">View and manage all system users</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <SearchInput search={search} setSearch={setSearch} />
              <FilterDropdown value={filter} setValue={setFilter} label="Status" options={["All", "Verified", "Not Verified"]} />
              <FilterDropdown value={roleFilter} setValue={setRoleFilter} label="Role" options={["All", "Student", "Faculty", "Staff", "Staff_Office"]} />
              <FilterDropdown value={suspendFilter} setValue={setSuspendFilter} label="Suspension" options={["All", "Active", "Suspended"]} />

              <button
                onClick={() => {
                  setSearch("");
                  setFilter("All");
                  setRoleFilter("All");
                  setSuspendFilter("All");
                  fetchUsers();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setModal({ type: "add", user: null })}
                className="flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-[#990000] transition-colors cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Add User</span>
              </button>
            </div>

            {/* ✅ NEW: Bulk Actions Row */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm"
                >
                  {selectAll ? <Square size={16} /> : <CheckSquare size={16} />}
                  <span>{selectAll ? "Deselect All" : "Select All"}</span>
                </button>
                <span className="text-sm text-gray-600">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {selectedUsers.length > 0 && (
                <>
                  <button
                    onClick={() => showConfirmation(
                      "Verify Selected Users",
                      `Are you sure you want to verify ${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}?`,
                      () => bulkVerifyUsers(true),
                      "bulkVerify"
                    )}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm"
                  >
                    <CheckSquare size={16} />
                    <span>Verify Selected</span>
                  </button>
                  <button
                    onClick={() => showConfirmation(
                      "Unverify Selected Users",
                      `Are you sure you want to unverify ${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}?`,
                      () => bulkVerifyUsers(false),
                      "bulkVerify"
                    )}
                    className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors cursor-pointer text-sm"
                  >
                    <Square size={16} />
                    <span>Unverify Selected</span>
                  </button>
                </>
              )}

              <div className="flex-1"></div>

              {/* ✅ NEW: Revoke All Verification Button */}
              <button
                onClick={() => showConfirmation(
                  "Revoke All Student Verifications",
                  "This will revoke verification for ALL student accounts. Staff, Faculty, and Staff Office accounts will remain verified. This action cannot be undone. Are you sure?",
                  revokeAllStudentVerification,
                  "revokeAll"
                )}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
              >
                <AlertTriangle size={16} />
                <span>Revoke All Student Verification</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium w-10">
                      <button
                        onClick={handleSelectAll}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        {selectAll ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-medium">#</th>
                    <th className="px-6 py-3 text-left font-medium">Name</th>
                    <th className="px-6 py-3 text-left font-medium">Email</th>
                    <th className="px-6 py-3 text-left font-medium">ID Number</th>
                    <th className="px-6 py-3 text-left font-medium">Role</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Registered At</th>
                    <th className="px-6 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500 font-bold">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleSelectUser(u._id)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {selectedUsers.includes(u._id) ? (
                              <CheckSquare size={18} className="text-[#CC0000]" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{i + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{u.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{u.id_number || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap capitalize">{u.role.replace('_', ' ')}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Show Verified + Suspension Badge */}
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.verified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {u.verified ? "Verified" : "Not Verified"}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.suspended
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {u.suspended ? "Suspended" : "Active"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.created_at ? formatPHDateTime(u.created_at) : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => setModal({ type: "view", user: u })}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => setModal({ type: "edit", user: u })}
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded cursor-pointer"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => archiveUser(u)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded cursor-pointer"
                              title="Archive"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {confirmationModal.show && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {confirmationModal.type === "revokeAll" && (
                  <div className="p-2 bg-orange-100 rounded-full">
                    <AlertTriangle size={24} className="text-orange-600" />
                  </div>
                )}
                {confirmationModal.type === "bulkVerify" && (
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckSquare size={24} className="text-green-600" />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {confirmationModal.title}
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                {confirmationModal.message}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={hideConfirmation}
                  disabled={confirmationModal.loading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={confirmationModal.loading}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 ${
                    confirmationModal.type === "revokeAll" 
                      ? "bg-orange-600 hover:bg-orange-700" 
                      : confirmationModal.type === "bulkVerify"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-[#CC0000] hover:bg-[#990000]"
                  }`}
                >
                  {confirmationModal.loading && (
                    <RefreshCw size={16} className="animate-spin" />
                  )}
                  {confirmationModal.loading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isViewModal && (
        <UserViewModal
          user={modal.user}
          onClose={closeModal}
          onToggleVerified={toggleVerified} // ✅ FIXED: Pass the function directly
          onUserUpdated={handleUserUpdated} // ✅ FIXED: Use the new handler
        />
      )}

      {isEditOrAddModal && (
        <UserFormModal
          mode={modal.type}
          user={modal.user}
          onClose={closeModal}
          onSuccess={(updatedUser) => {
            if (updatedUser) {
              // ✅ FIXED: Handle both add and edit scenarios properly
              if (modal.type === "add") {
                // Add new user to the list
                setUsers(prev => [...prev, updatedUser]);
                socket.emit("user-created", updatedUser);
                
                // Create welcome notification
                try {
                  const notificationData = {
                    userId: updatedUser._id,
                    message: `Welcome to the system! Your account has been created.`,
                    type: 'user_welcome',
                    status: 'Info',
                    targetRole: 'user'
                  };
                  axios.post(`${import.meta.env.VITE_API_URL}/api/notifications`, notificationData)
                    .then(res => {
                      if (res.data.success) {
                        socket.emit('new-notification', res.data.notification);
                      }
                    });
                } catch (notifError) {
                  console.error('Failed to create welcome notification:', notifError);
                }
              } else {
                // Update existing user
                handleUserUpdated(updatedUser);
                socket.emit("user-updated", updatedUser);
                
                // Create update notification
                try {
                  const notificationData = {
                    userId: updatedUser._id,
                    message: `Your profile information has been updated by an administrator.`,
                    type: 'profile_update',
                    status: 'Updated',
                    targetRole: 'user'
                  };
                  axios.post(`${import.meta.env.VITE_API_URL}/api/notifications`, notificationData)
                    .then(res => {
                      if (res.data.success) {
                        socket.emit('new-notification', res.data.notification);
                      }
                    });
                } catch (notifError) {
                  console.error('Failed to create update notification:', notifError);
                }
              }
            }
            closeModal();
          }}
        />
      )}
    </>
  );
}

// Small helper components for cleaner JSX
function SearchInput({ search, setSearch }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, ID number..."
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0"
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function FilterDropdown({ value, setValue, label, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 cursor-pointer outline-0"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "All" ? `All ${label}` : opt.replace('_', ' ')}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
    </div>
  );
}

export default AdminUsers;