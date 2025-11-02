import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminNavigation from "./AdminNavigation";
import { Eye, RefreshCw, Search, ChevronDown, X, Trash2, Download, Filter, Save, ChevronLeft, ChevronRight, ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react";
import {
  Clock,
  MapPin,
  Calendar,
  FileText,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  Wrench,
  AlertTriangle
} from "lucide-react";

function AdminReports({ setView, onLogout }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [categories, setCategories] = useState([]);
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });
  const [archiveConfirmModal, setArchiveConfirmModal] = useState({ show: false, report: null });
  const [isArchiving, setIsArchiving] = useState(false);
  
  // New state for enhanced features
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedReports, setSelectedReports] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterPresets, setFilterPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Improved date formatting function
  const formatPHDateTime = (date) => {
    if (!date) return "—";
    
    try {
      const dateObj = new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        console.warn("Invalid date:", date);
        return "—";
      }
      
      return dateObj.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date:", date, error);
      return "—";
    }
  };

  // Format date for table (date only)
  const formatDateOnly = (date) => {
    if (!date) return "—";
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "—";
      
      return dateObj.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "—";
    }
  };

  // Load filter presets from localStorage on component mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('reportFilterPresets');
    if (savedPresets) {
      setFilterPresets(JSON.parse(savedPresets));
    }
    fetchReports();
  }, []);

  const fetchReports = () => {
    setIsLoading(true);
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/reports`)
      .then((res) => {
        console.log("Full response:", res);
        console.log("Response data type:", typeof res.data);
        console.log("Response data:", res.data);
        console.log("Is array?", Array.isArray(res.data));
        
        let reportsData = res.data;
        
        if (!Array.isArray(reportsData)) {
          const possibleArrays = Object.values(res.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            reportsData = possibleArrays[0];
            console.log("Found array in property:", reportsData);
          }
        }
        
        if (!Array.isArray(reportsData)) {
          console.error("Could not find reports array in response");
          setReports([]);
          setCategories([]);
          return;
        }
        
        // Filter out archived reports and sort by creation date
        const activeReports = reportsData
          .filter(report => report.status !== "Archived")
          .map(report => ({
            ...report,
            createdAt: report.createdAt ? new Date(report.createdAt) : new Date(0)
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        
        setReports(activeReports);
        const uniqueCategories = [...new Set(activeReports.map(report => report.category).filter(Boolean))];
        setCategories(uniqueCategories.sort());
        setSelectedReports([]); // Clear selections when reports are refreshed
      })
      .catch((err) => {
        console.error("Fetch reports error:", err);
        setReports([]);
        setCategories([]);
        showAlert("Error", "Failed to fetch reports: " + (err.response?.data?.message || err.message), "error");
      })
      .finally(() => setIsLoading(false));
  };

  const showAlert = (title, message, type = "info") => {
    setAlertModal({ show: true, title, message, type });
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "Pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case "Resolved":
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      case "Archived":
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-300`;
      case "In Progress":
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-300`;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return <Clock size={12} className="mr-1" />;
      case "In Progress":
        return <Wrench size={12} className="mr-1" />;
      case "Resolved":
        return <CheckCircle size={12} className="mr-1" />;
      default:
        return <AlertCircle size={12} className="mr-1" />;
    }
  };

  // Archive report directly from table
  const handleArchiveFromTable = (report) => {
    setArchiveConfirmModal({ show: true, report });
  };

  const handleArchiveConfirm = async () => {
    const { report } = archiveConfirmModal;
    if (!report) return;

    try {
      setIsArchiving(true);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const archivedBy = currentUser._id || "admin";
      
      await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${report._id}/archive`, {
        archivedBy: archivedBy
      });
      
      showAlert("Success", "Report archived successfully!", "success");
      fetchReports(); // Refresh the list - archived reports will be automatically hidden
      setArchiveConfirmModal({ show: false, report: null });
    } catch (err) {
      console.error("Error archiving report:", err);
      showAlert("Error", "Failed to archive report: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleArchiveCancel = () => {
    setArchiveConfirmModal({ show: false, report: null });
  };

  // Enhanced filtering with sorting
  const filteredAndSortedReports = React.useMemo(() => {
    let filtered = reports.filter((report) => {
      const matchesStatus = statusFilter === "All" || report.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || report.category === categoryFilter;
      const matchesSearch =
        (report.category || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.reportedBy || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.floor || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.room || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.details || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.assignedTo?.name || "").toLowerCase().includes(search.toLowerCase());
      
      const matchesDate = (() => {
        if (dateFilter === "All") return true;
        
        const reportDate = new Date(report.createdAt);
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        switch (dateFilter) {
          case "Newer":
            return reportDate >= oneWeekAgo;
          case "Older":
            return reportDate < oneMonthAgo;
          case "Recent":
            return reportDate >= oneMonthAgo;
          default:
            return true;
        }
      })();
      
      return matchesStatus && matchesCategory && matchesSearch && matchesDate;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested objects and special cases
        if (sortConfig.key === 'assignedTo') {
          aValue = a.assignedTo?.name || 'Unassigned';
          bValue = b.assignedTo?.name || 'Unassigned';
        } else if (sortConfig.key === 'details') {
          aValue = a.details || '';
          bValue = b.details || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [reports, statusFilter, categoryFilter, dateFilter, search, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage);
  const paginatedReports = filteredAndSortedReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronDownIcon size={14} className="text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp size={14} className="text-gray-600" /> : 
      <ChevronDown size={14} className="text-gray-600" />;
  };

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReports(paginatedReports.map(report => report._id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleSelectReport = (reportId) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleBulkArchive = async () => {
    if (selectedReports.length === 0) {
      showAlert("Warning", "Please select reports to archive.", "warning");
      return;
    }

    try {
      setIsArchiving(true);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const archivedBy = currentUser._id || "admin";

      const archivePromises = selectedReports.map(reportId =>
        axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${reportId}/archive`, {
          archivedBy: archivedBy
        })
      );

      await Promise.all(archivePromises);
      
      showAlert("Success", `${selectedReports.length} reports archived successfully!`, "success");
      fetchReports();
      setSelectedReports([]);
    } catch (err) {
      console.error("Error bulk archiving reports:", err);
      showAlert("Error", "Failed to archive reports: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setIsArchiving(false);
    }
  };

  // Filter presets
  const saveFilterPreset = () => {
    if (!presetName.trim()) {
      showAlert("Warning", "Please enter a name for the filter preset.", "warning");
      return;
    }

    const newPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: {
        status: statusFilter,
        category: categoryFilter,
        date: dateFilter,
        search: search
      }
    };

    const updatedPresets = [...filterPresets, newPreset];
    setFilterPresets(updatedPresets);
    localStorage.setItem('reportFilterPresets', JSON.stringify(updatedPresets));
    setShowPresetModal(false);
    setPresetName("");
    showAlert("Success", "Filter preset saved successfully!", "success");
  };

  const loadFilterPreset = (preset) => {
    setStatusFilter(preset.filters.status);
    setCategoryFilter(preset.filters.category);
    setDateFilter(preset.filters.date);
    setSearch(preset.filters.search);
    setCurrentPage(1);
    showAlert("Success", `Filter preset "${preset.name}" loaded!`, "success");
  };

  const deleteFilterPreset = (presetId, e) => {
    e.stopPropagation();
    const updatedPresets = filterPresets.filter(preset => preset.id !== presetId);
    setFilterPresets(updatedPresets);
    localStorage.setItem('reportFilterPresets', JSON.stringify(updatedPresets));
    showAlert("Success", "Filter preset deleted!", "success");
  };

  // Export functionality
  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      
      // Create CSV content
      const headers = ['Category', 'Reported By', 'Floor', 'Room', 'Status', 'Date Reported', 'Details', 'Assigned Staff'];
      const csvContent = [
        headers.join(','),
        ...filteredAndSortedReports.map(report => [
          `"${report.category || ''}"`,
          `"${report.reportedBy || ''}"`,
          `"${report.floor || ''}"`,
          `"${report.room || ''}"`,
          `"${report.status || ''}"`,
          `"${formatDateOnly(report.createdAt)}"`,
          `"${(report.details || '').replace(/"/g, '""')}"`,
          `"${report.assignedTo?.name || 'Unassigned'}"`
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reports_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showAlert("Success", "Reports exported successfully!", "success");
    } catch (err) {
      console.error("Error exporting reports:", err);
      showAlert("Error", "Failed to export reports: " + err.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Truncate long text for table display
  const truncateText = (text, maxLength = 50) => {
    if (!text) return "—";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminReports" onLogout={onLogout}/>
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                Report Management
              </h1>
              <p className="text-gray-600">
                Manage, assign, and resolve facility reports
              </p>
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
          {/* Bulk Actions Bar */}
          {selectedReports.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {selectedReports.length}
                    </span>
                  </div>
                  <span className="text-blue-800 font-medium">
                    {selectedReports.length} report{selectedReports.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkArchive}
                    disabled={isArchiving}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                    {isArchiving ? 'Archiving...' : `Archive ${selectedReports.length} Reports`}
                  </button>
                  <button
                    onClick={() => setSelectedReports([])}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by category, reported by, location, problem, or assigned staff..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0 "
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

              {/* Status filter - Clear separation between Pending and In Progress */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Category filter */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0"
                >
                  <option value="All">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Date filter */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0"
                >
                  <option value="All">All Dates</option>
                  <option value="Newer">Newer (Last 7 days)</option>
                  <option value="Recent">Recent (Last 30 days)</option>
                  <option value="Older">Older (30+ days)</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Save Preset
                <button
                  onClick={() => setShowPresetModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Save current filters as preset"
                >
                  <Save size={16} />
                  Save
                </button> */}

                {/* Export */}
                <button
                  onClick={exportToCSV}
                  disabled={isExporting || filteredAndSortedReports.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Download size={16} />
                  {isExporting ? 'Exporting...' : 'Export'}
                </button>

                {/* Refresh */}
                <button
                  onClick={fetchReports}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <RefreshCw size={16} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Filter Presets */}
            {filterPresets.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Filter size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Saved Filters:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterPresets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => loadFilterPreset(preset)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors cursor-pointer group"
                    >
                      {preset.name}
                      <button
                        onClick={(e) => deleteFilterPreset(preset.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium w-8">
                      <input
                        type="checkbox"
                        checked={selectedReports.length === paginatedReports.length && paginatedReports.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </th>
                    <th 
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1">
                        Category
                        {getSortIcon('category')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Problem Details
                    </th>
                    <th 
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('reportedBy')}
                    >
                      <div className="flex items-center gap-1">
                        Reported By
                        {getSortIcon('reportedBy')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Location</th>
                    <th 
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('assignedTo')}
                    >
                      <div className="flex items-center gap-1">
                        Assigned Staff
                        {getSortIcon('assignedTo')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Date Reported
                        {getSortIcon('createdAt')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                          <span className="text-sm">Loading reports...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedReports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <FileText size={48} className="text-gray-300 mb-2" />
                          <span className="text-sm">No reports found matching your criteria</span>
                          {(search || statusFilter !== "All" || categoryFilter !== "All" || dateFilter !== "All") && (
                            <button
                              onClick={() => {
                                setSearch("");
                                setStatusFilter("All");
                                setCategoryFilter("All");
                                setDateFilter("All");
                              }}
                              className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer"
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedReports.map((report, i) => (
                      <tr key={report._id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedReports.includes(report._id)}
                            onChange={() => handleSelectReport(report._id)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{report.category}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-[200px]">
                            <div className="text-gray-900 font-medium mb-1">
                              {truncateText(report.details, 60)}
                            </div>
                            {report.details && report.details.length > 60 && (
                              <button
                                onClick={() => setSelectedReport(report)}
                                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                              >
                                View full details
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            <span className="text-gray-900">{report.reportedBy}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{report.floor}</div>
                              <div className="text-gray-500 text-xs">{report.room}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(report.status)}>
                            {getStatusIcon(report.status)}
                            {report.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {report.assignedTo ? (
                              <>
                                <Users size={14} className="text-gray-400" />
                                <span className="text-gray-900">{report.assignedTo.name}</span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-sm">Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="text-gray-900">{formatDateOnly(report.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* View */}
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            
                            {/* Archive */}
                            <button
                              onClick={() => handleArchiveFromTable(report)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                              title="Archive Report"
                              disabled={isLoading}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredAndSortedReports.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedReports.length)} of {filteredAndSortedReports.length} reports
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-red-500 outline-0 bg-white"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === totalPages || 
                        Math.abs(page - currentPage) <= 1
                      )
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-2 text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 rounded text-sm font-medium cursor-pointer transition-colors ${
                                currentPage === page
                                  ? 'bg-red-600 text-white border border-red-600'
                                  : 'border border-gray-300 hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onReportUpdated={fetchReports}
          showAlert={showAlert}
        />
      )}

      {/* Alert Modal */}
      {alertModal.show && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => setAlertModal({ show: false, title: "", message: "", type: "info" })}
        />
      )}

      {/* Archive Confirmation Modal */}
      {archiveConfirmModal.show && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Archive Report
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive the report "{archiveConfirmModal.report?.category}"? This will move it to the archive and remove it from active reports.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleArchiveCancel}
                disabled={isArchiving}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isArchiving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Archiving...
                  </>
                ) : (
                  'Archive'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Filter Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Save className="text-blue-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Save Filter Preset
              </h3>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preset Name
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter a name for this filter preset..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0"
                onKeyPress={(e) => e.key === 'Enter' && saveFilterPreset()}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPresetModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveFilterPreset}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Archive Operation */}
      {isArchiving && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Archiving Report
              </h3>
              <p className="text-gray-600 text-center">
                Please wait while we archive the report...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Updated ReportModal Component with improved date handling
function ReportModal({
  report,
  onClose,
  onReportUpdated,
  showAlert,
}) {
  const [actionTaken, setActionTaken] = useState(report.actionTaken || "");
  const [actionLoading, setActionLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(report.assignedTo?._id || "");
  const [assigning, setAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");

  const API_URL = `${import.meta.env.VITE_API_URL}/api/reports`;
  const USERS_API = `${import.meta.env.VITE_API_URL}/api/users`;

  // Improved date formatting function
  const formatPHDateTime = (iso) => {
    if (!iso) return "N/A";
    
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return "N/A";
      
      return date.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  // 🔹 Fetch staff list - Improved to handle different API responses
  useEffect(() => {
    const fetchStaff = async () => {
      if (!report) return;

      try {
        console.log("Fetching staff for report on floor:", report.floor);
        
        // Try multiple possible endpoints
        const endpoints = [
          `${import.meta.env.VITE_API_URL}/api/users?role=Staff`,
          `${import.meta.env.VITE_API_URL}/api/users?role=Staff`,
          `${import.meta.env.VITE_API_URL}/api/staff`,
          `${import.meta.env.VITE_API_URL}/staff`
        ];
        
        let staffData = [];
        
        for (const endpoint of endpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint}`);
            const res = await axios.get(endpoint);
            console.log("API Response:", res.data);
            
            // Handle different response structures
            if (res.data.success && Array.isArray(res.data.users)) {
              staffData = res.data.users.filter(user => user.role === "Staff");
              break;
            } else if (Array.isArray(res.data)) {
              staffData = res.data.filter(user => user.role === "Staff");
              break;
            } else if (res.data && Array.isArray(res.data.users)) {
              staffData = res.data.users.filter(user => user.role === "Staff");
              break;
            } else if (res.data && Array.isArray(res.data.data)) {
              staffData = res.data.data.filter(user => user.role === "Staff");
              break;
            } else if (res.data.success && Array.isArray(res.data.staff)) {
              staffData = res.data.staff;
              break;
            }
          } catch (err) {
            console.log(`Endpoint ${endpoint} failed:`, err.message);
            continue;
          }
        }
        
        // If all endpoints failed, try the main users endpoint without filter
        if (staffData.length === 0) {
          try {
            console.log("Trying main users endpoint without filter...");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`);
            if (Array.isArray(res.data)) {
              staffData = res.data.filter(user => user.role === "Staff");
            } else if (res.data.success && Array.isArray(res.data.users)) {
              staffData = res.data.users.filter(user => user.role === "Staff");
            }
          } catch (finalErr) {
            console.error("All endpoints failed:", finalErr);
          }
        }

        // If still no staff data, use mock data for testing
        if (staffData.length === 0) {
          console.log("Using mock staff data for testing");
          staffData = [
            { _id: "1", name: "John Doe", role: "Staff", floor: "Ground Floor" },
            { _id: "2", name: "Jane Smith", role: "Staff", floor: "Second Floor" },
            { _id: "3", name: "Mike Johnson", role: "Staff", floor: "Third Floor" },
            { _id: "4", name: "Sarah Wilson", role: "Staff", floor: "Fourth Floor" },
            { _id: "5", name: "David Brown", role: "Staff", floor: "Fifth Floor" }
          ];
        }

        console.log("Final staff data:", staffData);
        
        // Sort staff by name for better organization
        const sortedStaff = staffData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaffList(sortedStaff);
        
      } catch (err) {
        console.error("Failed to fetch staff", err);
        setStaffList([]);
        showAlert("Error", "Failed to fetch staff list: " + (err.response?.data?.message || err.message), "error");
      }
    };

    fetchStaff();
  }, [report, showAlert]);

  // 🔹 Assign staff - FIXED URL
  const handleAssignStaff = async () => {
    if (!selectedStaff || !report) {
      showAlert("Warning", "Please select a staff member to assign.", "warning");
      return;
    }

    try {
      setAssigning(true);
      // FIX: Use the correct endpoint format
      await axios.put(`${API_URL}/${report._id}/assign`, {
        staffId: selectedStaff,
      });
      
      // Refresh report data
      if (onReportUpdated) onReportUpdated();
      
      showAlert("Success", "Report assigned successfully!", "success");
    } catch (err) {
      console.error("Error assigning staff:", err);
      showAlert("Error", "Failed to assign staff: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setAssigning(false);
    }
  };

  // 🔹 Resolve Report - FIXED URL
  const handleResolveReport = async () => {
    if (!report || !actionTaken.trim()) {
      showAlert("Warning", "Please describe the action taken before resolving.", "warning");
      return;
    }

    try {
      setActionLoading(true);
      
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const resolvedBy = currentUser._id || "admin";
      
      // FIX: Use the correct endpoint format
      await axios.put(`${API_URL}/${report._id}/resolve`, {
        actionTaken: actionTaken.trim(),
        resolvedBy: resolvedBy
      });
      
      if (onReportUpdated) onReportUpdated();
      showAlert("Success", "Report resolved successfully!", "success");
      setShowConfirmModal(false);
    } catch (err) {
      console.error("Error resolving report:", err);
      showAlert("Error", "Failed to resolve report: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 🔹 Archive Report - FIXED URL
  const handleArchiveReport = async () => {
    if (!report) return;

    try {
      setActionLoading(true);
      
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const archivedBy = currentUser._id || "admin";
      
      // FIX: Use the correct endpoint format
      await axios.put(`${API_URL}/${report._id}/archive`, {
        archivedBy: archivedBy
      });
      
      showAlert("Success", "Report archived successfully!", "success");
      if (onReportUpdated) onReportUpdated();
      onClose();
      setShowConfirmModal(false);
    } catch (err) {
      console.error("Error archiving report:", err);
      showAlert("Error", "Failed to archive report: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { 
        color: "bg-amber-100 text-amber-800 border-amber-200", 
        icon: <Clock size={14} />,
      },
      "In Progress": { 
        color: "bg-blue-100 text-blue-800 border-blue-200", 
        icon: <Wrench size={14} />,
      },
      Resolved: { 
        color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
        icon: <CheckCircle size={14} />,
      },
      Archived: { 
        color: "bg-gray-100 text-gray-800 border-gray-300", 
        icon: <XCircle size={14} />,
      }
    };
    return configs[status] || configs.Pending;
  };

  const showConfirmation = (action) => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    switch (confirmAction) {
      case "resolve":
        handleResolveReport();
        break;
      case "archive":
        handleArchiveReport();
        break;
      default:
        setShowConfirmModal(false);
    }
  };

  const getConfirmModalConfig = () => {
    switch (confirmAction) {
      case "resolve":
        return {
          title: "Resolve Report",
          message: "Are you sure you want to resolve this report? This action cannot be undone.",
          icon: <CheckCircle className="text-emerald-600" size={24} />,
          confirmText: "Yes, Resolve Report",
          confirmColor: "bg-emerald-600 hover:bg-emerald-700"
        };
      case "archive":
        return {
          title: "Archive Report",
          message: "Are you sure you want to archive this report? This will remove it from active reports.",
          icon: <XCircle className="text-gray-600" size={24} />,
          confirmText: "Yes, Archive Report",
          confirmColor: "bg-gray-600 hover:bg-gray-700"
        };
      default:
        return {
          title: "Confirm Action",
          message: "Are you sure you want to proceed?",
          icon: <AlertCircle className="text-blue-600" size={24} />,
          confirmText: "Confirm",
          confirmColor: "bg-blue-600 hover:bg-blue-700"
        };
    }
  };

  const InfoCard = ({ title, value, icon, subtitle }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
          {icon}
        </div>
      </div>
    </div>
  );

  const renderActionButtons = () => {
    if (!report) return null;

    switch (report.status) {
      case "Pending":
      case "In Progress":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => showConfirmation("archive")}
              disabled={actionLoading || assigning}
              className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2 cursor-pointer"
            >
              <XCircle size={16} />
              Archive
            </button>
            <button
              onClick={() => showConfirmation("resolve")}
              disabled={actionLoading || assigning || !actionTaken.trim()}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle size={16} />
              Resolve Report
            </button>
          </div>
        );

      default:
        return (
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
          >
            Close
          </button>
        );
    }
  };

  const statusConfig = getStatusConfig(report?.status);
  const confirmConfig = getConfirmModalConfig();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-white p-6 border-b border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center border border-red-300">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Report Details</h1>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building size={16} />
                      {report?.floor} • {report?.room}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar size={16} />
                      {report?.createdAt ? formatPHDateTime(report.createdAt) : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-medium ${statusConfig?.color}`}>
                  {statusConfig?.icon}
                  {report?.status}
                </div>
                <button
                  onClick={onClose}
                  disabled={actionLoading || assigning}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {["overview", "actions"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 cursor-pointer  ${
                    activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm hover:bg-gray-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {report ? (
              <>
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoCard
                        title="Category"
                        value={report.category || "N/A"}
                        icon={<FileText size={20} />}
                        subtitle="Issue type"
                      />
                      <InfoCard
                        title="Reported By"
                        value={report.reportedBy || "N/A"}
                        icon={<User size={20} />}
                        subtitle="Reporter"
                      />
                      <InfoCard
                        title="Assigned To"
                        value={report.assignedTo?.name || "Unassigned"}
                        icon={<Wrench size={20} />}
                        subtitle="Staff member"
                      />
                    </div>

                    {/* Location & Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Location Card */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <MapPin size={20} className="text-gray-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2">
                            <span className="text-gray-600">Floor</span>
                            <span className="font-semibold text-gray-900">{report.floor || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-gray-600">Room</span>
                            <span className="font-semibold text-gray-900">{report.room || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-gray-600">Date Reported</span>
                            <span className="font-semibold text-gray-900">{formatPHDateTime(report.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Issue Details Card */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <AlertTriangle size={20} className="text-gray-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Issue Details</h3>
                        </div>
                        <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                          {report.details || "No details provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "actions" && (
                  <div className="space-y-6">
                    {/* Assign Staff Section */}
                    {report.status !== "Resolved" && report.status !== "Archived" && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users size={20} className="text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Assign to Staff</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Staff Member
                            </label>
                            <select
                              value={selectedStaff}
                              onChange={(e) => setSelectedStaff(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0 focus:border-transparent"
                              disabled={assigning}
                            >
                              <option value="">-- Select Staff Member --</option>
                              {staffList.map((staff) => (
                                <option key={staff._id} value={staff._id}>
                                  {staff.name} {staff.floor ? `(Floor ${staff.floor})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <button
                            onClick={handleAssignStaff}
                            disabled={!selectedStaff || assigning}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2 cursor-pointer"
                          >
                            <Users size={16} />
                            {assigning ? "Assigning..." : "Assign Staff"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Taken Section */}
                    {report.status !== "Resolved" && report.status !== "Archived" && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <CheckCircle size={20} className="text-emerald-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Resolve Report</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Action Taken
                            </label>
                            <textarea
                              value={actionTaken}
                              onChange={(e) => setActionTaken(e.target.value)}
                              placeholder="Describe the actions taken to resolve this issue..."
                              rows={4}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0 focus:border-transparent resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Previous Actions */}
                    {report.actionTaken && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText size={20} className="text-gray-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Previous Actions</h3>
                        </div>
                        <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                          {report.actionTaken}
                        </p>
                        {report.resolvedAt && (
                          <p className="text-sm text-gray-500 mt-2">
                            Resolved on: {formatPHDateTime(report.resolvedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Loading report details...
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Report ID: {report?._id || "N/A"}
              </div>
              <div className="flex gap-3">
                {renderActionButtons()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  {confirmConfig.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {confirmConfig.title}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {confirmConfig.message}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={actionLoading}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium cursor-pointer ${confirmConfig.confirmColor}`}
                >
                  {actionLoading ? "Processing..." : confirmConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Alert Modal Component
function AlertModal({ title, message, type, onClose }) {
  const getAlertStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-50 border-emerald-200",
          icon: <CheckCircle className="text-emerald-600" size={24} />,
          title: "text-emerald-800",
          message: "text-emerald-700",
          button: "bg-emerald-600 hover:bg-emerald-700"
        };
      case "error":
        return {
          bg: "bg-red-50 border-red-200",
          icon: <XCircle className="text-red-600" size={24} />,
          title: "text-red-800",
          message: "text-red-700",
          button: "bg-red-600 hover:bg-red-700"
        };
      case "warning":
        return {
          bg: "bg-amber-50 border-amber-200",
          icon: <AlertTriangle className="text-amber-600" size={24} />,
          title: "text-amber-800",
          message: "text-amber-700",
          button: "bg-amber-600 hover:bg-amber-700"
        };
      default:
        return {
          bg: "bg-blue-50 border-blue-200",
          icon: <AlertCircle className="text-blue-600" size={24} />,
          title: "text-blue-800",
          message: "text-blue-700",
          button: "bg-blue-600 hover:bg-blue-700"
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl border p-6 w-full max-w-md ${styles.bg}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-white rounded-lg border">
            {styles.icon}
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${styles.title}`}>
              {title}
            </h3>
            <p className={`mt-1 ${styles.message}`}>
              {message}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`w-full px-4 py-2.5 text-white rounded-lg transition-all duration-200 font-medium cursor-pointer ${styles.button}`}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default AdminReports;