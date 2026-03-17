import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminNavigation from "../AdminNavigation";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  RotateCcw,
  Calendar,
  Clock,
  User,
  MapPin,
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

function ArchivedReservations({ setView, admin }) {
  const [archivedReservations, setArchivedReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewReservation, setViewReservation] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });
  
  // Selection State
  const [selectedReservations, setSelectedReservations] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkRestoreConfirm, setShowBulkRestoreConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    archivedThisWeek: 0,
    statusCounts: {}
  });

  const itemsPerPage = 10;

  // Show alert modal
  const showAlert = (title, message, type = "info") => {
    setAlertModal({ show: true, title, message, type });
  };

  // Fetch archived reservations
  const fetchArchivedReservations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/archived/all`);
      const data = res.data || [];
      setArchivedReservations(data);
      
      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const statusCount = {};
      
      data.forEach(res => {
        statusCount[res.status] = (statusCount[res.status] || 0) + 1;
      });
      
      setStats({
        total: data.length,
        archivedThisWeek: data.filter(item => new Date(item.archivedAt) > weekAgo).length,
        statusCounts: statusCount
      });
      
      setSelectedReservations([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Failed to fetch archived reservations:", err);
      showAlert("Error", "Failed to load archived reservations. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedReservations();
  }, []);

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReservations([]);
    } else {
      setSelectedReservations(filteredReservations.map(res => res._id));
    }
    setSelectAll(!selectAll);
  };

  const handleClearAll = () => {
    setSelectedReservations([]);
    setSelectAll(false);
  };

  const handleSelectReservation = (reservationId) => {
    setSelectedReservations(prev => {
      if (prev.includes(reservationId)) {
        const newSelected = prev.filter(id => id !== reservationId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, reservationId];
        if (newSelected.length === filteredReservations.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  // Bulk Restore Handler
  const handleBulkRestoreClick = () => {
    if (selectedReservations.length === 0) {
      showAlert("No Reservations Selected", "Please select at least one reservation to restore.", "warning");
      return;
    }
    setShowBulkRestoreConfirm(true);
  };

  const handleBulkRestoreConfirm = async () => {
    if (selectedReservations.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/bulk-restore-archived`,
        { archivedIds: selectedReservations }
      );

      if (response.data.success) {
        showAlert("Success", `Successfully restored ${selectedReservations.length} reservations.`, "success");
        fetchArchivedReservations();
        handleClearAll();
        window.dispatchEvent(new Event("reservationRestored"));
      } else {
        throw new Error(response.data.message || "Failed to restore reservations");
      }
    } catch (err) {
      console.error("Bulk restore error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to restore reservations.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkRestoreConfirm(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedReservations.length === 0) {
      showAlert("No Reservations Selected", "Please select at least one reservation to delete.", "warning");
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedReservations.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/bulk-delete-archived`,
        { archivedIds: selectedReservations }
      );

      if (response.data.success) {
        showAlert("Success", `Successfully deleted ${response.data.count} archived reservations.`, "success");
        fetchArchivedReservations();
        handleClearAll();
      } else {
        throw new Error(response.data.message || "Failed to delete reservations");
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to delete reservations.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  // Restore reservation
  const handleRestore = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/archived/${id}/restore`);
      showAlert("Success", "Reservation restored successfully.", "success");
      fetchArchivedReservations();
      window.dispatchEvent(new Event("reservationRestored"));
    } catch (err) {
      console.error("Failed to restore reservation:", err);
      showAlert("Error", err.response?.data?.message || "Failed to restore reservation.", "error");
    }
  };

  // Permanently delete reservation
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/reservations/archived/${id}`);
      showAlert("Success", "Reservation permanently deleted.", "success");
      fetchArchivedReservations();
    } catch (err) {
      console.error("Failed to delete reservation:", err);
      showAlert("Error", err.response?.data?.message || "Failed to delete reservation.", "error");
    }
  };

  const handleBulkRestoreCancel = () => setShowBulkRestoreConfirm(false);
  const handleBulkDeleteCancel = () => setShowBulkDeleteConfirm(false);

  // Calculate duration between start and end time
  const calculateDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const diffMs = new Date(end) - new Date(start);
    if (diffMs <= 0) return "N/A";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) return `${Math.round(hours / 24)} day(s)`;
    if (hours > 0) return `${hours} hr ${minutes} min`;
    return `${minutes} min`;
  };

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
    const data = filteredReservations.map(res => ({
      'Room': res.roomName,
      'Location': res.location,
      'User': res.userId?.name || 'N/A',
      'ID Number': res.userId?.id_number || 'N/A',
      'Date': formatDate(res.datetime),
      'Duration': calculateDuration(res.datetime, res.endDatetime),
      'Status': res.status,
      'Archived On': formatDateTime(res.archivedAt)
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
      a.download = `archived-reservations-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  // Filter & sort
  const filteredReservations = archivedReservations
    .filter(reservation => {
      const matchesSearch = 
        reservation.roomName?.toLowerCase().includes(search.toLowerCase()) ||
        reservation.location?.toLowerCase().includes(search.toLowerCase()) ||
        reservation.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        reservation.userId?.id_number?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.archivedAt) - new Date(a.archivedAt);
      if (sortBy === "oldest") return new Date(a.archivedAt) - new Date(b.archivedAt);
      if (sortBy === "room-az") return a.roomName.localeCompare(b.roomName);
      if (sortBy === "room-za") return b.roomName.localeCompare(a.roomName);
      if (sortBy === "user-az") return (a.userId?.name || "").localeCompare(b.userId?.name || "");
      if (sortBy === "user-za") return (b.userId?.name || "").localeCompare(a.userId?.name || "");
      return 0;
    });

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const paginatedReservations = filteredReservations.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

