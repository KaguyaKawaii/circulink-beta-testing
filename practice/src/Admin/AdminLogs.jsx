import React, { useEffect, useState } from "react";
import AdminNavigation from "./AdminNavigation";

// 📦 Import libraries
import { saveAs } from "file-saver";

function AdminLogs({ setView, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔎 Filters & Sorting
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showDateModal, setShowDateModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });

  const handleLogout = () => {
    localStorage.removeItem("admin");
    setView("login");
  };

  const showAlert = (title, message, type = "info") => {
    setAlertModal({ show: true, title, message, type });
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logs`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      showAlert("Error", "Failed to fetch logs: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // 📌 Apply filters
  const filteredLogs = logs
    .filter((log) => {
      const logDate = new Date(log.createdAt);

      const matchesSearch =
        log.userName?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.details?.toLowerCase().includes(search.toLowerCase()) ||
        log.id_number?.toLowerCase().includes(search.toLowerCase());

      const matchesStart = startDate ? logDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? logDate <= new Date(endDate + "T23:59:59") : true;

      return matchesSearch && matchesStart && matchesEnd;
    })
    .sort((a, b) =>
      sortOrder === "desc"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );

  // 📥 Export as CSV with better Excel formatting
  const exportCSV = () => {
    try {
      // Create headers with clear, descriptive names
      const headers = [
        "USERNAME",
        "ID NUMBER",
        "ACTION PERFORMED",
        "DETAILS / DESCRIPTION",
        "DATE",
        "TIME",
        "FULL TIMESTAMP"
      ];

      // Format rows with better data separation
      const rows = filteredLogs.map((log) => {
        const date = new Date(log.createdAt);
        const formattedDate = date.toLocaleDateString("en-PH", {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const formattedTime = date.toLocaleTimeString("en-PH", {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        const fullTimestamp = date.toLocaleString("en-PH", {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });

        return [
          `"${log.userName || "System"}"`, // Wrap in quotes to handle commas in names
          `"${log.id_number || "—"}"`,
          `"${log.action}"`,
          `"${(log.details || "No details provided").replace(/"/g, '""')}"`, // Escape quotes in details
          formattedDate,
          formattedTime,
          fullTimestamp
        ];
      });

      // Create CSV content with BOM for Excel UTF-8 support
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      // Add BOM for Excel to recognize UTF-8
      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: "text/csv;charset=utf-8;" 
      });
      
      // Generate filename with date range
      const dateRange = startDate || endDate 
        ? `_${startDate || 'start'}_to_${endDate || 'end'}`
        : '';
      const filename = `activity_logs_${new Date().toISOString().split('T')[0]}${dateRange}.csv`;
      
      saveAs(blob, filename);
      showAlert("Success", `CSV exported successfully!\n${filteredLogs.length} logs exported.`, "success");
    } catch (err) {
      console.error("Export error:", err);
      showAlert("Error", "Failed to export CSV: " + err.message, "error");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
    showAlert("Info", "All filters have been cleared", "info");
  };

  // Apply date filter and close modal
  const applyDateFilter = () => {
    setShowDateModal(false);
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      showAlert("Warning", "Start date cannot be after end date", "warning");
      return;
    }
  };

  // Clear date filters
  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (search) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (sortOrder !== "desc") count++;
    return count;
  };

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminLogs" onLogout={onLogout} />
      <main className="ml-[250px] min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-8 py-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-[#CC0000]">Activity Logs</h1>
          <p className="text-gray-600 mt-1 text-lg">Review and monitor all user and system activities</p>
          {error && (
            <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </header>

        {/* Controls Section */}
        <div className="p-8">
          {/* Filter Bar */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[350px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Search Logs</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by user, ID, action, or details..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-gray-300 rounded-lg pl-12 pr-4 py-3 text-base w-full focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Date Range Button */}
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Date Range</label>
                <button
                  onClick={() => setShowDateModal(true)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base flex items-center justify-between gap-2 bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{startDate || endDate ? 'Custom Range' : 'Select Dates'}</span>
                  </span>
                  {(startDate || endDate) && (
                    <span className="bg-[#CC0000] text-white text-xs px-2 py-1 rounded-full">
                      {startDate && endDate ? '2' : '1'}
                    </span>
                  )}
                </button>
              </div>

              {/* Sort Order */}
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Sort By</label>
                <button
                  onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base flex items-center justify-between gap-2 bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                    <span>{sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
                  </span>
                </button>
              </div>

              {/* Export CSV Button */}
              <div className="min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Export</label>
                <button
                  onClick={exportCSV}
                  disabled={filteredLogs.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg text-base flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
              </div>

              {/* Clear Filters */}
              {getActiveFilterCount() > 0 && (
                <div className="self-end">
                  <button
                    onClick={clearFilters}
                    className="border border-gray-300 rounded-lg px-4 py-3 text-base flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Active Filters Summary */}
            {getActiveFilterCount() > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                  {search && (
                    <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm border border-blue-200">
                      Search: "{search}"
                    </span>
                  )}
                  {startDate && (
                    <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm border border-green-200">
                      From: {new Date(startDate).toLocaleDateString()}
                    </span>
                  )}
                  {endDate && (
                    <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm border border-green-200">
                      To: {new Date(endDate).toLocaleDateString()}
                    </span>
                  )}
                  {sortOrder !== "desc" && (
                    <span className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg text-sm border border-purple-200">
                      Oldest First
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header with Stats */}
            <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Activity Logs</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {filteredLogs.length} of {logs.length} total logs
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#CC0000]">{filteredLogs.length}</span>
                  <span className="text-sm text-gray-500 ml-2">logs</span>
                </div>
              </div>
            </div>

            {/* Logs Content */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#CC0000] mb-4"></div>
                  <p className="text-gray-600 text-lg">Loading activity logs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="bg-red-50 border-l-4 border-red-500 p-6 max-w-2xl mx-auto rounded">
                  <p className="text-red-700 font-medium mb-2">Error loading logs</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-16 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">No logs found</h3>
                <p className="text-gray-500 text-lg max-w-md mx-auto mb-8">
                  {getActiveFilterCount() > 0 
                    ? "No logs match your current filters. Try adjusting your search criteria."
                    : "No activity logs available yet. Activity will appear here as users interact with the system."
                  }
                </p>
                {getActiveFilterCount() > 0 && (
                  <button
                    onClick={clearFilters}
                    className="bg-[#CC0000] text-white px-8 py-3 rounded-lg text-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">User</th>
                        <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">ID Number</th>
                        <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                        <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                        <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredLogs.map((log, index) => (
                        <tr key={log._id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center border-2 border-blue-200">
                                <span className="text-blue-700 text-lg font-bold">
                                  {(log.userName || "S")[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-lg">
                                  {log.userName || "System"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="font-mono text-base bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                              {log.id_number || "—"}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="inline-flex px-4 py-2 rounded-lg text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-base text-gray-700 max-w-xl leading-relaxed">
                              {log.details || "No details provided"}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-base font-medium text-gray-900">
                              {new Date(log.createdAt).toLocaleDateString("en-PH", {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-base text-gray-600">
                              {new Date(log.createdAt).toLocaleTimeString("en-PH", {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Export Summary */}
          {filteredLogs.length > 0 && (
            <div className="mt-6 text-right">
              <p className="text-sm text-gray-500">
                <span className="font-medium">{filteredLogs.length}</span> logs ready for export
                {startDate || endDate ? ' (filtered)' : ''}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Date Range Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Select Date Range</h3>
                <button 
                  onClick={() => setShowDateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none transition-all"
                  />
                </div>
              </div>

              {(startDate || endDate) && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Range:</h4>
                  <p className="text-gray-600 text-base">
                    {startDate && <span className="font-medium">From: {new Date(startDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                    {startDate && endDate && <span className="mx-2">→</span>}
                    {endDate && <span className="font-medium">To: {new Date(endDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={clearDateFilters}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium text-base"
              >
                Clear Dates
              </button>
              <button
                onClick={applyDateFilter}
                className="flex-1 px-6 py-3 bg-[#CC0000] text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-base"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
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
    </>
  );
}

// Alert Modal Component
function AlertModal({ title, message, type = "info", onClose }) {
  const getStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          icon: "✓",
          iconBg: "bg-green-100",
          iconColor: "text-green-600",
          button: "bg-green-600 hover:bg-green-700"
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "✕",
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          button: "bg-red-600 hover:bg-red-700"
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "⚠",
          iconBg: "bg-yellow-100",
          iconColor: "text-yellow-600",
          button: "bg-yellow-600 hover:bg-yellow-700"
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "ℹ",
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          button: "bg-blue-600 hover:bg-blue-700"
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-xl shadow-xl w-full max-w-md border-2 ${styles.border}`}>
        <div className="p-8">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 ${styles.iconBg} rounded-2xl flex items-center justify-center text-3xl ${styles.iconColor}`}>
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-lg leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className={`${styles.bg} px-8 py-6 border-t-2 ${styles.border} rounded-b-xl`}>
          <button
            onClick={onClose}
            className={`w-full px-6 py-4 ${styles.button} text-white rounded-xl transition-colors font-semibold text-lg`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLogs;