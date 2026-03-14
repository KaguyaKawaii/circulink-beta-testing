import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminNavigation from "./AdminNavigation";
import ReportModal from "./Modals/ReportModal";
import {
  Eye,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
  AlertTriangle,
  CheckSquare,
  Square
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
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterPresets, setFilterPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({
    show: false,
    title: "",
    message: "",
    action: null,
    loading: false,
    type: "default"
  });

  const formatPHDateTime = (date) => {
    if (!date) return "—";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "—";
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
      console.error("Error formatting date:", error);
      return "—";
    }
  };

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
    const savedPresets = localStorage.getItem("reportFilterPresets");
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
        let reportsData = res.data;
        
        if (!Array.isArray(reportsData)) {
          const possibleArrays = Object.values(res.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            reportsData = possibleArrays[0];
          }
        }
        
        if (!Array.isArray(reportsData)) {
          setReports([]);
          setCategories([]);
          return;
        }
        
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
        setSelectedReports([]);
        setSelectAll(false);
      })
      .catch((err) => {
        console.error("Fetch reports error:", err);
        setReports([]);
        setCategories([]);
      })
      .finally(() => setIsLoading(false));
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReports([]);
    } else {
      const filteredIds = filteredAndSortedReports.map(report => report._id);
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
        if (newSelected.length === filteredAndSortedReports.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  const handleBulkArchive = async () => {
    if (selectedReports.length === 0) return;

    try {
      setIsExporting(true);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const archivedBy = currentUser._id || "admin";

      const archivePromises = selectedReports.map(reportId =>
        axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${reportId}/archive`, {
          archivedBy: archivedBy
        })
      );

      await Promise.all(archivePromises);
      
      fetchReports();
      setSelectedReports([]);
      setSelectAll(false);
      
      showConfirmation(
        "Success",
        `Successfully archived ${selectedReports.length} reports.`,
        null
      );
    } catch (err) {
      console.error("Error bulk archiving reports:", err);
      showConfirmation(
        "Error",
        err.response?.data?.message || "Failed to archive reports. Please try again.",
        null
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleArchiveReport = (report) => {
    showConfirmation(
      "Archive Report",
      `Are you sure you want to archive this report? This action cannot be undone.`,
      async () => {
        try {
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const archivedBy = currentUser._id || "admin";
          
          await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${report._id}/archive`, {
            archivedBy: archivedBy
          });
          
          fetchReports();
        } catch (err) {
          console.error("Error archiving report:", err);
          showConfirmation(
            "Error",
            err.response?.data?.message || "Failed to archive report. Please try again.",
            null
          );
        }
      },
      "bulkArchive"
    );
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "Pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case "Resolved":
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-300`;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return <Clock size={12} className="mr-1" />;
      case "Resolved":
        return <CheckCircle size={12} className="mr-1" />;
      default:
        return <AlertCircle size={12} className="mr-1" />;
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronDown size={14} className="text-gray-400" />;
    }
    return sortConfig.direction === "asc" ? 
      <ChevronUp size={14} className="text-gray-600" /> : 
      <ChevronDown size={14} className="text-gray-600" />;
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "—";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const filteredAndSortedReports = React.useMemo(() => {
    let filtered = reports.filter((report) => {
      const matchesStatus = statusFilter === "All" || report.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || report.category === categoryFilter;
      const matchesSearch =
        (report.category || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.reportedBy || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.floor || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.room || "").toLowerCase().includes(search.toLowerCase()) ||
        (report.details || "").toLowerCase().includes(search.toLowerCase());
      
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

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "details") {
          aValue = a.details || "";
          bValue = b.details || "";
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [reports, statusFilter, categoryFilter, dateFilter, search, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage);
  const paginatedReports = filteredAndSortedReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const saveFilterPreset = () => {
    if (!presetName.trim()) {
      showConfirmation("Warning", "Please enter a name for the filter preset.", null);
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
    localStorage.setItem("reportFilterPresets", JSON.stringify(updatedPresets));
    setShowPresetModal(false);
    setPresetName("");
    showConfirmation("Success", "Filter preset saved successfully!", null);
  };

  const loadFilterPreset = (preset) => {
    setStatusFilter(preset.filters.status);
    setCategoryFilter(preset.filters.category);
    setDateFilter(preset.filters.date);
    setSearch(preset.filters.search);
    setCurrentPage(1);
    showConfirmation("Success", `Filter preset "${preset.name}" loaded!`, null);
  };

  const deleteFilterPreset = (presetId, e) => {
    e.stopPropagation();
    const updatedPresets = filterPresets.filter(preset => preset.id !== presetId);
    setFilterPresets(updatedPresets);
    localStorage.setItem("reportFilterPresets", JSON.stringify(updatedPresets));
    showConfirmation("Success", "Filter preset deleted!", null);
  };

  const exportToCSV = () => {
    try {
      setIsExporting(true);
      
      const headers = ["Category", "Reported By", "Floor", "Room", "Status", "Date Reported", "Details"];
      const csvContent = [
        headers.join(","),
        ...filteredAndSortedReports.map(report => [
          `"${report.category || ""}"`,
          `"${report.reportedBy || ""}"`,
          `"${report.floor || ""}"`,
          `"${report.room || ""}"`,
          `"${report.status || ""}"`,
          `"${formatDateOnly(report.createdAt)}"`,
          `"${(report.details || "").replace(/"/g, '""')}"`
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `reports_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // No confirmation modal here - direct download
    } catch (err) {
      console.error("Error exporting reports:", err);
      showConfirmation("Error", "Failed to export reports: " + err.message, null);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminReports" onLogout={onLogout} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                Report Management
              </h1>
              <p className="text-gray-600">
                Manage and resolve facility reports
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
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by category, reported by, location, or problem..."
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

              {/* Status filter */}
              <FilterDropdown 
                value={statusFilter} 
                setValue={setStatusFilter} 
                label="Status" 
                options={["All", "Pending", "Resolved"]} 
              />

              {/* Category filter */}
              <FilterDropdown 
                value={categoryFilter} 
                setValue={setCategoryFilter} 
                label="Category" 
                options={["All", ...categories]} 
              />

              {/* Date filter */}
              <FilterDropdown 
                value={dateFilter} 
                setValue={setDateFilter} 
                label="Date" 
                options={["All", "Newer", "Recent", "Older"]} 
              />

              {/* Action Buttons */}
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setCategoryFilter("All");
                  setDateFilter("All");
                  fetchReports();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>

              <button
                onClick={exportToCSV}
                disabled={isExporting || filteredAndSortedReports.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Download size={16} />
                {isExporting ? "Exporting..." : "Export CSV"}
              </button>
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
                  {selectedReports.length} report{selectedReports.length !== 1 ? "s" : ""} selected
                </span>
              </div>

              {selectedReports.length > 0 && (
                <button
                  onClick={() => showConfirmation(
                    "Archive Selected Reports",
                    `Are you sure you want to archive ${selectedReports.length} selected report${selectedReports.length !== 1 ? "s" : ""}? This action cannot be undone.`,
                    handleBulkArchive,
                    "bulkArchive"
                  )}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer text-sm"
                >
                  <Trash2 size={16} />
                  <span>Archive Selected</span>
                </button>
              )}
            </div>
          </div>

          {/* Reports Table */}
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
                    <th 
                      className="px-6 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center gap-1">
                        Category
                        {getSortIcon("category")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left font-medium">Problem Details</th>
                    <th 
                      className="px-6 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("reportedBy")}
                    >
                      <div className="flex items-center gap-1">
                        Reported By
                        {getSortIcon("reportedBy")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left font-medium">Location</th>
                    <th 
                      className="px-6 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon("status")}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center gap-1">
                        Date Reported
                        {getSortIcon("createdAt")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500 font-bold">
                        Loading reports...
                      </td>
                    </tr>
                  ) : paginatedReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <FileText size={48} className="text-gray-300 mb-2" />
                          <span>No reports found</span>
                          {(search !== "" || statusFilter !== "All" || categoryFilter !== "All" || dateFilter !== "All") && (
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
                      <tr key={report._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(currentPage - 1) * itemsPerPage + i + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{report.category || "—"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-[200px]">
                            <div className="text-gray-900 mb-1 break-words">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            <span className="text-gray-900">{report.reportedBy || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{report.floor || "—"}</div>
                              <div className="text-gray-500 text-xs">{report.room || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(report.status)}>
                            {getStatusIcon(report.status)}
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="text-gray-900">{formatDateOnly(report.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleArchiveReport(report)}
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
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-red-500 outline-0 bg-white cursor-pointer"
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
                                  ? "bg-red-600 text-white border border-red-600"
                                  : "border border-gray-300 hover:bg-gray-100 text-gray-700"
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

      {/* Confirmation Modal */}
      {confirmationModal.show && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {confirmationModal.type === "bulkArchive" && (
                  <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 size={24} className="text-red-600" />
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
                    confirmationModal.type === "bulkArchive"
                      ? "bg-red-600 hover:bg-red-700"
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

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportModal
          reportId={selectedReport._id}
          onClose={() => setSelectedReport(null)}
          onReportUpdated={fetchReports}
        />
      )}
    </>
  );
}

// FilterDropdown Component
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
            {opt === "All" ? `All ${label}` : opt.replace("_", " ")}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
    </div>
  );
}

export default AdminReports;