const statusOptions = [
  { value: "all", label: "All Statuses" },
  ...Array.from(new Set(archivedReservations.map(r => r.status))).map(status => ({ 
    value: status, 
    label: status 
  }))
];

  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest Archived" },
    { value: "oldest", label: "Oldest Archived" },
    { value: "room-az", label: "Room A-Z" },
    { value: "room-za", label: "Room Z-A" },
    { value: "user-az", label: "User A-Z" },
    { value: "user-za", label: "User Z-A" }
  ];

  // Filter configurations for FilterBar
  const filters = [
    {
      value: statusFilter,
      onChange: setStatusFilter,
      options: statusOptions,
      icon: Filter
    }
  ];

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminArchived" onLogout={() => window.dispatchEvent(new Event('showLogoutModal'))} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#CC0000]">Archived Reservations</h1>
          <p className="text-gray-600">View and manage archived reservation records</p>
        </header>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatsCard 
              icon={Calendar} 
              label="Total Archived" 
              value={stats.total} 
              color="blue"
            />
            <StatsCard 
              icon={Clock} 
              label="Archived This Week" 
              value={stats.archivedThisWeek} 
              color="green"
            />
            <StatsCard 
              icon={Filter} 
              label="Status Types" 
              value={Object.keys(stats.statusCounts).length} 
              color="purple"
            />
          </div>

