import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminNavigation from "../AdminNavigation";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  RotateCcw,
  User,
  Mail,
  Hash,
  Building2,
  GraduationCap,
  Calendar,
  Filter,
  Download,
  CheckSquare,
  Square
} from "lucide-react";
import {
  Button,
  IconButton,
  StatsCard,
  Card,
  FilterBar,
  BulkActionBar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  StatusBadge,
  TableSkeleton,
  Pagination,
  ConfirmModal,
  ViewModal,
  AlertModal,
  EmptyState,
  ExportMenu,
  LoadingOverlay
} from "./ArchiveComponents";

function ArchivedUsers({ setView, admin }) {
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewUser, setViewUser] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });
  
  // Selection State
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkRestoreConfirm, setShowBulkRestoreConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    archivedThisWeek: 0,
    roles: {},
    departments: {}
  });

  const itemsPerPage = 10;

  // Show alert modal
  const showAlert = (title, message, type = "info") => {
    setAlertModal({ show: true, title, message, type });
  };

  // Fetch archived users
  const fetchArchivedUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/archived/all`);

      console.log("Archived Users Response:", res.data);

      if (res.data && Array.isArray(res.data.users)) {
        const data = res.data.users;
        setArchivedUsers(data);
        
        // Calculate stats
        const now = new Date();
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        const roleCount = {};
        const deptCount = {};
        
        data.forEach(user => {
          roleCount[user.role] = (roleCount[user.role] || 0) + 1;
          if (user.department) {
            deptCount[user.department] = (deptCount[user.department] || 0) + 1;
          }
        });
        
        setStats({
          total: data.length,
          archivedThisWeek: data.filter(item => new Date(item.archivedAt) > weekAgo).length,
          roles: roleCount,
          departments: deptCount
        });
        
        setSelectedUsers([]);
        setSelectAll(false);
      } else {
        console.error("Response does not contain 'users' array");
        setArchivedUsers([]);
      }
    } catch (err) {
      console.error("Failed to fetch archived users:", err);
      showAlert("Error", "Failed to load archived users. Please try again.", "error");
      setArchivedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedUsers();
  }, []);

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user._id));
    }
    setSelectAll(!selectAll);
  };

  const handleClearAll = () => {
    setSelectedUsers([]);
    setSelectAll(false);
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        const newSelected = prev.filter(id => id !== userId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, userId];
        if (newSelected.length === filteredUsers.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  // Bulk Restore Handler
  const handleBulkRestoreClick = () => {
    if (selectedUsers.length === 0) {
      showAlert("No Users Selected", "Please select at least one user to restore.", "warning");
      return;
    }
    setShowBulkRestoreConfirm(true);
  };

  const handleBulkRestoreConfirm = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/bulk-restore-archived`,
        { userIds: selectedUsers }
      );

      if (response.data.success) {
        showAlert("Success", `Successfully restored ${response.data.count} user${response.data.count !== 1 ? 's' : ''}.`, "success");
        fetchArchivedUsers();
        handleClearAll();
      } else {
        throw new Error(response.data.message || "Failed to restore users");
      }
    } catch (err) {
      console.error("Bulk restore error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to restore users.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkRestoreConfirm(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedUsers.length === 0) {
      showAlert("No Users Selected", "Please select at least one user to delete.", "warning");
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/bulk-delete-archived`,
        { userIds: selectedUsers }
      );

      if (response.data.success) {
        showAlert("Success", `Successfully deleted ${response.data.count} archived user${response.data.count !== 1 ? 's' : ''}.`, "success");
        fetchArchivedUsers();
        handleClearAll();
      } else {
        throw new Error(response.data.message || "Failed to delete users");
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to delete users.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  // Restore user
  const handleRestore = async (id) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/users/restore/${id}`);
      showAlert("Success", "User restored successfully.", "success");
      fetchArchivedUsers();
    } catch (err) {
      console.error("Failed to restore user:", err);
      showAlert("Error", err.response?.data?.message || "Failed to restore user.", "error");
    }
  };

  // Permanently delete user
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/archived/${id}`);
      showAlert("Success", "User permanently deleted.", "success");
      fetchArchivedUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      showAlert("Error", err.response?.data?.message || "Failed to delete user.", "error");
    }
  };

  const handleBulkRestoreCancel = () => setShowBulkRestoreConfirm(false);
  const handleBulkDeleteCancel = () => setShowBulkDeleteConfirm(false);

  // Format date for display
  const formatDate = (date) => {
    return date
      ? new Date(date).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";
  };

  // Format datetime for display
  const formatDateTime = (date) => {
    return date
      ? new Date(date).toLocaleString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  };

  const handleExport = (format) => {
    const data = filteredUsers.map(user => ({
      'ID Number': user.id_number,
      'Name': user.name,
      'Email': user.email,
      'Role': user.role,
      'Department': user.department || 'N/A',
      'Course': user.course || 'N/A',
      'Year Level': user.year_level || 'N/A',
      'Archived On': formatDateTime(user.archivedAt)
    }));

    if (format === 'csv') {
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archived-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  // Filter & sort
  const filteredUsers = archivedUsers
    .filter(user => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.id_number?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.department?.toLowerCase().includes(search.toLowerCase()) ||
        user.course?.toLowerCase().includes(search.toLowerCase());
      
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesDepartment = departmentFilter === "all" || user.department === departmentFilter;
      
      return matchesSearch && matchesRole && matchesDepartment;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.archivedAt) - new Date(a.archivedAt);
      if (sortBy === "oldest") return new Date(a.archivedAt) - new Date(b.archivedAt);
      if (sortBy === "name-az") return a.name?.localeCompare(b.name);
      if (sortBy === "name-za") return b.name?.localeCompare(a.name);
      if (sortBy === "id-az") return a.id_number?.localeCompare(b.id_number);
      if (sortBy === "id-za") return b.id_number?.localeCompare(a.id_number);
      if (sortBy === "email-az") return a.email?.localeCompare(b.email);
      if (sortBy === "email-za") return b.email?.localeCompare(a.email);
      return 0;
    });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

const roleOptions = [
  { value: "all", label: "All Roles" },
  ...Array.from(new Set(archivedUsers.map(u => u.role))).map(role => ({ 
    value: role, 
    label: role 
  }))
];

const departmentOptions = [
  { value: "all", label: "All Departments" },
  ...Array.from(new Set(archivedUsers.map(u => u.department).filter(Boolean))).map(dept => ({ 
    value: dept, 
    label: dept 
  }))
];

  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest Archived" },
    { value: "oldest", label: "Oldest Archived" },
    { value: "name-az", label: "Name A-Z" },
    { value: "name-za", label: "Name Z-A" },
    { value: "id-az", label: "ID Number A-Z" },
    { value: "id-za", label: "ID Number Z-A" },
    { value: "email-az", label: "Email A-Z" },
    { value: "email-za", label: "Email Z-A" }
  ];

  // Filter configurations for FilterBar
  const filters = [
    {
      value: roleFilter,
      onChange: setRoleFilter,
      options: roleOptions,
      icon: Filter
    },
    {
      value: departmentFilter,
      onChange: setDepartmentFilter,
      options: departmentOptions,
      icon: Building2
    }
  ];

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminArchivedUsers" onLogout={() => window.dispatchEvent(new Event('showLogoutModal'))} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#CC0000]">Archived Users</h1>
          <p className="text-gray-600">View and manage archived user accounts</p>
        </header>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatsCard 
              icon={User} 
              label="Total Archived" 
              value={stats.total} 
              color="blue"
            />
            <StatsCard 
              icon={Calendar} 
              label="Archived This Week" 
              value={stats.archivedThisWeek} 
              color="green"
            />
            <StatsCard 
              icon={Building2} 
              label="Departments" 
              value={Object.keys(stats.departments).length} 
              color="purple"
            />
          </div>

{/* Filter Bar */}
<FilterBar
  search={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search by name, ID number, email, department, course..."
  filters={filters}
  sortOptions={sortOptions}
  sortBy={sortBy}
  onSortChange={setSortBy}
>
  <div className="flex justify-center gap-2">
    <ExportMenu onExport={handleExport} />
    <Button
      variant="outline"
      size="sm"
      icon={RefreshCw}
      onClick={fetchArchivedUsers}
    >
      Refresh
    </Button>
  </div>
</FilterBar>

          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedCount={selectedUsers.length}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            isAllSelected={selectAll}
            actions={[
              {
                label: "Restore",
                icon: RotateCcw,
                variant: "success",
                onClick: handleBulkRestoreClick,
                loading: isBulkActionLoading
              },
              {
                label: "Delete",
                icon: Trash2,
                variant: "danger",
                onClick: handleBulkDeleteClick,
                loading: isBulkActionLoading
              }
            ]}
          />

          {/* Users List */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Archived Users List</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </span>
            </div>

            {loading ? (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Select</TableHeaderCell>
                    <TableHeaderCell>#</TableHeaderCell>
                    <TableHeaderCell>ID Number</TableHeaderCell>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Department</TableHeaderCell>
                    <TableHeaderCell>Archived On</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  <TableSkeleton rows={5} columns={9} />
                </TableBody>
              </Table>
            ) : paginatedUsers.length === 0 ? (
              <EmptyState
  type="users"
  icon={User}
  title="No archived users found"
  message="Users you archive will appear here for future reference."
  action={
    <div className="flex justify-center">
      <Button variant="primary" onClick={fetchArchivedUsers}>
        Refresh
      </Button>
    </div>
  }
/>
            ) : (
              <>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell className="w-10">
                        <button
                          onClick={handleSelectAll}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          {selectAll ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell>#</TableHeaderCell>
                      <TableHeaderCell>ID Number</TableHeaderCell>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Email</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                      <TableHeaderCell>Department</TableHeaderCell>
                      <TableHeaderCell>Archived On</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {paginatedUsers.map((user, index) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <button
                            onClick={() => handleSelectUser(user._id)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {selectedUsers.includes(user._id) ? (
                              <CheckSquare size={18} className="text-[#CC0000]" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {(page - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {user.id_number}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          {user.course && (
                            <div className="text-xs text-gray-500">
                              {user.course} {user.year_level ? `• Year ${user.year_level}` : ''}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">{user.email}</TableCell>
                        <TableCell>
                          <StatusBadge status={user.role} />
                        </TableCell>
                        <TableCell className="text-gray-600">{user.department || "—"}</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {formatDateTime(user.archivedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <IconButton
                              icon={Eye}
                              onClick={() => setViewUser(user)}
                              tooltip="View Details"
                              color="blue"
                            />
                            <IconButton
                              icon={RotateCcw}
                              onClick={() => setRestoreConfirm(user)}
                              tooltip="Restore"
                              color="green"
                            />
                            <IconButton
                              icon={Trash2}
                              onClick={() => setDeleteConfirm(user)}
                              tooltip="Delete Permanently"
                              color="red"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filteredUsers.length}
                  itemsPerPage={itemsPerPage}
                />
              </>
            )}
          </Card>

          {/* Modals */}
          <ConfirmModal
            isOpen={!!restoreConfirm}
            onClose={() => setRestoreConfirm(null)}
            onConfirm={() => {
              handleRestore(restoreConfirm._id);
              setRestoreConfirm(null);
            }}
            title="Confirm Restore"
            message={`Are you sure you want to restore user "${restoreConfirm?.name}" (${restoreConfirm?.id_number})?`}
            type="restore"
          />

          <ConfirmModal
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            onConfirm={() => {
              handleDelete(deleteConfirm._id);
              setDeleteConfirm(null);
            }}
            title="Confirm Delete"
            message={`Are you sure you want to permanently delete user "${deleteConfirm?.name}" (${deleteConfirm?.id_number})? This action cannot be undone.`}
            type="danger"
          />

          <ConfirmModal
            isOpen={showBulkRestoreConfirm}
            onClose={handleBulkRestoreCancel}
            onConfirm={handleBulkRestoreConfirm}
            title="Restore Multiple Users"
            message={`Are you sure you want to restore ${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}?`}
            type="restore"
            loading={isBulkActionLoading}
          />

          <ConfirmModal
            isOpen={showBulkDeleteConfirm}
            onClose={handleBulkDeleteCancel}
            onConfirm={handleBulkDeleteConfirm}
            title="Delete Multiple Users"
            message={`Are you sure you want to permanently delete ${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}? This action cannot be undone.`}
            type="danger"
            loading={isBulkActionLoading}
          />

          {/* View User Modal */}
          <ViewModal
            isOpen={!!viewUser}
            onClose={() => setViewUser(null)}
            title="User Details"
          >
            {viewUser && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User size={20} className="text-gray-500" />
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Hash size={14} /> ID Number
                        </label>
                        <p className="text-gray-900">{viewUser.id_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <User size={14} /> Full Name
                        </label>
                        <p className="text-gray-900">{viewUser.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Mail size={14} /> Email
                        </label>
                        <p className="text-gray-900">{viewUser.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Role</label>
                        <p className="text-gray-900">
                          <StatusBadge status={viewUser.role} />
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <GraduationCap size={20} className="text-gray-500" />
                      Academic Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Building2 size={14} /> Department
                        </label>
                        <p className="text-gray-900">{viewUser.department || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <GraduationCap size={14} /> Course
                        </label>
                        <p className="text-gray-900">{viewUser.course || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Calendar size={14} /> Year Level
                        </label>
                        <p className="text-gray-900">{viewUser.year_level || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-gray-500" />
                    Archive Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Archived On</label>
                      <p className="text-gray-900">{formatDateTime(viewUser.archivedAt)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </ViewModal>
        </div>
      </main>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.show}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ show: false, title: "", message: "", type: "info" })}
      />

      {/* Loading Overlay */}
      {isBulkActionLoading && <LoadingOverlay message="Processing your request..." />}
    </>
  );
}

export default ArchivedUsers;