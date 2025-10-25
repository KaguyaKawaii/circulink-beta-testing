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
  X
} from "lucide-react";

// Import shared room images configuration
import { availableRoomImages } from "../data/roomImages";

function AdminRooms({ setView }) {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [floor, setFloor] = useState("");
  const [roomType, setRoomType] = useState("General");
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
  const mainRef = useRef(null);

  const roomTypes = ["General", "Lab", "Conference", "Lecture", "Meeting", "Special"];
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
  image: roomImage ? roomImage.id : null, // Save only the ID
  isActive: true
};
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/rooms`, roomData);
      fetchRooms();
      resetForm();
      setShowAddRoom(false);
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
  image: roomImage ? roomImage.id : null, // Save only the ID
  isActive: true
};

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/rooms/${editingRoom._id}`, roomData);
      fetchRooms();
      resetForm();
      setEditingRoom(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`);
        fetchRooms();
      } catch (err) {
        console.error(err);
      }
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
    setRoomType("General");
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

  const filteredRooms = selectedFloor === "All Floors" 
    ? rooms 
    : rooms.filter(room => room.floor === selectedFloor);

  const roomsByFloor = floors.reduce((acc, floor) => {
    if (floor === "All Floors") return acc;
    acc[floor] = rooms.filter(room => room.floor === floor);
    return acc;
  }, {});

  const activeRoomsCount = rooms.filter(room => room.isActive).length;
  const inactiveRoomsCount = rooms.filter(room => !room.isActive).length;

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminRoom" />
      <main
        ref={mainRef}
        tabIndex="-1"
        className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 outline-none"
      >
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <StatCard 
              title="Total Rooms" 
              value={rooms.length} 
              icon={<MapPin size={20} />} 
              color="blue" 
            />
            <StatCard 
              title="Active Rooms" 
              value={activeRoomsCount} 
              icon={<Eye size={20} />} 
              color="green" 
            />
            <StatCard 
              title="Inactive Rooms" 
              value={inactiveRoomsCount} 
              icon={<EyeOff size={20} />} 
              color="orange" 
            />
            <StatCard 
              title="Available Floors" 
              value={floors.length - 1} 
              icon={<Building size={20} />} 
              color="purple" 
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <FloorFilter 
              floors={floors}
              selectedFloor={selectedFloor}
              setSelectedFloor={setSelectedFloor}
              roomsByFloor={roomsByFloor}
            />
            
            <AllRoomsSection
              rooms={filteredRooms}
              isLoading={isLoading}
              showAddRoom={showAddRoom}
              setShowAddRoom={setShowAddRoom}
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
              setRoomImage={setRoomImage}
              handleAddRoom={handleAddRoom}
              handleUpdateRoom={handleUpdateRoom}
              handleDeleteRoom={handleDeleteRoom}
              handleToggleRoomStatus={handleToggleRoomStatus}
              handleEditRoom={handleEditRoom}
              editingRoom={editingRoom}
              cancelEdit={cancelEdit}
              roomTypes={roomTypes}
              floors={floors.filter(f => f !== "All Floors")}
              selectedFloor={selectedFloor}
              availableRoomImages={availableRoomImages}
              showImageSelector={showImageSelector}
              setShowImageSelector={setShowImageSelector}
              handleImageSelect={handleImageSelect}
              handleRemoveImage={handleRemoveImage}
            />
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600"
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function FloorFilter({ floors, selectedFloor, setSelectedFloor, roomsByFloor }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Filter by Floor</h2>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {floors.map((floor) => (
          <button
            key={floor}
            onClick={() => setSelectedFloor(floor)}
            className={`px-4 py-3 rounded-xl border transition-all duration-300 font-medium text-sm ${
              selectedFloor === floor
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md border-red-600 cursor-pointer"
                : "bg-white text-gray-700 border-gray-300 hover:border-red-300 hover:bg-red-50 cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-2">
              <Building size={16} />
              <span>{floor}</span>
              {floor !== "All Floors" && (
                <span className={`px-2 py-1 rounded-full text-xs ${
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

function AllRoomsSection({
  rooms,
  isLoading,
  showAddRoom,
  setShowAddRoom,
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
  setRoomImage,
  handleAddRoom,
  handleUpdateRoom,
  handleDeleteRoom,
  handleToggleRoomStatus,
  handleEditRoom,
  editingRoom,
  cancelEdit,
  roomTypes,
  floors,
  selectedFloor,
  availableRoomImages,
  showImageSelector,
  setShowImageSelector,
  handleImageSelect,
  handleRemoveImage
}) {
  const toggleFeature = (feature) => {
    setRoomFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

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

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${colors[feature]}`}>
        {icons[feature]}
        {feature}
      </span>
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {selectedFloor === "All Floors" ? "All Rooms" : `${selectedFloor} Rooms`}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedFloor === "All Floors" 
              ? `Showing all ${rooms.length} rooms across all floors` 
              : `Showing ${rooms.length} room${rooms.length !== 1 ? 's' : ''} on ${selectedFloor}`
            }
          </p>
        </div>
        <button
          onClick={() => {
            if (editingRoom) cancelEdit();
            setShowAddRoom(!showAddRoom);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-sm hover:shadow-md text-sm font-medium cursor-pointer"
        >
          <Plus size={16} />
          {showAddRoom ? "Cancel" : editingRoom ? "Editing Room" : "Add Room"}
        </button>
      </div>

      {(showAddRoom || editingRoom) && (
        <form 
          onSubmit={editingRoom ? handleUpdateRoom : handleAddRoom} 
          className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-gradient-to-br from-blue-50/50 to-gray-50/50 rounded-2xl border border-blue-200/40 shadow-sm"
        >
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingRoom ? `Edit ${editingRoom.room}` : "Add New Room"}
            </h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Name *</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-0 focus:border-transparent transition-all"
              placeholder="e.g. Conference Room A"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Floor *</label>
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-0 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select Floor</option>
              {floors.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-0 focus:border-transparent transition-all cursor-pointer"
            >
              {roomTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Capacity *</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-0 focus:border-transparent transition-all"
              placeholder="e.g. 20"
              min="1"
            />
          </div>

          {/* Room Image Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Image</label>
            <div className="space-y-3">
              {roomImage ? (
                <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-xl bg-white">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img 
                      src={roomImage.url} 
                      alt={roomImage.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{roomImage.name}</p>
                    <p className="text-sm text-gray-500">{roomImage.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowImageSelector(true)}
                  className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-yellow-400 hover:bg-yellow-50/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <Image size={24} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Select Room Image</span>
                  <span className="text-xs text-gray-500">Choose from available room images</span>
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Features</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(roomFeatures).map(feature => (
                <button
                  key={feature}
                  type="button"
                  onClick={() => toggleFeature(feature)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                    roomFeatures[feature] 
                      ? "bg-blue-50 border-blue-200 text-blue-700" 
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <FeatureIcon feature={feature} enabled={roomFeatures[feature]} />
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare size={14} className="inline mr-2" />
              Notes & Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-0 focus:border-transparent transition-all"
              placeholder="e.g. Under maintenance, No aircon, Special equipment available..."
              rows="3"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md text-sm font-medium cursor-pointer"
            >
              {editingRoom ? "Update Room" : "Add Room"}
            </button>
          </div>
        </form>
      )}

      {/* Image Selector Modal */}
      {showImageSelector && (
        <div className="fixed inset-0 bg-black/10 rounded-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Select Room Image</h3>
              <button
                onClick={() => setShowImageSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableRoomImages.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => handleImageSelect(image)}
                    className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={image.url} 
                        alt={image.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-gray-800 text-sm">{image.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{image.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowImageSelector(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-center">
  
  <p className="text-gray-500 font-bold">Loading rooms...</p>


</div>
          
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border-2 border-dashed border-gray-300">
          <MapPin className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {selectedFloor === "All Floors" ? "No rooms added yet" : `No rooms on ${selectedFloor}`}
          </h3>
          <p className="text-gray-500 mb-4">
            {selectedFloor === "All Floors" 
              ? "Get started by adding your first room" 
              : `Add a room to ${selectedFloor} to get started`
            }
          </p>
          <button
            onClick={() => setShowAddRoom(true)}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md text-sm font-medium cursor-pointer"
          >
            <Plus size={16} className="inline mr-2" />
            {selectedFloor === "All Floors" ? "Add Your First Room" : `Add Room to ${selectedFloor}`}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div 
              key={room._id} 
              className={`bg-white border rounded-2xl p-4 transition-all duration-300 hover:shadow-md ${
                room.isActive 
                  ? "border-green-200/60 hover:border-green-300/60" 
                  : "border-red-200/60 hover:border-red-300/60 opacity-80"
              }`}
            >
              {/* Room Image Preview */}
      {room.image && (
  <div className="mb-3 rounded-xl overflow-hidden h-32 bg-gray-100">
    <img 
      src={getRoomImageById(room.image)?.url} 
      alt={room.room}
      className="w-full h-full object-cover"
    />
  </div>
)}
              
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 text-sm">{room.room}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      room.isActive 
                        ? "bg-green-100 text-green-800 border border-green-200" 
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                      {room.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{room.floor} • {room.type}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditRoom(room)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit room"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room._id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete room"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center text-xs text-gray-500">
                  <Users size={12} className="mr-1" />
                  Capacity: {room.capacity}
                </div>
                <button
                  onClick={() => handleToggleRoomStatus(room)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    room.isActive
                      ? "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
                      : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700"
                  }`}
                >
                  {room.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>

              {room.features && Object.values(room.features).some(val => val) && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {Object.entries(room.features).map(([feature, enabled]) => 
                    enabled && <FeatureIcon key={feature} feature={feature} enabled={enabled} />
                  )}
                </div>
              )}

              {room.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                  <p className="text-xs text-yellow-800 flex items-start gap-1">
                    <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{room.notes}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminRooms;