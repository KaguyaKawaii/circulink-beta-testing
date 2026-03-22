// components/admin/AdminClosures.jsx
import { useState, useEffect } from "react";
import { Calendar, Clock, AlertTriangle, X, Check, Trash2, Edit, Eye, RefreshCw } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

const AdminClosures = () => {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClosure, setEditingClosure] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    reason: "",
    date: "",
    startTime: "",
    endTime: "",
    affectedAllRooms: false,
    affectedRooms: [],
    location: "All Floors"
  });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [conflictPreview, setConflictPreview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState({ status: "Active", search: "" });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });

  // Fetch closures on mount
  useEffect(() => {
    fetchClosures();
    fetchRooms();
  }, [filter, pagination.page]);

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        status: filter.status,
        ...(filter.search && { search: filter.search })
      });
      
      const response = await axios.get(`/api/closures?${params}`);
      setClosures(response.data.closures);
      setPagination({
        ...pagination,
        totalPages: response.data.pagination.totalPages,
        totalCount: response.data.pagination.totalCount
      });
    } catch (error) {
      console.error("Error fetching closures:", error);
      toast.error("Failed to fetch closures");
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get("/api/rooms");
      setAvailableRooms(response.data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleRoomSelection = (roomName) => {
    setFormData(prev => ({
      ...prev,
      affectedRooms: prev.affectedRooms.includes(roomName)
        ? prev.affectedRooms.filter(r => r !== roomName)
        : [...prev.affectedRooms, roomName]
    }));
  };

  const handlePreviewConflicts = async () => {
    try {
      const response = await axios.post("/api/closures/preview", {
        ...formData,
        affectedRooms: formData.affectedAllRooms ? [] : formData.affectedRooms
      });
      setConflictPreview(response.data);
    } catch (error) {
      console.error("Error previewing conflicts:", error);
      toast.error("Failed to preview conflicts");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (formData.startTime >= formData.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    if (!formData.affectedAllRooms && formData.affectedRooms.length === 0) {
      toast.error("Please select at least one room or select 'All Rooms'");
      return;
    }

    try {
      let response;
      if (editingClosure) {
        response = await axios.put(`/api/closures/${editingClosure._id}`, formData);
        toast.success("Closure updated successfully");
      } else {
        response = await axios.post("/api/closures", formData);
        toast.success(`Closure created. ${response.data.affectedReservations?.length || 0} reservations were cancelled.`);
      }
      
      setShowModal(false);
      setEditingClosure(null);
      setFormData({
        title: "",
        reason: "",
        date: "",
        startTime: "",
        endTime: "",
        affectedAllRooms: false,
        affectedRooms: [],
        location: "All Floors"
      });
      fetchClosures();
    } catch (error) {
      console.error("Error saving closure:", error);
      toast.error(error.response?.data?.message || "Failed to save closure");
    }
  };

  const handleDelete = async (closure) => {
    try {
      const restoreReservations = window.confirm(
        "Do you want to restore the reservations that were cancelled due to this closure?"
      );
      
      await axios.delete(`/api/closures/${closure._id}`, {
        data: { restoreReservations }
      });
      
      toast.success("Closure deleted successfully");
      fetchClosures();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting closure:", error);
      toast.error("Failed to delete closure");
    }
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (closure) => {
    const today = new Date().toISOString().split("T")[0];
    if (closure.date < today) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-600 text-white">Expired</span>;
    }
    if (closure.status === "Active") {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-600 text-white">Active</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-red-600 text-white">{closure.status}</span>;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Facility Closures</h1>
            <p className="text-gray-400 mt-1">Manage closures for university events and facility maintenance</p>
          </div>
          <button
            onClick={() => {
              setEditingClosure(null);
              setFormData({
                title: "",
                reason: "",
                date: "",
                startTime: "",
                endTime: "",
                affectedAllRooms: false,
                affectedRooms: [],
                location: "All Floors"
              });
              setShowModal(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Calendar size={18} />
            Create Closure
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by title, reason..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="All">All</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchClosures}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Closures List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : closures.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-50" />
              <p>No closures found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {closures.map((closure) => (
                <div key={closure._id} className="p-4 hover:bg-gray-750 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{closure.title}</h3>
                        {getStatusBadge(closure)}
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{closure.reason}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(closure.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{formatTime(closure.startTime)} - {formatTime(closure.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={14} />
                          <span>
                            {closure.affectedAllRooms ? "All Rooms" : `${closure.affectedRooms.length} room(s)`}
                          </span>
                        </div>
                        <div>
                          <span className="text-yellow-500">
                            {closure.affectedReservations?.length || 0} reservations affected
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingClosure(closure);
                          setFormData({
                            title: closure.title,
                            reason: closure.reason,
                            date: closure.date,
                            startTime: closure.startTime,
                            endTime: closure.endTime,
                            affectedAllRooms: closure.affectedAllRooms,
                            affectedRooms: closure.affectedRooms,
                            location: closure.location
                          });
                          setShowModal(true);
                        }}
                        className="p-2 hover:bg-gray-700 rounded-lg text-blue-400"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(closure)}
                        className="p-2 hover:bg-gray-700 rounded-lg text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 bg-gray-700 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-white">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 bg-gray-700 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingClosure ? "Edit Closure" : "Create Facility Closure"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
                  placeholder="e.g., University Foundation Day"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
                  placeholder="Explain why the facility is closed..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    name="affectedAllRooms"
                    checked={formData.affectedAllRooms}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-white">Affect all rooms</span>
                </label>

                {!formData.affectedAllRooms && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Affected Rooms</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-700 rounded-lg">
                      {availableRooms.map((room) => (
                        <label key={room._id} className="flex items-center gap-2 text-white text-sm">
                          <input
                            type="checkbox"
                            checked={formData.affectedRooms.includes(room.room)}
                            onChange={() => handleRoomSelection(room.room)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600"
                          />
                          <span>{room.room} ({room.floor})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handlePreviewConflicts}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                >
                  Preview Conflicts
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                >
                  {editingClosure ? "Update Closure" : "Create Closure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-yellow-500" />
              <h3 className="text-xl font-bold text-white">Delete Closure</h3>
            </div>
            <p className="text-gray-300 mb-2">
              Are you sure you want to delete "{showDeleteConfirm.title}"?
            </p>
            <p className="text-gray-400 text-sm mb-4">
              This closure affected {showDeleteConfirm.affectedReservations?.length || 0} reservations.
              {showDeleteConfirm.affectedReservations?.length > 0 && " You will have the option to restore them."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Preview Modal */}
      {conflictPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Conflict Preview</h3>
              <button
                onClick={() => setConflictPreview(null)}
                className="p-1 hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-yellow-500 mb-4">
                ⚠️ This closure will affect {conflictPreview.affectedCount} reservation(s):
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {conflictPreview.reservations?.map((res, idx) => (
                  <div key={idx} className="bg-gray-700 p-3 rounded-lg">
                    <p className="font-semibold text-white">{res.roomName}</p>
                    <p className="text-sm text-gray-300">
                      {res.userName} - {res.date} {res.startTime}-{res.endTime}
                    </p>
                    <p className="text-xs text-gray-400">Status: {res.status}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setConflictPreview(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClosures;