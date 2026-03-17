import React, { useEffect, useState, useRef } from "react";
import AdminNavigation from "./AdminNavigation";

// 📦 Import libraries
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

function AdminLogs({ setView, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔎 Filters & Sorting
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first
  const [showDateModal, setShowDateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Date presets
  const datePresets = [
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "This month", custom: "month" }
  ];

  const handleLogout = () => {
    localStorage.removeItem("admin");
    setView("login");
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(); // initial load
    const interval = setInterval(fetchLogs, 5000); // 🔄 refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + F for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Esc to close modal
      if (e.key === 'Escape' && showDateModal) {
        setShowDateModal(false);
      }
      // Esc to close export menu
      if (e.key === 'Escape' && showExportMenu) {
        setShowExportMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDateModal, showExportMenu]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  // Get most active user
  const getMostActiveUser = () => {
    const userCounts = {};
    logs.forEach(log => {
      if (log.userName) {
        userCounts[log.userName] = (userCounts[log.userName] || 0) + 1;
      }
    });
    const mostActive = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];
    return mostActive ? mostActive[0] : "N/A";
  };

  // Highlight search text
  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    const parts = text.toString().split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
        : part
    );
  };

  // 📥 Export as CSV
  const exportCSV = () => {
    try {
      const headers = ["User", "ID Number", "Action", "Details", "Date", "Time"];
      const rows = filteredLogs.map((log) => {
        const date = new Date(log.createdAt);
        return [
          log.userName || "System",
          log.id_number || "—",
          log.action,
          log.details || "—",
          date.toLocaleDateString("en-PH"),
          date.toLocaleTimeString("en-PH", { hour: '2-digit', minute: '2-digit' })
        ];
      });

      let csvContent = 
        "data:text/csv;charset=utf-8," + 
        [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");

      const blob = new Blob([decodeURIComponent(encodeURI(csvContent))], { 
        type: "text/csv;charset=utf-8;" 
      });
      saveAs(blob, `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
      setShowExportMenu(false);
    } catch (err) {
      setError("Failed to export CSV: " + err.message);
    }
  };

  // 📥 Export as Excel with detailed formatting
  const exportExcel = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data with formatting
      const data = filteredLogs.map((log) => ({
        'User': log.userName || "System",
        'ID Number': log.id_number || "—",
        'Action': log.action,
        'Details': log.details || "—",
        'Date': new Date(log.createdAt).toLocaleDateString("en-PH"),
        'Time': new Date(log.createdAt).toLocaleTimeString("en-PH", { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }),
        'Full Timestamp': new Date(log.createdAt).toLocaleString("en-PH"),
        'Day of Week': new Date(log.createdAt).toLocaleDateString("en-PH", { weekday: 'long' })
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      const colWidths = [
        { wch: 20 }, // User
        { wch: 15 }, // ID Number
        { wch: 15 }, // Action
        { wch: 50 }, // Details
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 25 }, // Full Timestamp
        { wch: 12 }  // Day of Week
      ];
      ws['!cols'] = colWidths;

      // Add title and metadata
      const titleRow = [{
        'User': 'ACTIVITY LOGS EXPORT',
        'ID Number': '',
        'Action': '',
        'Details': '',
        'Date': '',
        'Time': '',
        'Full Timestamp': '',
        'Day of Week': ''
      }];
      
      const metadataRow = [{
        'User': `Export Date: ${new Date().toLocaleString("en-PH")}`,
        'ID Number': '',
        'Action': `Total Logs: ${filteredLogs.length}`,
        'Details': `Date Range: ${startDate || 'All'} to ${endDate || 'All'}`,
        'Date': '',
        'Time': '',
        'Full Timestamp': '',
        'Day of Week': ''
      }];

      // Combine all rows
      const allData = [...titleRow, ...metadataRow, {}, ...data];
      const finalWs = XLSX.utils.json_to_sheet(allData, { skipHeader: true });
      
      // Copy column widths
      finalWs['!cols'] = colWidths;

      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(wb, finalWs, "Activity Logs");

      // Add summary sheet
      const summaryData = [
        { 'Metric': 'Total Logs', 'Value': filteredLogs.length },
        { 'Metric': 'Unique Users', 'Value': new Set(filteredLogs.map(l => l.userName)).size },
        { 'Metric': 'Date Range Start', 'Value': startDate || 'All' },
        { 'Metric': 'Date Range End', 'Value': endDate || 'All' },
        { 'Metric': 'Sort Order', 'Value': sortOrder === 'desc' ? 'Newest First' : 'Oldest First' },
        { 'Metric': 'Search Term', 'Value': search || 'None' },
        { 'Metric': 'Most Active User', 'Value': getMostActiveUser() },
        { 'Metric': 'Export Time', 'Value': new Date().toLocaleString("en-PH") }
      ];

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Generate Excel file
      XLSX.writeFile(wb, `activity_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportMenu(false);
    } catch (err) {
      setError("Failed to export Excel: " + err.message);
    }
  };

  // Apply date preset
  const applyDatePreset = (preset) => {
    const today = new Date();
    const end = new Date(today);
    
    if (preset.days === 0) {
      // Today
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset.days) {
      // Last X days
      const start = new Date(today);
      start.setDate(today.getDate() - preset.days);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset.custom === "month") {
      // This month
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
    
    setShowDateModal(false);
  };

  // Copy log to clipboard
  const copyToClipboard = (log) => {
    const text = `${log.userName || 'System'} - ${log.action} - ${log.details || 'No details'} - ${new Date(log.createdAt).toLocaleString()}`;
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
  };

  // Apply date filter and close modal
  const applyDateFilter = () => {
    setShowDateModal(false);
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be after end date");
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

  // Loading skeleton
  const LogSkeleton = () => (
    <div className="animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="p-4 border-b border-gray-100">
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
            </div>
            <div className="w-24">
              <div className="h-3 bg-gray-100 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-100 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminLogs" onLogout={onLogout} />
      <main className="ml-[250px] h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header - Fixed */}
        <header className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-2xl font-bold text-[#CC0000]">Activity Logs</h1>
          <p className="text-gray-600">Review user and system activities</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </header>

        {/* Controls Section - Fixed */}
        <div className="p-6 flex-shrink-0">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[300px]">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search logs... (⌘F)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none"
                  aria-label="Search logs"
                />
              </div>

              {/* Date Range Button */}
              <button
                onClick={() => setShowDateModal(true)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:ring-opacity-50"
                aria-label="Select date range"
                aria-haspopup="dialog"
              >
                <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Date</span>
                {(startDate || endDate) && (
                  <span className="bg-[#CC0000] text-white text-xs px-1.5 py-0.5 rounded-full" aria-label="Date filter active">●</span>
                )}
              </button>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:ring-opacity-50"
                aria-label={`Sort by ${sortOrder === "desc" ? "oldest" : "newest"} first`}
              >
                <svg className="h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                {sortOrder === "desc" ? "Newest" : "Oldest"}
              </button>

              {/* Export Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                  aria-label="Export options"
                  aria-haspopup="true"
                  aria-expanded={showExportMenu}
                >
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={exportCSV}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export as CSV
                    </button>
                    <button
                      onClick={exportExcel}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export as Excel
                    </button>
                  </div>
                )}
              </div>

              {/* Clear Filters */}
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:ring-opacity-50"
                  aria-label="Clear all filters"
                >
                  <svg className="h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear ({getActiveFilterCount()})
                </button>
              )}
            </div>

            {/* Active Filters Summary */}
            {getActiveFilterCount() > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span className="font-medium mr-2">Filters:</span>
                {search && <span className="mr-3">Search: "{search}"</span>}
                {startDate && <span className="mr-3">From: {new Date(startDate).toLocaleDateString()}</span>}
                {endDate && <span className="mr-3">To: {new Date(endDate).toLocaleDateString()}</span>}
                {sortOrder !== "desc" && <span>Oldest first</span>}
              </div>
            )}
          </div>
        </div>

        {/* Logs Table - Scrollable */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            {/* Header with Count */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
              <h2 className="font-semibold text-gray-700">Activity Logs</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded" aria-label={`${filteredLogs.length} logs found`}>
                  {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
                </span>
                {filteredLogs.length < logs.length && (
                  <span className="text-xs text-gray-500">
                    (filtered from {logs.length} total)
                  </span>
                )}
              </div>
            </div>

            {/* Logs Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <LogSkeleton />
              ) : error ? (
                <div className="p-4 text-center text-red-600 text-sm">{error}</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                  <p className="text-gray-500 mb-4">
                    {getActiveFilterCount() > 0 
                      ? "Try adjusting your filters"
                      : "Logs will appear here as users interact with the system"}
                  </p>
                  {getActiveFilterCount() > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-[#CC0000] text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:ring-opacity-50 rounded px-2 py-1"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">User</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                      <th className="px-4 py-3 text-left font-medium">Details</th>
                      <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                      <th className="px-4 py-3 text-left font-medium w-10"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {highlightText(log.userName || "System", search)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.id_number ? highlightText(log.id_number, search) : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                            {highlightText(log.action, search)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-md truncate" title={log.details}>
                          {log.details ? highlightText(log.details, search) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          <div>{new Date(log.createdAt).toLocaleDateString("en-PH")}</div>
                          <div className="text-xs">
                            {new Date(log.createdAt).toLocaleTimeString("en-PH", {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => copyToClipboard(log)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 focus:opacity-100"
                            aria-label="Copy log to clipboard"
                            title="Copy to clipboard"
                          >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Date Range Modal */}
      {showDateModal && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Select date range"
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Select Date Range</h3>
                <button 
                  onClick={() => setShowDateModal(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:ring-opacity-50 rounded p-1"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Date Presets */}
            <div className="p-4 border-b border-gray-200">
              <label className="block text-xs text-gray-600 mb-2">Quick Select</label>
              <div className="flex flex-wrap gap-2">
                {datePresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => applyDatePreset(preset)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:ring-opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none"
                    aria-label="Start date"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none"
                    aria-label="End date"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={clearDateFilters}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              >
                Clear
              </button>
              <button
                onClick={applyDateFilter}
                className="flex-1 px-3 py-2 bg-[#CC0000] text-white rounded hover:bg-red-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:ring-opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminLogs;