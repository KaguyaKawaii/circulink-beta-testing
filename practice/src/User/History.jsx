import { useEffect, useState } from "react";
import axios from "axios";
import { Calendar } from "react-calendar";
import "react-calendar/dist/Calendar.css";
import ReportProblemModal from "./Modals/ReportProblemModal";

function History({ user, setView, setSelectedReservation, historyRefreshKey }) {
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    if (!user || !user._id) return;

    const fetchReservations = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/user/${user._id}`);
        // Sort by datetime in descending order (latest first)
        const sortedReservations = response.data.sort(
          (a, b) => new Date(b.datetime) - new Date(a.datetime)
        );
        setReservations(sortedReservations);
        setFilteredReservations(sortedReservations);
        setCurrentPage(1); // Reset to first page when data changes
      } catch (error) {
        console.error("Failed to fetch reservations:", error);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchReservations();
  }, [user, historyRefreshKey]);

  useEffect(() => {
    let results = [...reservations];
    
    if (dateFilter) {
      const filterDate = new Date(dateFilter).setHours(0, 0, 0, 0);
      results = results.filter(res => {
        const resDate = new Date(res.datetime).setHours(0, 0, 0, 0);
        return resDate === filterDate;
      });
    }
    
    if (statusFilter !== "all") {
      results = results.filter(res => res.status === statusFilter);
    }
    
    setFilteredReservations(results);
    setCurrentPage(1); // Reset to first page when filters change
  }, [dateFilter, statusFilter, reservations]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReservations.slice(indexOfFirstItem, indexOfLastItem);

  const formatPH = (d) =>
    new Date(d).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const statusBadge = (status) => {
    const colorClass = {
      Approved: "bg-green-100 text-green-800 border border-green-200",
      Pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      Rejected: "bg-red-100 text-red-800 border border-red-200",
      Cancelled: "bg-gray-100 text-gray-600 border border-gray-200",
      Expired: "bg-gray-200 text-gray-500 border border-gray-300",
    }[status] || "bg-gray-100 text-gray-600 border border-gray-200";
    
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass} whitespace-nowrap`}
      >
        {status}
      </span>
    );
  };

  const clearFilters = () => {
    setDateFilter(null);
    setStatusFilter("all");
  };

  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex gap-3 p-4 border border-gray-200 rounded-lg bg-white"
        >
          <div className="mt-1.5">
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-start">
              <div className="h-5 bg-gray-300 rounded w-1/3"></div>
              <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-20 mt-2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Pagination component
  const Pagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{" "}
          <span className="font-semibold">
            {Math.min(indexOfLastItem, filteredReservations.length)}
          </span>{" "}
          of <span className="font-semibold">{filteredReservations.length}</span>{" "}
          reservations
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border ${
              currentPage === 1
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => setCurrentPage(1)}
                className={`w-8 h-8 rounded-lg border ${
                  currentPage === 1
                    ? "border-[#CC0000] bg-[#CC0000] text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                1
              </button>
              {startPage > 2 && (
                <span className="px-2 text-gray-400">...</span>
              )}
            </>
          )}

          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => setCurrentPage(number)}
              className={`w-8 h-8 rounded-lg border text-sm ${
                currentPage === number
                  ? "border-[#CC0000] bg-[#CC0000] text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
              }`}
            >
              {number}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className="px-2 text-gray-400">...</span>
              )}
              <button
                onClick={() => setCurrentPage(totalPages)}
                className={`w-8 h-8 rounded-lg border ${
                  currentPage === totalPages
                    ? "border-[#CC0000] bg-[#CC0000] text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border ${
              currentPage === totalPages
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Items per page:</span>
          <span className="font-semibold">{itemsPerPage}</span>
        </div>
      </div>
    );
  };

  return (
    <main className="w-full min-h-screen flex flex-col bg-gray-50 lg:ml-[250px] lg:w-[calc(100%-250px)]">
      {/* Header */}
      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">Reservation History</h1>
      </header>
      
      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats and Filter Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Reservation Overview</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 w-full sm:w-auto">
              <p className="text-sm text-gray-600 text-center sm:text-left">
                Total Reservations: <span className="font-bold text-gray-800">{reservations.length}</span>
              </p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm cursor-pointer flex-1 sm:flex-none justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 13.414V19a1 1 0 01-1.447.894 l-4-2A1 1 0 019 17v-3.586L3.293 6.707A1 1 0 013 6V4z"
                  />
                </svg>
                Filters
              </button>
              
              {(dateFilter || statusFilter !== "all") && (
                <button 
                  onClick={clearFilters}
                  className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm flex-1 sm:flex-none justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(dateFilter || statusFilter !== "all") && (
            <div className="flex flex-wrap gap-2 mt-4">
              {dateFilter && (
                <div className="bg-gray-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 border border-gray-200">
                  <span className="text-gray-700">Date: {new Date(dateFilter).toLocaleDateString()}</span>
                  <button 
                    onClick={() => setDateFilter(null)}
                    className="text-gray-500 hover:text-gray-700 cursor-pointer font-bold text-lg"
                  >
                    ×
                  </button>
                </div>
              )}
              {statusFilter !== "all" && (
                <div className="bg-gray-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 border border-gray-200">
                  <span className="text-gray-700">Status: {statusFilter}</span>
                  <button 
                    onClick={() => setStatusFilter("all")}
                    className="text-gray-500 hover:text-gray-700 cursor-pointer text-lg font-semibold"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reservation List Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            {filteredReservations.length} Reservation{filteredReservations.length !== 1 ? 's' : ''} Found
          </h2>
          
          {loading ? (
            <SkeletonLoader />
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl text-gray-400 mb-3 flex justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 sm:w-10 sm:h-10"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 mb-2 text-sm sm:text-base">
                {reservations.length === 0 
                  ? "No reservation records found." 
                  : "No reservations match your filters."}
              </p>
              {(dateFilter || statusFilter !== "all") && (
                <button 
                  onClick={clearFilters}
                  className="text-[#CC0000] font-medium hover:underline flex items-center justify-center mx-auto cursor-pointer text-sm sm:text-base"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:space-y-4">
                {currentItems.map((res, index) => (
                  <div
                    key={res._id || index}
                    className="flex gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedReservation(res);
                      setView("reservationDetails");
                    }}
                  >
                    <div className="mt-1 sm:mt-1.5 flex-shrink-0">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#CC0000] rounded-full"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 sm:mb-3">
                        <h2 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                          {res.roomName}
                        </h2>
                        <div className="flex-shrink-0">
                          {statusBadge(res.status)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 break-words">
                            <span className="font-semibold">Location:</span> {res.location}
                          </span>
                        </div>
                        
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 break-words">
                            <span className="font-semibold">Schedule:</span> {formatPH(res.datetime)}
                          </span>
                        </div>
                        
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 break-words">
                            <span className="font-semibold">Purpose:</span> {res.purpose}
                          </span>
                        </div>
                        
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-600 break-words">
                            <span className="font-semibold">Reserved on:</span>{" "}
                            {new Date(res.createdAt).toLocaleDateString("en-PH", {
                              timeZone: "Asia/Manila",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-[#CC0000] text-xs sm:text-sm font-medium mt-2">
                        <span>View Details</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {filteredReservations.length > itemsPerPage && (
                <Pagination />
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-2 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          {/* Copyright */}
          <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1 flex items-center gap-1">
            
            © {new Date().getFullYear()} <span className="font-semibold">USA-FLD CircuLink</span>
          </div>

          {/* Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1 text-xs sm:text-sm font-medium text-red-600 hover:text-red-800 transition-all duration-300 cursor-pointer order-1 sm:order-2 hover:gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 sm:h-4 sm:w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Report Problem
          </button>
        </div>
      </footer>

      {/* Modal Components */}
      {showReportModal && (
        <ReportProblemModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          user={user}
        />
      )}

      {/* Filter Modal with Blur Background */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blur Background */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowFilterModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 019 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                  </svg>
                  Filter Reservations
                </h3>
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Filter by Date
                  </label>
                  <Calendar
                    onChange={setDateFilter}
                    value={dateFilter}
                    className="border border-gray-300 rounded-lg p-2 w-full text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Filter by Status
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-center ${
                        statusFilter === "all" 
                          ? "bg-[#CC0000] text-white border border-[#CC0000]" 
                          : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      All Status
                    </button>
                    <button
                      onClick={() => setStatusFilter("Approved")}
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-center ${
                        statusFilter === "Approved" 
                          ? "bg-green-100 text-green-800 border border-green-300" 
                          : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      Approved
                    </button>
                    <button
                      onClick={() => setStatusFilter("Pending")}
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-center ${
                        statusFilter === "Pending" 
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-300" 
                          : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setStatusFilter("Rejected")}
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-center ${
                        statusFilter === "Rejected" 
                          ? "bg-red-100 text-red-800 border border-red-300" 
                          : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      Rejected
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 flex justify-end gap-2 sm:gap-3">
                <button
                  onClick={clearFilters}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer text-sm sm:text-base flex-1 sm:flex-none"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-3 sm:px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition cursor-pointer text-sm sm:text-base flex-1 sm:flex-none"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default History;