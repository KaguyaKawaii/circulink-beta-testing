import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, RefreshCw, Search, X, ChevronDown } from "lucide-react";
import StaffNavigation from "./StaffNavigation";
import StaffUserViewModal from "./Modals/StaffUserViewModal"; // ✅ Fixed import path

function StaffUsersViewOnly({ setView, staff, onLogout })
 {  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [modalUser, setModalUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/all/users`);
      if (res.data.success) {
        // Filter out staff users and show only students and faculty
        const nonStaffUsers = res.data.users.filter(user => 
          user.role !== "Staff" && user.role !== "staff"
        );
        setUsers(nonStaffUsers);
      } else {
        console.error("Failed to fetch users:", res.data.message);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVerified = async (user) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/toggle-verify/${user._id}`,
        { verify: !user.verified }
      );
      
      if (response.data.success) {
        // Update the user in the local state
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u._id === user._id ? { ...u, verified: !user.verified } : u
          )
        );
        
        // If modal is open for this user, update it too
        if (modalUser && modalUser._id === user._id) {
          setModalUser({ ...modalUser, verified: !user.verified });
        }
        
        alert(`User ${!user.verified ? 'verified' : 'unverified'} successfully!`);
      } else {
        throw new Error(response.data.message || "Failed to update verification status");
      }
    } catch (error) {
      console.error("Failed to toggle verification:", error);
      alert(error.response?.data?.message || "Failed to update verification status.");
    }
  };

  const handleUserUpdated = (updatedUser) => {
    // Update the user in the local state
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u._id === updatedUser._id ? updatedUser : u
      )
    );
    
    // If modal is open for this user, update it too
    if (modalUser && modalUser._id === updatedUser._id) {
      setModalUser(updatedUser);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.id_number || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      filter === "All" || 
      (filter === "Verified" && user.verified) ||
      (filter === "Unverified" && !user.verified) ||
      (filter === "Student" && user.role === "Student") ||
      (filter === "Faculty" && user.role === "Faculty") ||
      (filter === "Suspended" && user.suspended);

    return matchesSearch && matchesFilter;
  });

  const handleViewUser = (user) => {
    setModalUser(user);
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setModalUser(null);
    setShowUserModal(false);
  };

  const formatPHDateTime = (date) =>
    date
      ? new Date(date).toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

  return (
    <>
      <StaffNavigation setView={setView} currentView="staffUsers" staff={staff} />
      
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">User Management</h1>
              <p className="text-gray-600">View and manage student and faculty accounts</p>
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
          {/* Search and Controls */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, ID number..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {search && (
                  <button 
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="All">All Users</option>
                  <option value="Verified">Verified</option>
                  <option value="Unverified">Unverified</option>
                  <option value="Student">Students</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Suspended">Suspended</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Refresh */}
              <button
                onClick={fetchUsers}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">#</th>
                    <th className="px-6 py-3 text-left font-medium">Name</th>
                    <th className="px-6 py-3 text-left font-medium">Email</th>
                    <th className="px-6 py-3 text-left font-medium">ID Number</th>
                    <th className="px-6 py-3 text-left font-medium">Role</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Registered At</th>
                    <th className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{i + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{u.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{u.id_number || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap capitalize">{u.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.verified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {u.verified ? "Verified" : "Unverified"}
                            </span>
                            {u.suspended && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.createdAt || u.created_at ? formatPHDateTime(u.createdAt || u.created_at) : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleViewUser(u)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
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

      {/* User View Modal - Staff version without suspension */}
      {showUserModal && modalUser && (
        <StaffUserViewModal
          user={modalUser}
          onClose={handleCloseUserModal}
          onToggleVerified={handleToggleVerified}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </>
  );
}

export default StaffUsersViewOnly;