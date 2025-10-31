import React, { useEffect, useState } from "react";
import AdminNavigation from "./AdminNavigation";

// 📦 Import libraries
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";

function AdminLogs({ setView }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔎 Filters & Sorting
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first
  const [showDateModal, setShowDateModal] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'console'
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });
  const [isConsoleFullscreen, setIsConsoleFullscreen] = useState(false);

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
    fetchLogs(); // initial load
    const interval = setInterval(fetchLogs, 2000); // 🔄 refresh every 2s
    return () => clearInterval(interval);
  }, []);

  // 📌 Apply filters
  const filteredLogs = logs
    .filter((log) => {
      const logDate = new Date(log.createdAt);

      const matchesSearch =
        log.userName?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.details?.toLowerCase().includes(search.toLowerCase());

      const matchesStart = startDate ? logDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? logDate <= new Date(endDate + "T23:59:59") : true;

      return matchesSearch && matchesStart && matchesEnd;
    })
    .sort((a, b) =>
      sortOrder === "desc"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );

  // 📥 Export as CSV
  const exportCSV = () => {
    try {
      const headers = ["User", "ID Number", "Action", "Details", "Date"];
      const rows = filteredLogs.map((log) => [
        log.userName || "System",
        log.id_number || "—",
        log.action,
        log.details || "—",
        new Date(log.createdAt).toLocaleString("en-PH", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      ]);

      let csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      const blob = new Blob([decodeURIComponent(encodeURI(csvContent))], {
        type: "text/csv;charset=utf-8;",
      });
      saveAs(blob, `activity_logs_${Date.now()}.csv`);
      showAlert("Success", "CSV exported successfully!", "success");
    } catch (err) {
      showAlert("Error", "Failed to export CSV: " + err.message, "error");
    }
  };

  // 📥 Export as PDF
  const exportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

      doc.setFontSize(14);
      doc.text("Activity Logs", 40, 40);

      autoTable(doc, {
        startY: 60,
        head: [["User", "ID Number", "Action", "Details", "Date"]],
        body: filteredLogs.map((log) => [
          log.userName || "System",
          log.id_number || "—",
          log.action || "",
          log.details || "—",
          new Date(log.createdAt).toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        ]),
        styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
        columnStyles: { 3: { cellWidth: 200 } },
        margin: { left: 40, right: 40 },
      });

      doc.save(`activity_logs_${Date.now()}.pdf`);
      showAlert("Success", "PDF exported successfully!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Error", "Failed to generate PDF. Check the console for details.", "error");
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

  // Toggle console fullscreen
  const toggleConsoleFullscreen = () => {
    setIsConsoleFullscreen(!isConsoleFullscreen);
  };

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminLogs" onLogout={handleLogout} />
      <main className={`${isConsoleFullscreen ? 'ml-0' : 'ml-[250px]'} min-h-screen bg-gray-50`}>
        {/* ✅ Header - Hidden in fullscreen console */}
        {!isConsoleFullscreen && (
          <header className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-[#CC0000]">Activity Logs</h1>
                <p className="text-gray-600">Review user and system activities</p>
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
            {error && (
              <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
          </header>
        )}

        {/* ✅ Controls Section - Hidden in fullscreen console */}
        {!isConsoleFullscreen && (
          <div className="p-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Left Side - Filters */}
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none transition-all cursor-text"
                    />
                  </div>

                  {/* Date Range Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDateModal(true)}
                      className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none cursor-pointer"
                    >
                      <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Date Range</span>
                      {(startDate || endDate) && (
                        <span className="bg-[#CC0000] text-white text-xs px-2 py-1 rounded-full">
                          {startDate && endDate ? "Both" : "One"}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Sort Order */}
                  <button
                    onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                    className="bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none border border-transparent cursor-pointer"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === "desc" ? "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" : "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"} />
                    </svg>
                    {sortOrder === "desc" ? "Newest First" : "Oldest First"}
                  </button>

                  {/* Clear Filters */}
                  <button
                    onClick={clearFilters}
                    disabled={getActiveFilterCount() === 0}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-500 outline-none cursor-pointer"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Clear
                    {getActiveFilterCount() > 0 && (
                      <span className="bg-white text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                        {getActiveFilterCount()}
                      </span>
                    )}
                  </button>
                </div>

                {/* Right Side - Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                        viewMode === "table" 
                          ? "bg-white text-gray-900 shadow-sm" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode("console")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                        viewMode === "console" 
                          ? "bg-white text-gray-900 shadow-sm" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Console
                    </button>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={exportCSV}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      CSV
                    </button>
                    <button
                      onClick={exportPDF}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {getActiveFilterCount() > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Active filters:</span>
                    {search && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        Search: "{search}"
                      </span>
                    )}
                    {startDate && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        From: {new Date(startDate).toLocaleDateString()}
                      </span>
                    )}
                    {endDate && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        To: {new Date(endDate).toLocaleDateString()}
                      </span>
                    )}
                    {sortOrder !== "desc" && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                        Oldest First
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ Logs Container */}
        <div className={`${isConsoleFullscreen ? 'fixed inset-0 z-40' : 'p-6'} ${!isConsoleFullscreen ? 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden' : 'bg-gray-900'}`}>
          {/* Header with Count - Hidden in fullscreen console */}
          {!isConsoleFullscreen && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  {viewMode === "table" ? "Activity Logs" : "Console View"}
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Console Controls */}
          {isConsoleFullscreen && (
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-white font-mono text-sm font-bold">ACTIVITY LOGS CONSOLE</h3>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-xs font-mono bg-green-900 bg-opacity-50 px-2 py-1 rounded">
                    LIVE
                  </span>
                  <span className="text-gray-400 text-xs font-mono">
                    {filteredLogs.length} ENTRIES
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  className="text-gray-400 hover:text-green-400 px-3 py-1 text-xs font-mono border border-gray-600 rounded hover:border-green-400 transition-colors cursor-pointer"
                >
                  EXPORT CSV
                </button>
                <button
                  onClick={toggleConsoleFullscreen}
                  className="text-gray-400 hover:text-red-400 px-3 py-1 text-xs font-mono border border-gray-600 rounded hover:border-red-400 transition-colors cursor-pointer"
                >
                  EXIT FULLSCREEN
                </button>
              </div>
            </div>
          )}

          {/* Logs Content */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <p className="text-gray-500 font-bold">Loading Logs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 max-w-md mx-auto">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No logs found</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                {getActiveFilterCount() > 0 
                  ? "Try adjusting your search or filter criteria."
                  : "No activity logs available yet."
                }
              </p>
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 bg-[#CC0000] text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (
            // Table View
            <div className="overflow-x-auto">
              <div className="max-h-[65vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-sm font-medium">
                                {(log.userName || "S")[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {log.userName || "System"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {log.id_number || "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md">
                            {log.details || "No details provided"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(log.createdAt).toLocaleDateString("en-PH")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleTimeString("en-PH")}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Console View - Enhanced with Fullscreen
            <div className={`bg-gray-900 text-gray-300 ${isConsoleFullscreen ? 'h-[calc(100vh-80px)]' : 'rounded-lg border border-gray-700'} overflow-hidden`}>
              {/* Console Header - Only show in non-fullscreen */}
              {!isConsoleFullscreen && (
                <div className="bg-gray-800 px-6 py-3 border-b border-gray-700 flex justify-between items-center">
                  <div className="flex items-center gap-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="min-w-[85px]">TIME</div>
                    <div className="min-w-[120px]">USER</div>
                    <div className="min-w-[100px]">ID NUMBER</div>
                    <div className="min-w-[140px]">ACTION</div>
                    <div className="flex-1 min-w-[250px]">DETAILS</div>
                    <div className="min-w-[90px] text-right">DATE</div>
                  </div>
                  <button
                    onClick={toggleConsoleFullscreen}
                    className="text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                    title="Enter Fullscreen"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Console Content */}
              <div className={`${isConsoleFullscreen ? 'h-full' : 'max-h-[60vh]'} overflow-y-auto font-mono`}>
                <div className="divide-y divide-gray-800">
                  {filteredLogs.map((log) => (
                    <div key={log._id} className={`flex items-center gap-6 px-6 py-3 hover:bg-gray-800 transition-colors ${isConsoleFullscreen ? 'text-xs' : 'text-sm'}`}>
                      {/* Time - More compact in fullscreen */}
                      <div className="text-cyan-400 font-mono min-w-[85px] flex-shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString("en-PH", {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </div>
                      
                      {/* User - Compact display */}
                      <div className="min-w-[120px]">
                        <span className="text-blue-300 font-medium">
                          {log.userName || "System"}
                        </span>
                      </div>

                      {/* ID Number - Monospace for alignment */}
                      <div className="text-gray-400 min-w-[100px] font-mono">
                        {log.id_number || "—"}
                      </div>

                      {/* Action - Compact badge */}
                      <div className="min-w-[140px]">
                        <span className="inline-flex px-2 py-1 rounded text-xs font-bold bg-green-900 bg-opacity-80 text-green-300 border border-green-700">
                          {log.action}
                        </span>
                      </div>

                      {/* Details - Truncate in fullscreen for more space */}
                      <div className="flex-1 min-w-[250px]">
                        <div className="text-gray-200 truncate" title={log.details}>
                          {log.details || "No details provided"}
                        </div>
                      </div>

                      {/* Full Date - Compact format */}
                      <div className="text-gray-500 min-w-[90px] text-right flex-shrink-0 font-mono">
                        {new Date(log.createdAt).toLocaleDateString("en-PH", {
                          month: '2-digit',
                          day: '2-digit',
                          year: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Console Footer - Only in fullscreen */}
              {isConsoleFullscreen && (
                <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
                  <div className="flex justify-between items-center text-xs text-gray-500 font-mono">
                    <div>
                      <span className="text-green-400">●</span> LIVE UPDATES ACTIVE | 
                      <span className="text-cyan-400 ml-2">LAST REFRESH: {new Date().toLocaleTimeString()}</span>
                    </div>
                    <div>
                      <span className="text-yellow-400">FILTERED: {filteredLogs.length}</span> | 
                      <span className="ml-2">TOTAL: {logs.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Date Range Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Select Date Range</h2>
                <button 
                  onClick={() => setShowDateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>

              {(startDate || endDate) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Range:</h3>
                  <div className="text-sm text-gray-600">
                    {startDate && `From: ${new Date(startDate).toLocaleDateString()}`}
                    {startDate && endDate && " → "}
                    {endDate && `To: ${new Date(endDate).toLocaleDateString()}`}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={clearDateFilters}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer"
              >
                Clear Dates
              </button>
              <button
                onClick={applyDateFilter}
                className="flex-1 px-4 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium cursor-pointer"
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
            className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLogs;