import { Megaphone, X, AlertTriangle, AlertCircle, Info, Bell, Calendar, User } from "lucide-react";

function AnnouncementModal({
  announcements,
  currentAnnouncementIndex,
  onCloseAll,
  showModal
}) {
  if (!showModal || announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentAnnouncementIndex];



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl bg-white rounded-lg shadow-2xl border-none overflow-hidden transform transition-all duration-300 scale-100 border-2 mx-auto">
        {/* Red Header */}
        <div className="px-4 sm:px-6 md:px-8 py-2 flex bg-gray-100/50 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-black tracking-tight">
                Library Announcement
              </h2>
            </div>
          </div>
          <button
            onClick={onCloseAll}
            className="p-2 sm:p-3 hover:bg-white/20 rounded-2xl transition-all duration-200 group cursor-pointer"
          >
            <X size={20} className="text-black group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content - Simplified */}
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 bg-white">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">
              {currentAnnouncement?.title}
            </h3>
            <div className="text-gray-700 text-base sm:text-lg leading-6 sm:leading-7 whitespace-pre-wrap">
              {currentAnnouncement?.message}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnnouncementModal;