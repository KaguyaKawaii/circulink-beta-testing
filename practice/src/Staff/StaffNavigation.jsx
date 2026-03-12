import { useEffect, useState, useRef } from "react";
import axios from "axios";
import socket from "../utils/socket";
import Logo from "../assets/logo.png";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MessageSquare,
  Bell,
  User,
  LogOut,
} from "lucide-react";

function StaffNavigation({ staff, setView, currentView, onLogout }) {
  const [unreadCounts, setUnreadCounts] = useState({
    notifications: 0,
    messages: 0,
    reservations: 0
  });

  const [profile, setProfile] = useState(() =>
    staff || JSON.parse(localStorage.getItem("staff") || "{}")
  );

  const navRefs = useRef({});

  // 🔊 notification sound
  const messageSound = useRef(null);

  // ✅ ADDED: API base shortcut (no behavior change)
  const API = import.meta.env.VITE_API_URL;

  // ================= AUDIO =================
  useEffect(() => {
    // ✅ prevent duplicate audio instances
    if (!messageSound.current) {
      messageSound.current = new Audio("/ringtone_message.wav");
      messageSound.current.volume = 0.75;
      messageSound.current.setAttribute("aria-hidden", "true");
      messageSound.current.controls = false;
    }

    return () => {
      if (messageSound.current) {
        messageSound.current.pause();
        messageSound.current = null;
      }
    };
  }, []);

  // ================= PROFILE SYNC =================
  useEffect(() => {
    if (staff && staff._id) {
      setProfile(staff);
      localStorage.setItem("staff", JSON.stringify(staff));
    }
  }, [staff]);

  // ================= AUTO SCROLL =================
  useEffect(() => {
    const btn = navRefs.current[currentView];
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    btn?.focus();
  }, [currentView]);

  // ================= FETCH UNREAD =================
  const fetchUnreadCounts = async () => {
    if (!staff?._id) return;

    try {
      let notificationsCount = 0;
      try {
        const res = await axios.get(
          `${API}/api/notifications/unread-count/${staff._id}`
        );
        notificationsCount = res.data.count || 0;
      } catch {
        console.log("Notifications endpoint not available");
      }

      let messagesCount = 0;
      try {
        const res = await axios.get(
          `${API}/api/messages/staff-total-unread/${staff._id}`
        );
        messagesCount = res.data.count || 0;
      } catch {
        try {
          const fallback = await axios.get(
            `${API}/api/messages/unread-count/${staff._id}`
          );
          messagesCount = fallback.data.count || 0;
        } catch {
          console.log("Messages fallback endpoint not available");
        }
      }

      setUnreadCounts({
        notifications: notificationsCount,
        messages: messagesCount,
        reservations: 0
      });

    } catch (error) {
      console.error("Failed to fetch unread counts:", error);
    }
  };

  // ================= SOUND =================
  const playNotificationSound = () => {
    try {
      if (messageSound.current) {
        messageSound.current.currentTime = 0;
        messageSound.current.play().catch(() => {});
      }
    } catch {}
  };

  // ================= SOCKET =================
  useEffect(() => {
    if (!staff?._id) return;

    socket.emit("join", { userId: staff._id });
    socket.emit("join", { userId: staff.floor });

    fetchUnreadCounts();

    const handleUnreadCountUpdate = (data) => {
      if (data.userId === staff._id) {
        setUnreadCounts(prev => ({
          ...prev,
          messages: data.count || 0
        }));
      }
    };

    const handleNewMessage = (msg) => {
      if (
        msg.receiver === staff._id ||
        msg.receiver === staff.floor ||
        msg.sender === "admin"
      ) {
        fetchUnreadCounts();

        if (currentView !== "staffMessages") {
          if (msg.sender !== staff._id) {
            playNotificationSound();
          }
        }
      }
    };

    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    socket.on("newMessage", handleNewMessage);

    const interval = setInterval(fetchUnreadCounts, 60000);

    return () => {
      clearInterval(interval);

      // ✅ ADDED: leave socket rooms (prevents ghost listeners)
      socket.emit("leave", { userId: staff._id });
      socket.emit("leave", { userId: staff.floor });

      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
      socket.off("newMessage", handleNewMessage);
    };
  }, [staff?._id, currentView]);

  // ================= SAFE LOGOUT =================
  // ✅ ADDED (does not destroy parent logout)
  const handleLogoutClick = () => {
    localStorage.removeItem("staff");
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    if (socket.connected) {
      socket.disconnect();
    }

    if (onLogout) {
      onLogout();
    } else {
      window.location.href = "/";
    }
  };

  // ================= NAV BUTTONS =================
  const navButtons = [
    { id: "staffDashboard", label: "Dashboard", icon: LayoutDashboard, badge: 0 },
    { id: "staffReservation", label: "Reservations", icon: CalendarDays, badge: unreadCounts.reservations },
    { id: "staffUsers", label: "Users", icon: Users, badge: 0 },
    { id: "staffMessages", label: "Messages", icon: MessageSquare, badge: unreadCounts.messages },
    { id: "staffNotification", label: "Notifications", icon: Bell, badge: unreadCounts.notifications },
    { id: "staffProfile", label: "Profile", icon: User, badge: 0 },
  ];

  const handleNavClick = (viewId) => {
    setView(viewId);
    fetchUnreadCounts();
  };

  // ================= UI =================
  return (
    <>
      <aside className="fixed top-0 left-0 h-screen z-[99999]">
        <div className="w-[250px] bg-[#030303] h-full flex flex-col border-r border-gray-800">

          {/* Logo */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-[#0a0a0a]">
            <img src={Logo} alt="Logo" className="h-[40px] w-[40px]" />
            <h1 className="text-[15px] font-medium text-gray-200 leading-tight">
              University of San Agustin | CircuLink
            </h1>
          </div>

          {/* Navigation */}
          <div className="flex flex-col h-full overflow-y-auto bg-[#030303]">
            <div className="flex flex-col flex-grow">

              {navButtons.map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 transition-all duration-200 ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500"
                      : "text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm">{label}</span>

                  {badge > 0 && (
                    <span className="absolute right-4 text-xs font-bold h-5 min-w-5 px-1 rounded-full bg-red-500 text-white flex items-center justify-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </button>
              ))}

            </div>

            {/* Logout */}
            <div className="mt-auto border-t border-gray-800 bg-[#0a0a0a]">
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>

          </div>
        </div>
      </aside>

      <div className="w-[250px] flex-shrink-0"></div>
    </>
  );
}

export default StaffNavigation;