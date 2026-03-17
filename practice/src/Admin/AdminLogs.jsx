import React, { useEffect, useState, useRef, useCallback } from "react";
import AdminNavigation from "./AdminNavigation";

// 📦 Import libraries
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

function AdminLogs({ setView, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  // For client-side pagination (since backend might not support server-side)
  const [displayCount, setDisplayCount] = useState(50);
  const [allLogs, setAllLogs] = useState([]);
  const LOGS_PER_BATCH = 50;

  // 🔎 Filters & Sorting
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first
  const [showDateModal, setShowDateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Refs
  const exportMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  const observerRef = useRef();
  const lastLogElementRef = useRef();
  const tableContainerRef = useRef(null);

  // Date presets
  const datePresets = [
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "This month", custom: "month" }
  ];

  const handleLogout = () => {
    localStorage.removeItem("admin");
    if (onLogout) {
      onLogout();
    } else {
      setView("login");
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logs`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      
      // Handle different response formats
      const logsArray = Array.isArray(data) ? data : data.logs || data.data || [];
      setAllLogs(logsArray);
      setLogs(logsArray.slice(0, LOGS_PER_BATCH));
      setError(null);
    } catch (err) {
      console.error("Fetch logs error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(); // initial load
    
    // Refresh every 30 seconds instead of 5 to reduce server load
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort logs
  const getFilteredAndSortedLogs = useCallback(() => {
    let filtered = [...allLogs];

    // Apply search filter
    if (search) {
      filtered = filtered.filter((log) => {
        const searchLower = search.toLowerCase();
        return (
          (log.userName?.toLowerCase() || '').includes(searchLower) ||
          (log.userId?.name?.toLowerCase() || '').includes(searchLower) ||
          (log.userId?.email?.toLowerCase() || '').includes(searchLower) ||
          (log.id_number?.toLowerCase() || '').includes(searchLower) ||
          (log.action?.toLowerCase() || '').includes(searchLower) ||
          (log.details?.toLowerCase() || '').includes(searchLower)
        );
      });
    }

    // Apply date filters
    if (startDate) {
      filtered = filtered.filter(log => 
        new Date(log.createdAt) >= new Date(startDate)
      );
    }

    if (endDate) {
      filtered = filtered.filter(log => 
        new Date(log.createdAt) <= new Date(endDate + "T23:59:59")
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [allLogs, search, startDate, endDate, sortOrder]);

  // Get displayed logs (paginated)
  const displayedLogs = getFilteredAndSortedLogs().slice(0, displayCount);
  const hasMoreLogs = displayedLogs.length < getFilteredAndSortedLogs().length;

  // Load more logs when scrolling
  const loadMoreLogs = useCallback(() => {
    if (loadingMore || !hasMoreLogs) return;
    
    setLoadingMore(true);
    
    // Simulate network delay for smoother UX
    setTimeout(() => {
      setDisplayCount(prev => prev + LOGS_PER_BATCH);
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMoreLogs]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (loading) return;

    const options = {
      root: tableContainerRef.current,
      rootMargin: "20px",
      threshold: 0.1
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreLogs && !loadingMore) {
        loadMoreLogs();
      }
    }, options);

    if (lastLogElementRef.current) {
      observerRef.current.observe(lastLogElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMoreLogs, loadingMore, loadMoreLogs, displayedLogs.length]);

  // Get user name from different possible structures
  const getUserName = (log) => {
    if (log.userName) return log.userName;
    if (log.userId) {
      if (typeof log.userId === 'object') {
        return log.userId.name || log.userId.email || 'User';
      }
    }
    if (log.user) {
      if (typeof log.user === 'object') {
        return log.user.name || log.user.email || 'User';
      }
    }
    return 'System';
  };

  // Get user ID number
  const getUserIdNumber = (log) => {
    if (log.id_number) return log.id_number;
    if (log.userId) {
      if (typeof log.userId === 'object') {
        return log.userId.id_number || log.userId.studentId || log.userId.employeeId || '—';
      }
    }
    return '—';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && showDateModal) {
        setShowDateModal(false);
      }
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

  // Highlight search text
  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    try {
      const parts = text.toString().split(new RegExp(`(${searchTerm})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === searchTerm.toLowerCase() 
          ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
          : part
      );
    } catch (e) {
      return text;
    }
  };

  // 📥 Export as Excel (CSV export removed)
  const exportExcel = () => {
    try {
      const filteredData = getFilteredAndSortedLogs();
      
      const wb = XLSX.utils.book_new();
      
      const exportData = filteredData.map((log) => ({
        'User': getUserName(log),
        'ID Number': getUserIdNumber(log),
        'Action': log.action || '—',
        'Details': log.details || '—',
        'Date': new Date(log.createdAt).toLocaleDateString("en-PH"),
        'Time': new Date(log.createdAt).toLocaleTimeString("en-PH", { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }),
        'Full Timestamp': new Date(log.createdAt).toLocaleString("en-PH"),
        'Day of Week': new Date(log.createdAt).toLocaleDateString("en-PH", { weekday: 'long' })
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const colWidths = [
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 50 }, 
        { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 12 }
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Activity Logs");

      // Add summary sheet
      const summaryData = [
        { 'Metric': 'Total Logs', 'Value': filteredData.length },
        { 'Metric': 'Unique Users', 'Value': new Set(filteredData.map(l => getUserName(l))).size },
        { 'Metric': 'Date Range Start', 'Value': startDate || 'All' },
        { 'Metric': 'Date Range End', 'Value': endDate || 'All' },
        { 'Metric': 'Sort Order', 'Value': sortOrder === 'desc' ? 'Newest First' : 'Oldest First' },
        { 'Metric': 'Search Term', 'Value': search || 'None' },
        { 'Metric': 'Export Time', 'Value': new Date().toLocaleString("en-PH") }
      ];

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      XLSX.writeFile(wb, `activity_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportMenu(false);
    } catch (err) {
      setError("Failed to export Excel: " + err.message);
    }
  };

  // Apply date preset
  const applyDatePreset = (preset) => {
    const today = new Date();
    
    if (preset.days === 0) {
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset.days) {
      const start = new Date(today);
      start.setDate(today.getDate() - preset.days);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset.custom === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
    
    setShowDateModal(false);
  };

  // Copy log to clipboard
  const copyToClipboard = (log) => {
    const text = `${getUserName(log)} - ${log.action || 'Unknown'} - ${log.details || 'No details'} - ${new Date(log.createdAt).toLocaleString()}`;
    navigator.clipboard.writeText(text);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
    setDisplayCount(LOGS_PER_BATCH);
  };

  // Apply date filter
  const applyDateFilter = () => {
    setShowDateModal(false);
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be after end date");
      return;
    }
    setDisplayCount(LOGS_PER_BATCH);
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
      <AdminNavigation setView={setView} currentView="adminLogs" onLogout={handleLogout} />
      <main className="ml-[250px] h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-2xl font-bold text-[#CC0000]">Activity Logs</h1>
          <p className="text-gray-600">Review user and system activities</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </header>

        {/* Controls */}
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
                />
              </div>

              {/* Date Range Button */}
              <button
                onClick={() => setShowDateModal(true)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Date</span>
                {(startDate || endDate) && (
                  <span className="bg-[#CC0000] text-white text-xs px-1.5 py-0.5 rounded-full">●</span>
                )}
              </button>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                {sortOrder === "desc" ? "Newest" : "Oldest"}
              </button>

              {/* Export Dropdown - Now only showing Excel export */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
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
                    {/* CSV export option removed - only Excel remains */}
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
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50"
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

        {/* Logs Table */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <div 
            ref={tableContainerRef}
            className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden"
          >
            {/* Header with Count */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
              <h2 className="font-semibold text-gray-700">Activity Logs</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  Showing {displayedLogs.length} of {getFilteredAndSortedLogs().length} logs
                </span>
              </div>
            </div>

            {/* Logs Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <LogSkeleton />
              ) : error ? (
                <div className="p-4 text-center text-red-600 text-sm">{error}</div>
              ) : displayedLogs.length === 0 ? (
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
                      className="text-[#CC0000] text-sm hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <>
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
                      {displayedLogs.map((log, index) => (
                        <tr 
                          key={log._id || index} 
                          ref={index === displayedLogs.length - 1 ? lastLogElementRef : null}
                          className="hover:bg-gray-50 group"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {highlightText(getUserName(log), search)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {highlightText(getUserIdNumber(log), search)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                              {highlightText(log.action || '—', search)}
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
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
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
                  
                  {/* Loading more indicator */}
                  {loadingMore && (
                    <div className="p-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#CC0000]"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading more logs...</p>
                    </div>
                  )}
                  
                  {/* End of results */}
                  {!hasMoreLogs && displayedLogs.length > 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm border-t border-gray-100">
                      <p>You've reached the end of the logs</p>
                    </div>
                  )}
                </>
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
                  className="text-gray-400 hover:text-gray-600"
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
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
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
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={clearDateFilters}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                Clear
              </button>
              <button
                onClick={applyDateFilter}
                className="flex-1 px-3 py-2 bg-[#CC0000] text-white rounded hover:bg-red-700 text-sm"
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