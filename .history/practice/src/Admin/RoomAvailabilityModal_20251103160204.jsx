import React from 'react';
import { X, Check, Clock, AlertCircle, MapPin, Users, Calendar } from 'lucide-react';

const RoomAvailabilityModal = ({ show, onClose, date, roomStatuses, loading, error }) => {
  if (!show) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <Check className="text-green-500" size={20} />;
      case 'booked':
        return <Users className="text-red-500" size={20} />;
      case 'pending':
        return <Clock className="text-amber-500" size={20} />;
      default:
        return <AlertCircle className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'booked':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'booked':
        return 'Booked';
      case 'pending':
        return 'Pending Approval';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Room Availability</h2>
              <p className="text-gray-600 text-sm">
                {date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading room availability...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">Failed to load room availability</p>
              <p className="text-gray-600 text-sm">{error}</p>
            </div>
          ) : roomStatuses.length === 0 ? (
            <div className="text-center py-12">
              <MapPin size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No room data available</p>
              <p className="text-gray-500 text-sm">No room information found for the selected date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roomStatuses.map((room) => (
                <div
                  key={room._id || room.room}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <MapPin size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{room.room}</h3>
                        <p className="text-sm text-gray-500">{room.department || 'General'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(room.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(room.status)}`}>
                        {getStatusText(room.status)}
                      </span>
                    </div>
                  </div>

                  {room.bookings && room.bookings.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Bookings:</h4>
                      <div className="space-y-2">
                        {room.bookings.map((booking, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{booking.time}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              booking.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              booking.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {room.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{room.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomAvailabilityModal;