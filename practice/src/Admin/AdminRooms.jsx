import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import AdminNavigation from "./AdminNavigation";
import { 
  Plus, 
  Trash2, 
  Users, 
  MapPin, 
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  MessageSquare,
  Wifi,
  Snowflake,
  Monitor,
  Projector,
  Building,
  Image,
  X,
  CheckCircle2,
  Circle,
  LayoutGrid,
  Calendar,
  Clock,
  AlertCircle
} from "lucide-react";

// Import shared room images configuration
import { availableRoomImages } from "../data/roomImages";

function AdminRooms({ setView, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [floor, setFloor] = useState("");
  const [roomType, setRoomType] = useState("Meeting");
  const [capacity, setCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [roomImage, setRoomImage] = useState(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFeatures, setRoomFeatures] = useState({
    wifi: false,
    aircon: false,
    projector: false,
    monitor: false
  });
  const [selectedFloor, setSelectedFloor] = useState("All Floors");
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const mainRef = useRef(null);

  const roomTypes = ["Meeting", "Conference", "Training", "Boardroom"];
  const floors = ["All Floors", "Ground Floor", "2nd Floor", "4th Floor", "5th Floor"];

  useEffect(() => {
    fetchRooms();

    setTimeout(() => {
      if (mainRef.current) {
        mainRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        mainRef.current.focus({ preventScroll: true });
      }
    }, 100);
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`);
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!roomName || !floor || !capacity || parseInt(capacity) <= 0) {
      alert("Please fill in all required fields correctly.");
      return;
    }

    const roomData = {
      room: roomName,
      floor: floor,
      type: roomType,
      capacity: parseInt(capacity),
      notes: notes,
      features: roomFeatures,
      image: roomImage,
      isActive: true
    };

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/rooms`, roomData);
      fetchRooms();
      resetForm();
      setShowAddRoom(false);
      
      // Emit socket event
      socket.emit('room_updated', { type: 'room_created' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    if (!roomName || !floor || !capacity || parseInt(capacity) <= 0) {
      alert("Please fill in all required fields correctly.");
      return;
    }

    const roomData = {
      room: roomName,
      floor: floor,
      type: roomType,
      capacity: parseInt(capacity),
      notes: notes,
      features: roomFeatures,
      image: roomImage,
      isActive: true
    };

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/rooms/${editingRoom._id}`, roomData);
      fetchRooms();
      resetForm();
      setEditingRoom(null);
      
      // Emit socket event
      socket.emit('room_updated', { type: 'room_updated', roomId: editingRoom._id });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoom = async (id) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`);
      fetchRooms();
      setDeleteConfirm(null);
      
      // Emit socket event
      socket.emit('room_updated', { type: 'room_deleted', roomId: id });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRoomStatus = async (room) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/rooms/${room._id}`, {
        ...room,
        isActive: !room.isActive
      });
      fetchRooms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setRoomName(room.room);
    setFloor(room.floor);
    setRoomType(room.type);
    setCapacity(room.capacity.toString());
    setNotes(room.notes || "");
    setRoomImage(room.image || null);
    setRoomFeatures(room.features || {
      wifi: false,
      aircon: false,
      projector: false,
      monitor: false
    });
    setShowAddRoom(true);
  };

  const resetForm = () => {
    setRoomName("");
    setFloor("");
    setRoomType("Meeting");
    setCapacity("");
    setNotes("");
    setRoomFeatures({
      wifi: false,
      aircon: false,
      projector: false,
      monitor: false
    });
    setRoomImage(null);
    setEditingRoom(null);
  };

  const cancelEdit = () => {
    resetForm();
    setShowAddRoom(false);
    setEditingRoom(null);
  };

  const handleImageSelect = (image) => {
    setRoomImage(image);
    setShowImageSelector(false);
  };

  const handleRemoveImage = () => {
    setRoomImage(null);
  };

  // Filter and search rooms
  const filteredRooms = rooms.filter(room => {
    const matchesFloor = selectedFloor === "All Floors" || room.floor === selectedFloor;
    const matchesSearch = room.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.floor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFloor && matchesSearch;
  });

  const roomsByFloor = floors.reduce((acc, floor) => {
    if (floor === "All Floors") return acc;
    acc[floor] = rooms.filter(room => room.floor === floor);
    return acc;
  }, {});

  const activeRoomsCount = rooms.filter(room => room.isActive).length;
  const inactiveRoomsCount = rooms.filter(room => !room.isActive).length;
  const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);

  return (
    <>
      <AdminNavigation 
        setView={setView} 
        currentView="adminRoom" 
        onLogout={onLogout}
      />
      <main
        ref={mainRef}
        tabIndex="-1"
        className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 outline-none"
      >
        {/* Header - Preserved exactly as requested */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                Room Management
              </h1>
              <p className="text-gray-600">
                Manage rooms, availability, and configurations
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

        <div className="p-6">
          {/* Stats Cards - Removed hover scale effect */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Rooms" 
              value={rooms.length} 
              icon={<MapPin size={20} />} 
              color="blue"
              trend="+2 this month"
            />
            <StatCard 
              title="Active Rooms" 
              value={activeRoomsCount} 
              icon={<Eye size={20} />} 
              color="green"
              percentage={rooms.length ? Math.round((activeRoomsCount / rooms.length) * 100) : 0}
            />
            <StatCard 
              title="Inactive Rooms" 
              value={inactiveRoomsCount} 
              icon={<EyeOff size={20} />} 
              color="orange"
              percentage={rooms.length ? Math.round((inactiveRoomsCount / rooms.length) * 100) : 0}
            />
            <StatCard 
              title="Total Capacity" 
              value={totalCapacity} 
              icon={<Users size={20} />} 
              color="purple"
              subtitle="seats available"
            />
          </div>

          {/* Filter Section - Removed Quick Filters, now full width */}
          <div className="mb-6">
            <FloorFilter 
              floors={floors}
              selectedFloor={selectedFloor}
              setSelectedFloor={setSelectedFloor}
              roomsByFloor={roomsByFloor}
            />
          </div>

          {/* Main Content Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
            {/* Section Header with Controls */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedFloor === "All Floors" ? "All Rooms" : `${selectedFloor} Rooms`}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} found
                    {selectedFloor !== "All Floors" && ` on ${selectedFloor}`}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search rooms..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none focus:border-transparent w-64"
                    />
                    <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>

                  {/* View Toggle */}
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 transition-colors ${viewMode === "grid" ? "bg-red-50 text-red-600" : "bg-white text-gray-400 hover:text-gray-600"}`}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 transition-colors ${viewMode === "list" ? "bg-red-50 text-red-600" : "bg-white text-gray-400 hover:text-gray-600"}`}
                    >
                      <Menu size={18} />
                    </button>
                  </div>

                  {/* Add Room Button */}
                  <button
                    onClick={() => {
                      if (editingRoom) cancelEdit();
                      setShowAddRoom(!showAddRoom);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-sm hover:shadow-md text-sm font-medium"
                  >
                    <Plus size={16} />
                    {showAddRoom ? "Cancel" : editingRoom ? "Editing Room" : "Add Room"}
                  </button>
                </div>
              </div>
            </div>

            {/* Add/Edit Room Form */}
            {(showAddRoom || editingRoom) && (
              <RoomForm
                editingRoom={editingRoom}
                roomName={roomName}
                setRoomName={setRoomName}
                floor={floor}
                setFloor={setFloor}
                roomType={roomType}
                setRoomType={setRoomType}
                capacity={capacity}
                setCapacity={setCapacity}
                notes={notes}
                setNotes={setNotes}
                roomFeatures={roomFeatures}
                setRoomFeatures={setRoomFeatures}
                roomImage={roomImage}
                handleImageSelect={handleImageSelect}
                handleRemoveImage={handleRemoveImage}
                setShowImageSelector={setShowImageSelector}
                handleAddRoom={handleAddRoom}
                handleUpdateRoom={handleUpdateRoom}
                cancelEdit={cancelEdit}
                roomTypes={roomTypes}
                floors={floors.filter(f => f !== "All Floors")}
              />
            )}

            {/* Image Selector Modal */}
            {showImageSelector && (
              <ImageSelector
                availableRoomImages={availableRoomImages}
                onSelect={handleImageSelect}
                onClose={() => setShowImageSelector(false)}
              />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
              <DeleteConfirmation
                roomName={deleteConfirm.room}
                onConfirm={() => handleDeleteRoom(deleteConfirm._id)}
                onCancel={() => setDeleteConfirm(null)}
              />
            )}

            {/* Rooms Display */}
            {isLoading ? (
              <LoadingState />
            ) : filteredRooms.length === 0 ? (
              <EmptyState 
                selectedFloor={selectedFloor}
                setShowAddRoom={setShowAddRoom}
                searchTerm={searchTerm}
              />
            ) : (
              <div className="p-6">
                {viewMode === "grid" ? (
                  <GridRooms
                    rooms={filteredRooms}
                    onEdit={handleEditRoom}
                    onDelete={(room) => setDeleteConfirm(room)}
                    onToggleStatus={handleToggleRoomStatus}
                  />
                ) : (
                  <ListRooms
                    rooms={filteredRooms}
                    onEdit={handleEditRoom}
                    onDelete={(room) => setDeleteConfirm(room)}
                    onToggleStatus={handleToggleRoomStatus}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// StatCard - Removed hover scale effect
function StatCard({ title, value, icon, color, trend, percentage, subtitle }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600"
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {percentage !== undefined && (
            <div className="mt-2">
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${colorClasses[color].split(' ')[0]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}
          {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// FloorFilter component
function FloorFilter({ floors, selectedFloor, setSelectedFloor, roomsByFloor }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Filter by Floor</h2>
        <span className="text-xs text-gray-500">Click to filter rooms</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {floors.map((floor) => (
          <button
            key={floor}
            onClick={() => setSelectedFloor(floor)}
            className={`px-4 py-2.5 rounded-xl border transition-all duration-300 font-medium text-sm ${
              selectedFloor === floor
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md border-red-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50/50 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <Building size={16} />
              <span>{floor}</span>
              {floor !== "All Floors" && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedFloor === floor 
                    ? "bg-white/20 text-white" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {roomsByFloor[floor]?.length || 0}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Room Form Component
function RoomForm({
  editingRoom,
  roomName,
  setRoomName,
  floor,
  setFloor,
  roomType,
  setRoomType,
  capacity,
  setCapacity,
  notes,
  setNotes,
  roomFeatures,
  setRoomFeatures,
  roomImage,
  handleImageSelect,
  handleRemoveImage,
  setShowImageSelector,
  handleAddRoom,
  handleUpdateRoom,
  cancelEdit,
  roomTypes,
  floors
}) {
  const toggleFeature = (feature) => {
    setRoomFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  return (
    <form 
      onSubmit={editingRoom ? handleUpdateRoom : handleAddRoom} 
      className="p-6 bg-gradient-to-br from-blue-50/50 to-gray-50/50 border-b border-gray-200"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {editingRoom ? `Edit Room: ${editingRoom.room}` : "Add New Room"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {editingRoom ? "Update room details below" : "Fill in the details to create a new room"}
          </p>
        </div>
        {editingRoom && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            Editing Mode
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Room Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none focus:border-transparent transition-all bg-white"
            placeholder="e.g. Conference Room A"
          />
        </div>
        
        {/* Floor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Floor <span className="text-red-500">*</span>
          </label>
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none focus:border-transparent transition-all bg-white cursor-pointer"
          >
            <option value="">Select Floor</option>
            {floors.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Room Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none focus:border-transparent transition-all bg-white cursor-pointer"
          >
            {roomTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capacity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none focus:border-transparent transition-all bg-white"
            placeholder="e.g. 20"
            min="1"
          />
        </div>

        {/* Room Image */}
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Room Image</label>
          {roomImage ? (
            <div className="flex items-center gap-3 p-3 border border-gray-300 rounded-xl bg-white">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={roomImage.url} 
                  alt={roomImage.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{roomImage.name}</p>
                <p className="text-xs text-gray-500">{roomImage.category}</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowImageSelector(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-yellow-400 hover:bg-yellow-50/50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Image size={20} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Select Image</span>
            </button>
          )}
        </div>

        {/* Features */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-3">Room Features</label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(roomFeatures).map(feature => (
              <button
                key={feature}
                type="button"
                onClick={() => toggleFeature(feature)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  roomFeatures[feature] 
                    ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {feature === 'wifi' && <Wifi size={16} />}
                {feature === 'aircon' && <Snowflake size={16} />}
                {feature === 'projector' && <Projector size={16} />}
                {feature === 'monitor' && <Monitor size={16} />}
                <span className="text-sm capitalize">{feature}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes & Remarks
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none focus:border-transparent transition-all bg-white"
            placeholder="e.g. Under maintenance, Special equipment available..."
            rows="3"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={cancelEdit}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md text-sm font-medium"
        >
          {editingRoom ? "Update Room" : "Add Room"}
        </button>
      </div>
    </form>
  );
}

// Image Selector Modal
function ImageSelector({ availableRoomImages, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden animate-slideUp">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Select Room Image</h3>
            <p className="text-sm text-gray-500 mt-1">Choose an image that best represents this room</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRoomImages.map((image) => (
              <div
                key={image.id}
                onClick={() => onSelect(image)}
                className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-yellow-400"
              >
                <div className="relative aspect-video overflow-hidden bg-gray-100">
                  <img 
                    src={image.url} 
                    alt={image.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div className="p-4">
                  <p className="font-medium text-gray-800 text-sm">{image.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{image.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmation({ roomName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slideUp">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle size={24} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 text-center mb-2">Delete Room</h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            Are you sure you want to delete <span className="font-semibold">"{roomName}"</span>?<br />
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Delete Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="p-12">
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Loading rooms...</p>
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ selectedFloor, setShowAddRoom, searchTerm }) {
  return (
    <div className="p-12">
      <div className="text-center max-w-md mx-auto">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-8 border-2 border-dashed border-gray-300">
          <MapPin className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {searchTerm ? "No matching rooms found" : 
             selectedFloor === "All Floors" ? "No rooms added yet" : `No rooms on ${selectedFloor}`}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            {searchTerm ? "Try adjusting your search or filter criteria" :
             selectedFloor === "All Floors" 
              ? "Get started by adding your first room" 
              : `Add a room to ${selectedFloor} to get started`}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddRoom(true)}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md text-sm font-medium"
            >
              <Plus size={16} className="inline mr-2" />
              {selectedFloor === "All Floors" ? "Add Your First Room" : `Add Room to ${selectedFloor}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Grid View for Rooms
function GridRooms({ rooms, onEdit, onDelete, onToggleStatus }) {
  const FeatureIcon = ({ feature, enabled }) => {
    const icons = {
      wifi: <Wifi size={14} />,
      aircon: <Snowflake size={14} />,
      projector: <Projector size={14} />,
      monitor: <Monitor size={14} />
    };

    const colors = {
      wifi: enabled ? "text-blue-600 bg-blue-100" : "text-gray-400 bg-gray-100",
      aircon: enabled ? "text-green-600 bg-green-100" : "text-gray-400 bg-gray-100",
      projector: enabled ? "text-purple-600 bg-purple-100" : "text-gray-400 bg-gray-100",
      monitor: enabled ? "text-orange-600 bg-orange-100" : "text-gray-400 bg-gray-100"
    };

    return enabled ? (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${colors[feature]}`}>
        {icons[feature]}
        <span className="capitalize">{feature}</span>
      </span>
    ) : null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <div 
          key={room._id} 
          className={`group bg-white border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
            room.isActive 
              ? "border-green-200/60 hover:border-green-300/60" 
              : "border-red-200/60 hover:border-red-300/60 opacity-80"
          }`}
        >
          {/* Room Image */}
          {room.image ? (
            <div className="relative h-40 overflow-hidden">
              <img 
                src={room.image.url} 
                alt={room.room}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  room.isActive 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {room.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Image size={32} className="text-gray-400" />
              <div className="absolute top-3 left-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  room.isActive 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {room.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          )}
          
          <div className="p-5">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-800 text-lg">{room.room}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Building size={12} />
                    {room.floor}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{room.type}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(room)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit room"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => onDelete(room)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete room"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Capacity and Status Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  Capacity: <span className="font-semibold">{room.capacity}</span>
                </span>
              </div>
              <button
                onClick={() => onToggleStatus(room)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  room.isActive
                    ? "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
                    : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700"
                }`}
              >
                {room.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{room.isActive ? "Deactivate" : "Activate"}</span>
              </button>
            </div>

            {/* Features */}
            {room.features && Object.values(room.features).some(val => val) && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {Object.entries(room.features).map(([feature, enabled]) => 
                  enabled && <FeatureIcon key={feature} feature={feature} enabled={enabled} />
                )}
              </div>
            )}

            {/* Notes */}
            {room.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800 flex items-start gap-2">
                  <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{room.notes}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// List View for Rooms
function ListRooms({ rooms, onEdit, onDelete, onToggleStatus }) {
  const FeatureIcon = ({ feature, enabled }) => {
    const icons = {
      wifi: <Wifi size={14} />,
      aircon: <Snowflake size={14} />,
      projector: <Projector size={14} />,
      monitor: <Monitor size={14} />
    };

    return enabled ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
        {icons[feature]}
      </span>
    ) : null;
  };

  return (
    <div className="space-y-3">
      {rooms.map((room) => (
        <div 
          key={room._id} 
          className={`group bg-white border rounded-xl p-4 transition-all duration-300 hover:shadow-md ${
            room.isActive 
              ? "border-green-200/60 hover:border-green-300/60" 
              : "border-red-200/60 hover:border-red-300/60"
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Room Image Thumbnail */}
            {room.image ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={room.image.url} 
                  alt={room.room}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Image size={24} className="text-gray-400" />
              </div>
            )}

            {/* Room Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-800">{room.room}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  room.isActive 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {room.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Building size={12} />
                  {room.floor}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  Cap. {room.capacity}
                </span>
                {room.features && Object.values(room.features).some(val => val) && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {Object.entries(room.features).map(([feature, enabled]) => 
                        enabled && <FeatureIcon key={feature} feature={feature} enabled={enabled} />
                      )}
                    </div>
                  </>
                )}
              </div>

              {room.notes && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                  <MessageSquare size={12} className="inline mr-1" />
                  {room.notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleStatus(room)}
                className={`p-2 rounded-lg transition-colors ${
                  room.isActive
                    ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                    : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                }`}
                title={room.isActive ? "Deactivate" : "Activate"}
              >
                {room.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => onEdit(room)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit room"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => onDelete(room)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete room"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Menu icon component
function Menu(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default AdminRooms;