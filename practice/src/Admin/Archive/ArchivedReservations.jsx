import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminNavigation from "../AdminNavigation";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  X, 
  CheckSquare, 
  Square,
  AlertTriangle,
  RotateCcw,
  Filter
} from "lucide-react";

function AdminArchived({ setView, onLogout }) {
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

  const itemsPerPage = 10;

  // Show alert modal
  const showAlert = (title, message, type = "info") => {
    setAlertModal({ show: true, title, message, type });
  };

  // Fetch archived reservations - FIXED ENDPOINT
  const fetchArchivedReservations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/archived/all`);
      setArchivedReservations(res.data);
      // Clear selections when fetching new data
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
      const filteredIds = filteredReservations.map(res => res._id);
      setSelectedReservations(filteredIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectReservation = (reservationId) => {
    setSelectedReservations(prev => {
      if (prev.includes(reservationId)) {
        const newSelected = prev.filter(id => id !== reservationId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, reservationId];
        // Check if all filtered reservations are selected
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
        showAlert(
          "Success", 
          `Successfully restored Reservations.`, 
          "success"
        );
        
        // Refresh archived list
        fetchArchivedReservations();
        
        // Clear selections
        setSelectedReservations([]);
        setSelectAll(false);
        
        // Tell AdminReservations to refresh
        window.dispatchEvent(new Event("reservationRestored"));
      } else {
        throw new Error(response.data.message || "Failed to restore reservations");
      }
    } catch (err) {
      console.error("Bulk restore error:", err);
      showAlert(
        "Error", 
        err.response?.data?.message || "Failed to restore reservations. Please try again.", 
        "error"
      );
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkRestoreConfirm(false);
    }
  };

  const handleBulkRestoreCancel = () => {
    setShowBulkRestoreConfirm(false);
  };

  // Bulk Delete Handler
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
        showAlert(
          "Success", 
          `Successfully deleted ${response.data.count} archived reservations.`, 
          "success"
        );
        
        // Refresh archived list
        fetchArchivedReservations();
        
        // Clear selections
        setSelectedReservations([]);
        setSelectAll(false);
      } else {
        throw new Error(response.data.message || "Failed to delete reservations");
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      showAlert(
        "Error", 
        err.response?.data?.message || "Failed to delete reservations. Please try again.", 
        "error"
      );
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleBulkDeleteCancel = () => {
    setShowBulkDeleteConfirm(false);
  };

  // Restore reservation - FIXED ENDPOINT
  const handleRestore = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/archived/${id}/restore`);
      showAlert("Success", "Reservation restored successfully.", "success");

      // Refresh archived list
      fetchArchivedReservations();

      // 🔑 Tell AdminReservations to refresh
      window.dispatchEvent(new Event("reservationRestored"));
    } catch (err) {
      console.error("Failed to restore reservation:", err);
      const errorMessage = err.response?.data?.message || "Failed to restore reservation.";
      showAlert("Error", errorMessage, "error");
    }
  };

  // Permanently delete reservation - FIXED ENDPOINT
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/reservations/archived/${id}`);
      showAlert("Success", "Reservation permanently deleted.", "success");
      fetchArchivedReservations();
    } catch (err) {
      console.error("Failed to delete reservation:", err);
      const errorMessage = err.response?.data?.message || "Failed to delete reservation.";
      showAlert("Error", errorMessage, "error");
    }
  };

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

  // Get unique statuses for filter
  const statusOptions = ["all", ...new Set(archivedReservations.map(r => r.status))];

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminArchived" onLogout={onLogout} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">Archived Reservations</h1>
          <p className="text-gray-600">View and manage archived reservation records</p>
        </header>

        <div className="p-6">
          {/* Search & Sort & Filter */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by room, location, user name, ID number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:outline-none"
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

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:outline-none appearance-none cursor-pointer"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status === "all" ? "All Statuses" : status}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="newest">Newest Archived</option>
                  <option value="oldest">Oldest Archived</option>
                  <option value="room-az">Room A-Z</option>
                  <option value="room-za">Room Z-A</option>
                  <option value="user-az">User A-Z</option>
                  <option value="user-za">User Z-A</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>

            {/* Bulk Actions Row */}
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
                  {selectedReservations.length} reservation{selectedReservations.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {selectedReservations.length > 0 && (
                <>
                  <button
                    onClick={handleBulkRestoreClick}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm"
                  >
                    <RotateCcw size={16} />
                    <span>Restore Selected</span>
                  </button>
                  <button
                    onClick={handleBulkDeleteClick}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer text-sm"
                  >
                    <Trash2 size={16} />
                    <span>Delete Selected</span>
                  </button>
                </>
              )}

              <div className="flex-1"></div>

              <button
                onClick={fetchArchivedReservations}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Reservations List */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Archived Reservations List</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredReservations.length} {filteredReservations.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {loading ? (
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC0000] mx-auto"></div>
                <p className="mt-2 text-gray-500 font-bold">Loading archived reservations...</p>
              </div>
            ) : paginatedReservations.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No archived reservations found</h3>
                <p className="mt-1 text-sm text-gray-500">All reservations are currently active or no reservations have been archived yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <button
                          onClick={handleSelectAll}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          {selectAll ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archived On</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedReservations.map((reservation, index) => (
                      <tr key={reservation._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 whitespace-nowrap">
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
                        </td>
                        <td className="p-3 text-gray-700">{(page - 1) * itemsPerPage + index + 1}</td>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{reservation.roomName}</div>
                          <div className="text-xs text-gray-500">{reservation.location}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{reservation.userId?.name}</div>
                          <div className="text-xs text-gray-500">{reservation.userId?.id_number}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-900">{formatDate(reservation.datetime)}</div>
                          <div className="text-xs text-gray-500">
                            {reservation.datetime && new Date(reservation.datetime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-gray-600">
                          {calculateDuration(reservation.datetime, reservation.endDatetime)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              reservation.status === "Completed"
                                ? "bg-green-100 text-green-800"
                                : reservation.status === "Approved"
                                ? "bg-blue-100 text-blue-800"
                                : reservation.status === "Cancelled"
                                ? "bg-gray-100 text-gray-800"
                                : reservation.status === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : reservation.status === "Expired"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {reservation.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 text-sm">
                          {formatDateTime(reservation.archivedAt)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer outline-0"
                              onClick={() => setViewReservation(reservation)}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="text-green-600 hover:text-green-800 p-2 rounded-md bg-green-50 hover:bg-green-100 transition-all cursor-pointer outline-0"
                              onClick={() => setRestoreConfirm(reservation)}
                              title="Restore"
                            >
                              <RotateCcw size={16} />
                            </button>
                            
                            <button
                              className="text-red-600 hover:text-red-800 p-2 rounded-md bg-red-50 hover:bg-red-100 transition-all cursor-pointer outline-0"
                              onClick={() => setDeleteConfirm(reservation)}
                              title="Delete Permanently"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredReservations.length > 0 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredReservations.length)} of {filteredReservations.length} entries
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer outline-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            page === pageNum
                              ? "bg-[#CC0000] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } transition-colors cursor-pointer outline-0`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer outline-0"
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Restore Confirmation Modal */}
          {restoreConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <RotateCcw size={24} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Confirm Restore</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to restore the reservation for room "<span className="font-semibold">{restoreConfirm.roomName}</span>" by {restoreConfirm.userId?.name}?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer outline-0"
                    onClick={() => setRestoreConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer outline-0"
                    onClick={() => {
                      handleRestore(restoreConfirm._id);
                      setRestoreConfirm(null);
                    }}
                  >
                    Restore
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 size={24} className="text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Confirm Delete</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to permanently delete the reservation for room "<span className="font-semibold">{deleteConfirm.roomName}</span>" by {deleteConfirm.userId?.name}? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer outline-0"
                    onClick={() => setDeleteConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer outline-0"
                    onClick={() => {
                      handleDelete(deleteConfirm._id);
                      setDeleteConfirm(null);
                    }}
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Restore Confirmation Modal */}
          {showBulkRestoreConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <RotateCcw size={24} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Restore Multiple Reservations</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to restore {selectedReservations.length} selected reservation{selectedReservations.length !== 1 ? 's' : ''}?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer outline-0"
                    onClick={handleBulkRestoreCancel}
                    disabled={isBulkActionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer outline-0 flex items-center gap-2"
                    onClick={handleBulkRestoreConfirm}
                    disabled={isBulkActionLoading}
                  >
                    {isBulkActionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Restoring...
                      </>
                    ) : (
                      'Restore All'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Delete Confirmation Modal */}
          {showBulkDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle size={24} className="text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Delete Multiple Reservations</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to permanently delete {selectedReservations.length} selected reservation{selectedReservations.length !== 1 ? 's' : ''}? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer outline-0"
                    onClick={handleBulkDeleteCancel}
                    disabled={isBulkActionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer outline-0 flex items-center gap-2"
                    onClick={handleBulkDeleteConfirm}
                    disabled={isBulkActionLoading}
                  >
                    {isBulkActionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete All'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Reservation Modal */}
          {viewReservation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Reservation Details</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 cursor-pointer outline-0"
                    onClick={() => setViewReservation(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
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
                        <p className="text-gray-900">{viewReservation.userId?.role}</p>
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
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            viewReservation.status === "Completed"
                              ? "bg-green-100 text-green-800"
                              : viewReservation.status === "Approved"
                              ? "bg-blue-100 text-blue-800"
                              : viewReservation.status === "Cancelled"
                              ? "bg-gray-100 text-gray-800"
                              : viewReservation.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : viewReservation.status === "Expired"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {viewReservation.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Archived On</label>
                      <p className="text-gray-900">{formatDateTime(viewReservation.archivedAt)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer outline-0"
                    onClick={() => setViewReservation(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Alert Modal */}
      {alertModal.show && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => setAlertModal({ show: false, title: "", message: "", type: "info" })}
        />
      )}

      {/* Loading Overlay for Bulk Actions */}
      {isBulkActionLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Processing
              </h3>
              <p className="text-gray-600 text-center">
                Please wait while we process your request...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Alert Modal Component
function AlertModal({ title, message, type = "info", onClose }) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full max-w-md border ${getBackgroundColor()}`}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {getIcon()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-gray-600 mt-1">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm cursor-pointer outline-0"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminArchived;