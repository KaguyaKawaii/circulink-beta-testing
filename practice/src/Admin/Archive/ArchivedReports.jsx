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

function ArchivedReports({ setView, onLogout }) {
  const [archivedReports, setArchivedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewReport, setViewReport] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });
  
  // Selection State
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkRestoreConfirm, setShowBulkRestoreConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const itemsPerPage = 10;

  // Show alert modal
  const showAlert = (title, message, type = "info") => {
    setAlertModal({ show: true, title, message, type });
  };

  // Fetch archived reports
  const fetchArchivedReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports/archived`);
      setArchivedReports(res.data || []);
      // Clear selections when fetching new data
      setSelectedReports([]);
      setSelectAll(false);
    } catch (err) {
      console.error("❌ Failed to fetch archived reports:", err);
      showAlert("Error", "Failed to load archived reports.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedReports();
  }, []);

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReports([]);
    } else {
      const filteredIds = filteredReports.map(report => report._id);
      setSelectedReports(filteredIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectReport = (reportId) => {
    setSelectedReports(prev => {
      if (prev.includes(reportId)) {
        const newSelected = prev.filter(id => id !== reportId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, reportId];
        // Check if all filtered reports are selected
        if (newSelected.length === filteredReports.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  // Bulk Restore Handler
  const handleBulkRestoreClick = () => {
    if (selectedReports.length === 0) {
      showAlert("No Reports Selected", "Please select at least one report to restore.", "warning");
      return;
    }
    setShowBulkRestoreConfirm(true);
  };

  const handleBulkRestoreConfirm = async () => {
    if (selectedReports.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      // Get current user ID
      const currentUser = JSON.parse(localStorage.getItem("user")); 
      const restoredBy = currentUser?._id || null;
      
      // Use Promise.all to restore all selected reports
      const restorePromises = selectedReports.map(id => 
        axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${id}/restore`, {
          restoredBy: restoredBy
        })
      );
      
      await Promise.all(restorePromises);
      
      showAlert(
        "Success", 
        `Successfully restored ${selectedReports.length} report${selectedReports.length !== 1 ? 's' : ''}.`, 
        "success"
      );
      
      // Refresh archived list
      fetchArchivedReports();
      
      // Clear selections
      setSelectedReports([]);
      setSelectAll(false);
      
    } catch (err) {
      console.error("Bulk restore error:", err);
      showAlert(
        "Error", 
        err.response?.data?.message || "Failed to restore reports. Please try again.", 
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
    if (selectedReports.length === 0) {
      showAlert("No Reports Selected", "Please select at least one report to delete.", "warning");
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedReports.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      // Get current user ID
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const deletedBy = currentUser?._id || null;
      
      // Use Promise.all to delete all selected reports
      const deletePromises = selectedReports.map(id => 
        axios.delete(`${import.meta.env.VITE_API_URL}/api/reports/${id}`, {
          data: { deletedBy: deletedBy }
        })
      );
      
      await Promise.all(deletePromises);
      
      showAlert(
        "Success", 
        `Successfully deleted ${selectedReports.length} archived report${selectedReports.length !== 1 ? 's' : ''}.`, 
        "success"
      );
      
      // Refresh archived list
      fetchArchivedReports();
      
      // Clear selections
      setSelectedReports([]);
      setSelectAll(false);
      
    } catch (err) {
      console.error("Bulk delete error:", err);
      showAlert(
        "Error", 
        err.response?.data?.message || "Failed to delete reports. Please try again.", 
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

  // Restore report
  const handleRestore = async (id) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user")); 
      const restoredBy = currentUser?._id || null;
      
      await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${id}/restore`, {
        restoredBy: restoredBy
      });
      showAlert("Success", "Report restored successfully.", "success");
      fetchArchivedReports();
    } catch (err) {
      console.error("❌ Failed to restore report:", err);
      showAlert("Error", "Failed to restore report.", "error");
    }
  };

  // Delete report permanently
  const handleDelete = async (id) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const deletedBy = currentUser?._id || null;
      
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/reports/${id}`, {
        data: { deletedBy: deletedBy }
      });
      showAlert("Success", "Report permanently deleted.", "success");
      fetchArchivedReports();
    } catch (err) {
      console.error("❌ Failed to delete report:", err);
      showAlert("Error", "Failed to delete report.", "error");
    }
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
  const filteredReports = archivedReports
    .filter(report => {
      const matchesSearch = 
        report.reportedBy?.toLowerCase().includes(search.toLowerCase()) ||
        report.category?.toLowerCase().includes(search.toLowerCase()) ||
        report.details?.toLowerCase().includes(search.toLowerCase()) ||
        report.floor?.toLowerCase().includes(search.toLowerCase()) ||
        report.room?.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || report.category === categoryFilter;
      const matchesFloor = floorFilter === "all" || report.floor === floorFilter;
      
      return matchesSearch && matchesCategory && matchesFloor;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sortBy === "oldest") return new Date(a.updatedAt) - new Date(b.updatedAt);
      if (sortBy === "category-az") return a.category.localeCompare(b.category);
      if (sortBy === "category-za") return b.category.localeCompare(a.category);
      if (sortBy === "reporter-az") return a.reportedBy.localeCompare(b.reportedBy);
      if (sortBy === "reporter-za") return b.reportedBy.localeCompare(a.reportedBy);
      return 0;
    });

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Get unique values for filters
  const categoryOptions = ["all", ...new Set(archivedReports.map(r => r.category))];
  const floorOptions = ["all", ...new Set(archivedReports.map(r => r.floor).filter(Boolean))];

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminArchivedReports" onLogout={onLogout}/>
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">Archived Reports</h1>
          <p className="text-gray-600">View and manage archived reports</p>
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
                  placeholder="Search by reporter, category, details, floor, room..."
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

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:outline-none appearance-none cursor-pointer"
                >
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Floor Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:outline-none appearance-none cursor-pointer"
                >
                  {floorOptions.map(floor => (
                    <option key={floor} value={floor}>
                      {floor === "all" ? "All Floors" : floor || "No Floor"}
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
                  <option value="category-az">Category A-Z</option>
                  <option value="category-za">Category Z-A</option>
                  <option value="reporter-az">Reporter A-Z</option>
                  <option value="reporter-za">Reporter Z-A</option>
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
                  {selectedReports.length} report{selectedReports.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {selectedReports.length > 0 && (
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
                onClick={fetchArchivedReports}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Reports List */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Archived Reports List</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
              </span>
            </div>

            {loading ? (
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC0000] mx-auto"></div>
                <p className="mt-2 text-gray-500 font-bold">Loading archived reports...</p>
              </div>
            ) : paginatedReports.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No archived reports found</h3>
                <p className="mt-1 text-sm text-gray-500">All reports are currently active or no reports have been archived yet.</p>
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
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported By</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archived On</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedReports.map((report, index) => (
                      <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 whitespace-nowrap">
                          <button
                            onClick={() => handleSelectReport(report._id)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {selectedReports.includes(report._id) ? (
                              <CheckSquare size={18} className="text-[#CC0000]" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-gray-700">{(page - 1) * itemsPerPage + index + 1}</td>
                        <td className="p-3 font-medium text-gray-900">{report.reportedBy}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              report.category === "Maintenance"
                                ? "bg-blue-100 text-blue-800"
                                : report.category === "Cleaning"
                                ? "bg-green-100 text-green-800"
                                : report.category === "Safety"
                                ? "bg-orange-100 text-orange-800"
                                : report.category === "Equipment"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {report.category}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 max-w-xs">
                          <div className="truncate" title={report.details}>
                            {report.details}
                          </div>
                        </td>
                        <td className="p-3 text-gray-600">
                          <div className="font-medium">{report.room}</div>
                          {report.floor && (
                            <div className="text-xs text-gray-500">Floor {report.floor}</div>
                          )}
                        </td>
                        <td className="p-3 text-gray-500 text-sm">
                          {formatDateTime(report.updatedAt)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer outline-0"
                              onClick={() => setViewReport(report)}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="text-green-600 hover:text-green-800 p-2 rounded-md bg-green-50 hover:bg-green-100 transition-all cursor-pointer outline-0"
                              onClick={() => setRestoreConfirm(report)}
                              title="Restore"
                            >
                              <RotateCcw size={16} />
                            </button>
                            
                            <button
                              className="text-red-600 hover:text-red-800 p-2 rounded-md bg-red-50 hover:bg-red-100 transition-all cursor-pointer outline-0"
                              onClick={() => setDeleteConfirm(report)}
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
            {filteredReports.length > 0 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredReports.length)} of {filteredReports.length} entries
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
                  Are you sure you want to restore the <span className="font-semibold">{restoreConfirm.category}</span> report from {restoreConfirm.reportedBy}?
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
                  Are you sure you want to permanently delete the <span className="font-semibold">{deleteConfirm.category}</span> report from {deleteConfirm.reportedBy}? This action cannot be undone.
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
                  <h2 className="text-xl font-bold text-gray-800">Restore Multiple Reports</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to restore {selectedReports.length} selected report{selectedReports.length !== 1 ? 's' : ''}?
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
                  <h2 className="text-xl font-bold text-gray-800">Delete Multiple Reports</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to permanently delete {selectedReports.length} selected report{selectedReports.length !== 1 ? 's' : ''}? This action cannot be undone.
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

          {/* View Report Modal */}
          {viewReport && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Report Details</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 cursor-pointer outline-0"
                    onClick={() => setViewReport(null)}
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        viewReport.category === "Maintenance"
                          ? "bg-blue-100 text-blue-800"
                          : viewReport.category === "Cleaning"
                          ? "bg-green-100 text-green-800"
                          : viewReport.category === "Safety"
                          ? "bg-orange-100 text-orange-800"
                          : viewReport.category === "Equipment"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {viewReport.category}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500">
                    Archived on: {formatDateTime(viewReport.updatedAt)}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Reported By</label>
                        <p className="text-gray-900">{viewReport.reportedBy}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Category</label>
                        <p className="text-gray-900">{viewReport.category}</p>
                      </div>
                      
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Room</label>
                        <p className="text-gray-900">{viewReport.room || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Floor</label>
                        <p className="text-gray-900">{viewReport.floor || "—"}</p>
                      </div>
                      
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{viewReport.details}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer outline-0"
                    onClick={() => setViewReport(null)}
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

export default ArchivedReports;