{/* Filter Bar */}
<FilterBar
  search={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search by room, location, user name, ID number..."
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
      onClick={fetchArchivedReservations}
    >
      Refresh
    </Button>
  </div>
</FilterBar>

          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedCount={selectedReservations.length}
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

          {/* Reservations List */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Archived Reservations List</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredReservations.length} {filteredReservations.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {loading ? (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Select</TableHeaderCell>
                    <TableHeaderCell>#</TableHeaderCell>
                    <TableHeaderCell>Room</TableHeaderCell>
                    <TableHeaderCell>User</TableHeaderCell>
                    <TableHeaderCell>Date & Time</TableHeaderCell>
                    <TableHeaderCell>Duration</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Archived On</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  <TableSkeleton rows={5} columns={9} />
                </TableBody>
              </Table>
            ) : paginatedReservations.length === 0 ? (
              <EmptyState
                type="reservations"
                icon={Calendar}
                title="No archived reservations found"
                message="Reservations you archive will appear here for future reference."
                action={
                  <Button variant="primary" onClick={fetchArchivedReservations}>
                    Refresh
                  </Button>
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
                      <TableHeaderCell>Room</TableHeaderCell>
                      <TableHeaderCell>User</TableHeaderCell>
                      <TableHeaderCell>Date & Time</TableHeaderCell>
                      <TableHeaderCell>Duration</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Archived On</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {paginatedReservations.map((reservation, index) => (
                      <TableRow key={reservation._id}>
                        <TableCell>
                          <button
                            onClick={() => handleSelectReservation(reservation._id)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {selectedReservations.includes(reservation._id) ? (
                              <CheckSquare size={18} className="text-[#CC0000]" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {(page - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{reservation.roomName}</div>
                          <div className="text-xs text-gray-500">{reservation.location}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{reservation.userId?.name}</div>
                          <div className="text-xs text-gray-500">{reservation.userId?.id_number}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-900">{formatDate(reservation.datetime)}</div>
                          <div className="text-xs text-gray-500">
                            {reservation.datetime && new Date(reservation.datetime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {calculateDuration(reservation.datetime, reservation.endDatetime)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={reservation.status} />
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {formatDateTime(reservation.archivedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <IconButton
                              icon={Eye}
                              onClick={() => setViewReservation(reservation)}
                              tooltip="View Details"
                              color="blue"
                            />
                            <IconButton
                              icon={RotateCcw}
                              onClick={() => setRestoreConfirm(reservation)}
                              tooltip="Restore"
                              color="green"
                            />
                            <IconButton
                              icon={Trash2}
                              onClick={() => setDeleteConfirm(reservation)}
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
                  totalItems={filteredReservations.length}
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
            message={`Are you sure you want to restore the reservation for room "${restoreConfirm?.roomName}" by ${restoreConfirm?.userId?.name}?`}
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
            message={`Are you sure you want to permanently delete the reservation for room "${deleteConfirm?.roomName}" by ${deleteConfirm?.userId?.name}? This action cannot be undone.`}
            type="danger"
          />

          <ConfirmModal
            isOpen={showBulkRestoreConfirm}
            onClose={handleBulkRestoreCancel}
            onConfirm={handleBulkRestoreConfirm}
            title="Restore Multiple Reservations"
            message={`Are you sure you want to restore ${selectedReservations.length} selected reservation${selectedReservations.length !== 1 ? 's' : ''}?`}
            type="restore"
            loading={isBulkActionLoading}
          />

          <ConfirmModal
            isOpen={showBulkDeleteConfirm}
            onClose={handleBulkDeleteCancel}
            onConfirm={handleBulkDeleteConfirm}
            title="Delete Multiple Reservations"
            message={`Are you sure you want to permanently delete ${selectedReservations.length} selected reservation${selectedReservations.length !== 1 ? 's' : ''}? This action cannot be undone.`}
            type="danger"
            loading={isBulkActionLoading}
          />

          {/* View Reservation Modal */}
          <ViewModal
            isOpen={!!viewReservation}
            onClose={() => setViewReservation(null)}
            title="Reservation Details"
          >
            {viewReservation && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservation Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Room</label>
                        <p className="text-gray-900">{viewReservation.roomName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-gray-900">{viewReservation.location}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Start Time</label>
                        <p className="text-gray-900">{formatDateTime(viewReservation.datetime)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">End Time</label>
                        <p className="text-gray-900">{formatDateTime(viewReservation.endDatetime)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Duration</label>
                        <p className="text-gray-900">{calculateDuration(viewReservation.datetime, viewReservation.endDatetime)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-gray-900">{viewReservation.userId?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">ID Number</label>
                        <p className="text-gray-900">{viewReservation.userId?.id_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{viewReservation.userId?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Role</label>
                        <p className="text-gray-900">
                          <StatusBadge status={viewReservation.userId?.role} />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Archive Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">
                        <StatusBadge status={viewReservation.status} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Archived On</label>
                      <p className="text-gray-900">{formatDateTime(viewReservation.archivedAt)}</p>
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

export default ArchivedReservations;