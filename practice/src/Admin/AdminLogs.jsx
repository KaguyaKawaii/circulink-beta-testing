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
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first
  const [showDateModal, setShowDateModal] = useState(false);

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

  // 📥 Export as CSV only
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
    } catch (err) {
      setError("Failed to export CSV: " + err.message);
    }
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

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminLogs" onLogout={onLogout} />
      <main className="ml-[250px] min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">Activity Logs</h1>
          <p className="text-gray-600">Review user and system activities</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </header>

        {/* Controls Section */}
        <div className="p-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[300px]">
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

              {/* Export CSV */}
              <button
                onClick={exportCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>

              {/* Clear Filters */}
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
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

          {/* Logs Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header with Count */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-700">Activity Logs</h2>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Logs Content */}
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#CC0000] mb-2"></div>
                  <p className="text-gray-500 text-sm">Loading logs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600 text-sm">{error}</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-2">No logs found</p>
                {getActiveFilterCount() > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-[#CC0000] text-sm hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">User</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                      <th className="px-4 py-3 text-left font-medium">Details</th>
                      <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {log.userName || "System"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.id_number || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-md">
                          {log.details || "—"}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Date Range Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
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