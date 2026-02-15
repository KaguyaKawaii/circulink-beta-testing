import { useState, useEffect } from "react";
import {
  DoorOpen,
  TrendingUp,
  CalendarCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsRooms({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [roomData, setRoomData] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
    utilization: 0,
    byType: {
      lecture: 0,
      laboratory: 0,
      conference: 0,
      office: 0
    },
    roomDetails: [],
    hourlyUtilization: [],
    topRooms: []
  });

  useEffect(() => {
    fetchRoomAnalytics();
  }, [dateRange]);

  const fetchRoomAnalytics = async () => {
    setLoading(true);
    try {
      // Mock data
      setTimeout(() => {
        setRoomData(getMockRoomData(dateRange));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching room analytics:", error);
      setLoading(false);
    }
  };

  const getMockRoomData = (range) => {
    return {
      total: 25,
      available: 12,
      occupied: 8,
      maintenance: 3,
      utilization: 68,
      byType: {
        lecture: 12,
        laboratory: 6,
        conference: 4,
        office: 3
      },
      roomDetails: [
        { name: "Room 101", type: "Lecture", capacity: 50, bookings: 450, utilization: 78, status: "available" },
        { name: "Room 102", type: "Lecture", capacity: 40, bookings: 380, utilization: 68, status: "occupied" },
        { name: "Room 103", type: "Lecture", capacity: 60, bookings: 520, utilization: 85, status: "available" },
        { name: "Room 104", type: "Laboratory", capacity: 30, bookings: 280, utilization: 62, status: "maintenance" },
        { name: "Room 201", type: "Conference", capacity: 25, bookings: 290, utilization: 52, status: "available" },
        { name: "Room 202", type: "Lecture", capacity: 45, bookings: 410, utilization: 72, status: "occupied" },
        { name: "Room 203", type: "Laboratory", capacity: 25, bookings: 230, utilization: 55, status: "available" },
        { name: "Lab A", type: "Laboratory", capacity: 35, bookings: 340, utilization: 70, status: "occupied" },
        { name: "Lab B", type: "Laboratory", capacity: 30, bookings: 260, utilization: 58, status: "maintenance" },
        { name: "Conference A", type: "Conference", capacity: 20, bookings: 210, utilization: 48, status: "available" }
      ],
      hourlyUtilization: [
        { hour: "8AM", utilization: 45 },
        { hour: "9AM", utilization: 65 },
        { hour: "10AM", utilization: 82 },
        { hour: "11AM", utilization: 88 },
        { hour: "12PM", utilization: 72 },
        { hour: "1PM", utilization: 68 },
        { hour: "2PM", utilization: 85 },
        { hour: "3PM", utilization: 90 },
        { hour: "4PM", utilization: 78 },
        { hour: "5PM", utilization: 62 }
      ],
      topRooms: [
        { name: "Room 103", bookings: 520, utilization: 85, type: "Lecture" },
        { name: "Room 101", bookings: 450, utilization: 78, type: "Lecture" },
        { name: "Room 202", bookings: 410, utilization: 72, type: "Lecture" },
        { name: "Room 102", bookings: 380, utilization: 68, type: "Lecture" },
        { name: "Lab A", bookings: 340, utilization: 70, type: "Laboratory" }
      ]
    };
  };

  const StatCard = ({ title, value, icon: Icon, color = "blue", subtext }) => (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 bg-${color}-500/10 rounded-lg`}>
          <Icon size={24} className={`text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
        <div className="p-8 flex items-center justify-center h-screen">
          <RefreshCw size={40} className="animate-spin text-red-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Room Analytics</h1>
            <p className="text-gray-400">Monitor room utilization, availability, and performance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-gray-800">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                    dateRange === range
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <button className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white">
              <Download size={18} />
            </button>
            <button 
              onClick={fetchRoomAnalytics}
              className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Rooms" value={roomData.total} icon={DoorOpen} color="blue" />
          <StatCard title="Available" value={roomData.available} icon={CheckCircle} color="green" subtext="Ready for booking" />
          <StatCard title="Occupied" value={roomData.occupied} icon={Activity} color="orange" subtext="Currently in use" />
          <StatCard title="Maintenance" value={roomData.maintenance} icon={AlertCircle} color="red" subtext="Under maintenance" />
        </div>

        {/* Room Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* By Type */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Rooms by Type</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Lecture Halls</span>
                  <span className="text-white font-medium">{roomData.byType.lecture}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 rounded-full h-2" style={{ width: `${(roomData.byType.lecture / roomData.total) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Laboratories</span>
                  <span className="text-white font-medium">{roomData.byType.laboratory}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2" style={{ width: `${(roomData.byType.laboratory / roomData.total) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Conference Rooms</span>
                  <span className="text-white font-medium">{roomData.byType.conference}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-500 rounded-full h-2" style={{ width: `${(roomData.byType.conference / roomData.total) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Offices</span>
                  <span className="text-white font-medium">{roomData.byType.office}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-orange-500 rounded-full h-2" style={{ width: `${(roomData.byType.office / roomData.total) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Utilization */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Peak Hours Utilization</h2>
            <div className="space-y-3">
              {roomData.hourlyUtilization.map((hour, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{hour.hour}</span>
                    <span className="text-white font-medium">{hour.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`rounded-full h-2 ${
                        hour.utilization > 80 ? 'bg-green-500' :
                        hour.utilization > 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${hour.utilization}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Room Details Table */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Room Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Room</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Capacity</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Bookings</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Utilization</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {roomData.roomDetails.map((room, index) => (
                  <tr key={index} className="border-b border-gray-800/50">
                    <td className="py-3 text-white font-medium">{room.name}</td>
                    <td className="py-3 text-gray-400">{room.type}</td>
                    <td className="py-3 text-white">{room.capacity}</td>
                    <td className="py-3 text-white">{room.bookings}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 rounded-full h-2" 
                            style={{ width: `${room.utilization}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-400 text-sm">{room.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        room.status === 'available' ? 'bg-green-500/20 text-green-400' :
                        room.status === 'occupied' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {room.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsRooms;