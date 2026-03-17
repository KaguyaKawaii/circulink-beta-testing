import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminNavigation from "../AdminNavigation";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  RotateCcw,
  AlertTriangle,
  Filter,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  FileText,
  Calendar
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

function ArchivedReports({ setView, admin }) {
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

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    archivedThisWeek: 0,
    categories: {}
  });

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
      const data = res.data || [];
      setArchivedReports(data);
      
      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const categoryCount = {};
      
      data.forEach(report => {
        categoryCount[report.category] = (categoryCount[report.category] || 0) + 1;
      });
      
      setStats({
        total: data.length,
        archivedThisWeek: data.filter(item => new Date(item.updatedAt) > weekAgo).length,
        categories: categoryCount
      });
      
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
      setSelectedReports(filteredReports.map(report => report._id));
    }
    setSelectAll(!selectAll);
  };

  const handleClearAll = () => {
    setSelectedReports([]);
    setSelectAll(false);
  };

  const handleSelectReport = (reportId) => {
    setSelectedReports(prev => {
      if (prev.includes(reportId)) {
        const newSelected = prev.filter(id => id !== reportId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, reportId];
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
      const currentUser = JSON.parse(localStorage.getItem("user")); 
      const restoredBy = currentUser?._id || null;
      
      await Promise.all(
        selectedReports.map(id => 
          axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${id}/restore`, {
            restoredBy: restoredBy
          })
        )
      );
      
      showAlert("Success", `Successfully restored ${selectedReports.length} report${selectedReports.length !== 1 ? 's' : ''}.`, "success");
      fetchArchivedReports();
      handleClearAll();
    } catch (err) {
      console.error("Bulk restore error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to restore reports.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkRestoreConfirm(false);
    }
  };

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
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const deletedBy = currentUser?._id || null;
      
      await Promise.all(
        selectedReports.map(id => 
          axios.delete(`${import.meta.env.VITE_API_URL}/api/reports/${id}`, {
            data: { deletedBy: deletedBy }
          })
        )
      );
      
      showAlert("Success", `Successfully deleted ${selectedReports.length} archived report${selectedReports.length !== 1 ? 's' : ''}.`, "success");
      fetchArchivedReports();
      handleClearAll();
    } catch (err) {
      console.error("Bulk delete error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to delete reports.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkDeleteConfirm(false);
    }
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

  const handleBulkRestoreCancel = () => setShowBulkRestoreConfirm(false);
  const handleBulkDeleteCancel = () => setShowBulkDeleteConfirm(false);

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
    const data = filteredReports.map(report => ({
      'Reported By': report.reportedBy,
      'Category': report.category,
      'Details': report.details,
      'Room': report.room,
      'Floor': report.floor || 'N/A',
      'Archived On': formatDateTime(report.updatedAt)
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
      a.download = `archived-reports-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
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

const categoryOptions = [
  { value: "all", label: "All Categories" },
  ...Array.from(new Set(archivedReports.map(r => r.category))).map(cat => ({ 
    value: cat, 
    label: cat 
  }))
];
  
const floorOptions = [
  { value: "all", label: "All Floors" },
  ...Array.from(new Set(archivedReports.map(r => r.floor).filter(Boolean))).map(floor => ({ 
    value: floor, 
    label: floor 
  }))
];

  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest Archived" },
    { value: "oldest", label: "Oldest Archived" },
    { value: "category-az", label: "Category A-Z" },
    { value: "category-za", label: "Category Z-A" },
    { value: "reporter-az", label: "Reporter A-Z" },
    { value: "reporter-za", label: "Reporter Z-A" }
  ];

  // Filter configurations for FilterBar
  const filters = [
    {
      value: categoryFilter,
      onChange: setCategoryFilter,
      options: categoryOptions,
      icon: Filter
    },
    {
      value: floorFilter,
      onChange: setFloorFilter,
      options: floorOptions,
      icon: Building2
    }
  ];

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminArchivedReports" onLogout={() => window.dispatchEvent(new Event('showLogoutModal'))} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#CC0000]">Archived Reports</h1>
          <p className="text-gray-600">View and manage archived reports</p>
        </header>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatsCard 
              icon={FileText} 
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
              icon={AlertTriangle} 
              label="Categories" 
              value={Object.keys(stats.categories).length} 
              color="purple"
            />
          </div>

{/* Filter Bar */}
<FilterBar
  search={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search by reporter, category, details, floor, room..."
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
      onClick={fetchArchivedReports}
    >
      Refresh
    </Button>
  </div>
</FilterBar>

          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedCount={selectedReports.length}
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

          {/* Reports List */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Archived Reports List</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
              </span>
            </div>

            {loading ? (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Select</TableHeaderCell>
                    <TableHeaderCell>#</TableHeaderCell>
                    <TableHeaderCell>Reported By</TableHeaderCell>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Details</TableHeaderCell>
                    <TableHeaderCell>Location</TableHeaderCell>
                    <TableHeaderCell>Archived On</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  <TableSkeleton rows={5} columns={8} />
                </TableBody>
              </Table>
            ) : paginatedReports.length === 0 ? (
              <EmptyState
  type="reports"
  icon={FileText}
  title="No archived reports found"
  message="Reports you archive will appear here for future reference."
  action={
    <div className="flex justify-center">
      <Button variant="primary" onClick={fetchArchivedReports}>
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
                      <TableHeaderCell>Reported By</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell>Details</TableHeaderCell>
                      <TableHeaderCell>Location</TableHeaderCell>
                      <TableHeaderCell>Archived On</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {paginatedReports.map((report, index) => (
                      <TableRow key={report._id}>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {(page - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {report.reportedBy}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={report.category} />
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-gray-600" title={report.details}>
                            {report.details}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{report.room}</div>
                          {report.floor && (
                            <div className="text-xs text-gray-500">Floor {report.floor}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {formatDateTime(report.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <IconButton
                              icon={Eye}
                              onClick={() => setViewReport(report)}
                              tooltip="View Details"
                              color="blue"
                            />
                            <IconButton
                              icon={RotateCcw}
                              onClick={() => setRestoreConfirm(report)}
                              tooltip="Restore"
                              color="green"
                            />
                            <IconButton
                              icon={Trash2}
                              onClick={() => setDeleteConfirm(report)}
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
                  totalItems={filteredReports.length}
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
            message={`Are you sure you want to restore the ${restoreConfirm?.category} report from ${restoreConfirm?.reportedBy}?`}
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
            message={`Are you sure you want to permanently delete the ${deleteConfirm?.category} report from ${deleteConfirm?.reportedBy}? This action cannot be undone.`}
            type="danger"
          />

          <ConfirmModal
            isOpen={showBulkRestoreConfirm}
            onClose={handleBulkRestoreCancel}
            onConfirm={handleBulkRestoreConfirm}
            title="Restore Multiple Reports"
            message={`Are you sure you want to restore ${selectedReports.length} selected report${selectedReports.length !== 1 ? 's' : ''}?`}
            type="restore"
            loading={isBulkActionLoading}
          />

          <ConfirmModal
            isOpen={showBulkDeleteConfirm}
            onClose={handleBulkDeleteCancel}
            onConfirm={handleBulkDeleteConfirm}
            title="Delete Multiple Reports"
            message={`Are you sure you want to permanently delete ${selectedReports.length} selected report${selectedReports.length !== 1 ? 's' : ''}? This action cannot be undone.`}
            type="danger"
            loading={isBulkActionLoading}
          />

          {/* View Report Modal */}
          <ViewModal
            isOpen={!!viewReport}
            onClose={() => setViewReport(null)}
            title="Report Details"
          >
            {viewReport && (
              <>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    <StatusBadge status={viewReport.category} className="text-sm" />
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

export default ArchivedReports;