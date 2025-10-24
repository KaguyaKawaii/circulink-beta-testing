import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function Message({ user, setView, currentView }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("Ground Floor");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("floor");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({
    floor: 0,
    admin: 0
  });
  const [floorUnreadCounts, setFloorUnreadCounts] = useState({});
  const [unreadMessageIds, setUnreadMessageIds] = useState(new Set());

  const floors = [
    "Ground Floor",
    "Second Floor",
    "Fourth Floor",
    "Fifth Floor"
  ];

  const messagesEndRef = useRef(null);
  const messageSound = useRef(new Audio("/ringtone_message.wav"));

  useEffect(() => {
    try { messageSound.current.volume = 0.75; } catch (e) {}
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchAllUnreadCounts = async () => {
    if (!user?._id) return;

    try {
      const floorCounts = {};
      
      for (const floor of floors) {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/messages/unread-count/${user._id}/${floor}`
          );
          floorCounts[floor] = response.data.count || 0;
        } catch (err) {
          console.error(`Failed to fetch unread count for ${floor}:`, err);
          floorCounts[floor] = 0;
        }
      }

      setFloorUnreadCounts(floorCounts);

      const totalFloorUnread = Object.values(floorCounts).reduce((sum, count) => sum + count, 0);
      
      const adminResponse = await axios.get(
        `http://localhost:5000/api/messages/unread-count/${user._id}/admin`
      );

      setUnreadCounts({
        floor: totalFloorUnread,
        admin: adminResponse.data.count || 0
      });
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
      setUnreadCounts({ floor: 0, admin: 0 });
      
      const initialCounts = {};
      floors.forEach(floor => {
        initialCounts[floor] = 0;
      });
      setFloorUnreadCounts(initialCounts);
    }
  };

  const fetchUnreadMessages = async () => {
    if (!user?._id) return;
    
    try {
      const response = await axios.get(
        `http://localhost:5000/api/messages/unread-messages/${user._id}`
      );
      
      if (response.data.success) {
        const unreadIds = response.data.unreadMessages.map(msg => msg._id);
        setUnreadMessageIds(new Set(unreadIds));
      }
    } catch (error) {
      console.error("Failed to fetch unread messages from cloud:", error);
    }
  };

  const markMessagesAsReadOnReply = async () => {
    try {
      let receiver = activeTab === "floor" ? selectedFloor : "admin";
      
      const response = await axios.post("http://localhost:5000/api/messages/mark-read-on-reply", {
        userId: user._id,
        receiver: receiver,
        conversationType: activeTab
      });
      
      if (response.data.success) {
        setUnreadMessageIds(new Set());
        await fetchAllUnreadCounts();
        await fetchUnreadMessages();
      }
    } catch (error) {
      console.warn("Failed to mark messages as read in cloud:", error.message);
    }
  };

  const markConversationAsRead = async () => {
    try {
      let receiver = activeTab === "floor" ? selectedFloor : "admin";
      
      const response = await axios.post("http://localhost:5000/api/messages/mark-conversation-read", {
        userId: user._id,
        receiver: receiver,
        conversationType: activeTab
      });
      
      if (response.data.success) {
        setUnreadMessageIds(new Set());
        await fetchAllUnreadCounts();
        await fetchUnreadMessages();
      }
    } catch (error) {
      console.warn("Failed to mark conversation as read in cloud:", error.message);
    }
  };

  useEffect(() => {
    if (!user?._id) return;

    socket.emit("join", { userId: user._id });
    socket.emit("join", { userId: user.floor });
    socket.emit("join", { userId: "admin" });

    fetchAllUnreadCounts();
    fetchUnreadMessages();
    
    if (activeTab === "floor") {
      fetchMessages();
    } else {
      fetchAdminMessages();
    }

    const handleNewMessage = (msg) => {
      console.log("📨 New message received in User Messages:", msg);
      
      setMessages(prev => {
        const filtered = prev.filter(m =>
          !(m.status === "sending" &&
            m.content === msg.content &&
            m.sender === msg.sender)
        );
        const exists = filtered.find(m => m._id === msg._id);
        if (exists) return filtered;
        
        if (activeTab === "floor") {
          const isRelevant =
            (msg.receiver === user._id && msg.floor === selectedFloor) ||
            (msg.sender === user._id && msg.receiver === selectedFloor) ||
            (msg.floor === selectedFloor && msg.sender !== user._id) ||
            (msg.floor === selectedFloor && msg.receiver === user._id);

          if (isRelevant) {
            if (msg.sender !== user._id) {
              try {
                messageSound.current.currentTime = 0;
                messageSound.current.play().catch(() => {});
                
                setUnreadMessageIds(prev => {
                  const newUnreads = new Set(prev);
                  newUnreads.add(msg._id);
                  return newUnreads;
                });
                
                if (msg.floor === selectedFloor) {
                  setFloorUnreadCounts(prev => ({
                    ...prev,
                    [msg.floor]: (prev[msg.floor] || 0) + 1
                  }));
                  
                  setUnreadCounts(prev => ({
                    ...prev,
                    floor: prev.floor + 1
                  }));
                }
              } catch (e) {}
            }
            console.log("✅ Adding new floor message:", msg);
            return [...filtered, msg];
          }
        } else if (activeTab === "admin") {
          const isRelevant =
            (msg.sender === user._id && msg.receiver === "admin") ||
            (msg.sender === "admin" && msg.receiver === user._id) ||
            (msg.receiver === user._id && msg.sender === "admin");

          if (isRelevant) {
            if (msg.sender !== user._id) {
              try {
                messageSound.current.currentTime = 0;
                messageSound.current.play().catch(() => {});
                
                setUnreadMessageIds(prev => {
                  const newUnreads = new Set(prev);
                  newUnreads.add(msg._id);
                  return newUnreads;
                });
                
                setUnreadCounts(prev => ({
                  ...prev,
                  admin: prev.admin + 1
                }));
              } catch (e) {}
            }
            console.log("✅ Adding new admin message:", msg);
            return [...filtered, msg];
          }
        }
        return filtered;
      });
    };

    const handleUnreadCountUpdate = (data) => {
      if (data.userId === user._id) {
        fetchAllUnreadCounts();
        fetchUnreadMessages();
      }
    };

    const handleRefreshUnreadCounts = (data) => {
      if (data.userId === user._id) {
        fetchAllUnreadCounts();
        fetchUnreadMessages();
      }
    };

    const handleMessageSent = (msg) => {
      console.log("✅ Message sent confirmation:", msg);
      setMessages(prev => prev.map(m => 
        m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    socket.on("refresh-unread-counts", handleRefreshUnreadCounts);
    socket.on("messageSent", handleMessageSent);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
      socket.off("refresh-unread-counts", handleRefreshUnreadCounts);
      socket.off("messageSent", handleMessageSent);
    };
  }, [user, selectedFloor, activeTab]);

  useEffect(() => {
    if (user?._id) {
      fetchAllUnreadCounts();
      fetchUnreadMessages();
    }
  }, [activeTab, selectedFloor, user?._id]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `http://localhost:5000/api/messages/floor-conversation/${user._id}/${selectedFloor}`
      );
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `http://localhost:5000/api/messages/user-admin-conversation/${user._id}`
      );
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch admin messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    let tempMsg;
    let receiver = activeTab === "floor" ? selectedFloor : "admin";
    
    tempMsg = {
      _id: "temp-" + Date.now(),
      sender: user._id,
      receiver: receiver,
      content: newMessage,
      createdAt: new Date().toISOString(),
      status: "sending",
      senderName: user.name,
      floor: activeTab === "floor" ? selectedFloor : undefined
    };

    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");

    try {
      await markMessagesAsReadOnReply();
      
      if (activeTab === "floor") {
        await axios.post("http://localhost:5000/api/messages/send-to-floor", {
          userId: user._id,
          floor: selectedFloor,
          content: newMessage
        });
      } else {
        await axios.post("http://localhost:5000/api/messages/send-to-admin", {
          userId: user._id,
          content: newMessage
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages(prev => prev.map(msg => 
        msg._id === tempMsg._id ? { ...msg, status: "failed" } : msg
      ));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso) => {
    const date = new Date(iso);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isToday = (iso) => {
    const date = new Date(iso);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isYesterday = (iso) => {
    const date = new Date(iso);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMessages([]);
    if (tab === "floor") {
      fetchMessages();
    } else {
      fetchAdminMessages();
    }
    setIsSidebarOpen(false);
  };

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setMessages([]);
    fetchMessages();
    setIsSidebarOpen(false);
  };

  const getCurrentUnreadCount = () => {
    if (activeTab === "floor") {
      return floorUnreadCounts[selectedFloor] || 0;
    } else {
      return unreadCounts.admin;
    }
  };

  const isMessageUnread = (messageId) => {
    return unreadMessageIds.has(messageId);
  };

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <main className="ml-0 lg:ml-[250px] w-full lg:w-[calc(100%-250px)] h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 relative z-40">      {/* HEADER */}
<header className="text-black px-4 lg:px-6 h-16 lg:h-[60px] flex items-center justify-between shadow-sm lg:shadow-lg border-b border-gray-200 bg-white relative z-50">        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl lg:text-2xl font-bold tracking-wide bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Messages
          </h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-40">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Mobile & Desktop */}
 <aside className={`
          fixed lg:static top-0 left-0 h-full w-80 bg-white border-r border-gray-200 shadow-sm z-60 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Message Options</h2>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-lg text-gray-800 hidden lg:block">Message Options</h2>
            <p className="text-sm text-gray-600 mt-1 hidden lg:block">Choose who to message</p>
          </div>
          
          {/* Tab Buttons */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => handleTabChange("floor")}
                className={`p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] cursor-pointer border-2 ${
                  activeTab === "floor" 
                    ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-lg scale-[1.02]" 
                    : "hover:bg-gray-50 border-transparent hover:border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 transition-colors ${
                      activeTab === "floor" ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gray-400"
                    }`}></div>
                    <div>
                      <div className="font-semibold text-gray-800">Floors</div>
                      <div className="text-sm text-gray-500 mt-1">Message floor staff</div>
                    </div>
                  </div>
                  {unreadCounts.floor > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                      {unreadCounts.floor > 9 ? "9+" : unreadCounts.floor}
                    </span>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange("admin")}
                className={`p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] cursor-pointer border-2 ${
                  activeTab === "admin" 
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-lg scale-[1.02]" 
                    : "hover:bg-gray-50 border-transparent hover:border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 transition-colors ${
                      activeTab === "admin" ? "bg-gradient-to-r from-blue-500 to-cyan-500" : "bg-gray-400"
                    }`}></div>
                    <div>
                      <div className="font-semibold text-gray-800">Administration</div>
                      <div className="text-sm text-gray-500 mt-1">Contact admin</div>
                    </div>
                  </div>
                  {unreadCounts.admin > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                      {unreadCounts.admin > 9 ? "9+" : unreadCounts.admin}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Floor Selection (only show for floor tab) */}
          {activeTab === "floor" && (
            <div className="p-4 flex-1">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Select Floor
              </h3>
              <div className="space-y-2">
                {floors.map(floor => (
                  <button
                    key={floor}
                    onClick={() => handleFloorSelect(floor)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-300 transform hover:scale-[1.01] cursor-pointer group ${
                      selectedFloor === floor 
                        ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-xl scale-[1.02]" 
                        : "hover:bg-gray-50 bg-white border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {selectedFloor === floor && (
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        <div>
                          <div className="font-medium text-left">{floor}</div>
                          <div className={`text-sm mt-1 transition-colors text-left ${
                            selectedFloor === floor ? "text-red-100" : "text-gray-500 group-hover:text-gray-700"
                          }`}>
                            {floor} Support Team
                          </div>
                        </div>
                      </div>
                      {floorUnreadCounts[floor] > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center min-w-[24px] ml-2">
                          {floorUnreadCounts[floor] > 9 ? "9+" : floorUnreadCounts[floor]}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin Info (only show for admin tab) */}
          {activeTab === "admin" && (
            <div className="p-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mr-3 shadow-sm"></div>
                  <span className="font-bold text-blue-800">Admin Support</span>
                </div>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Contact the administration for account issues, complaints, or general inquiries.
                  We're here to help you!
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative z-40">
          {/* Chat Header */}
          <div className="bg-white p-4 lg:p-6 border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  activeTab === "floor" ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-blue-500 to-cyan-500"
                }`}></div>
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-gray-800">
                    {activeTab === "floor" ? selectedFloor : "Administration Team"}
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-600 mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {activeTab === "floor" 
                      ? `${selectedFloor} maintenance and support team` 
                      : "System administrators and support staff"
                    }
                  </p>
                </div>
              </div>
              {getCurrentUnreadCount() > 0 && (
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  {getCurrentUnreadCount()} unread message{getCurrentUnreadCount() !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gradient-to-b from-white to-gray-50">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center text-gray-500 max-w-sm">
                  <div className="text-6xl mb-4 opacity-60">💬</div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">No messages yet</h3>
                  <p className="text-gray-600 mb-4">Start a conversation by sending a message below!</p>
                  <div className="w-16 h-1 bg-gradient-to-r from-gray-300 to-transparent rounded-full mx-auto"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-full mx-auto">
                {Object.entries(messageGroups).map(([date, dateMessages]) => (
                  <div key={date}>
                    {/* Date Separator */}
                    <div className="flex items-center justify-center my-6">
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : formatDate(date)}
                      </div>
                    </div>
                    
                    {/* Messages for this date */}
                    <div className="space-y-4">
                      {dateMessages.map(msg => (
                        <div key={msg._id} className={`flex ${msg.sender === user._id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl p-4 shadow-sm transition-all duration-300 hover:shadow-md relative ${
                            msg.sender === user._id 
                              ? activeTab === "floor" 
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-br-none' 
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-none'
                              : 'bg-white border border-gray-200 rounded-bl-none shadow-sm'
                          }`}>
                            {/* NEW BADGE for unread messages */}
                            {isMessageUnread(msg._id) && msg.sender !== user._id && (
                              <div className="absolute -top-2 -left-2 z-10">
                                <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center animate-pulse">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                  </svg>
                                  NEW
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold">
                                {msg.sender === user._id ? 'You' : msg.senderName}
                              </div>
                              {msg.status === "sending" && (
                                <div className="text-xs opacity-80 flex items-center">
                                  <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2" />
                                  </svg>
                                  Sending...
                                </div>
                              )}
                              {msg.status === "failed" && (
                                <div className="text-xs opacity-80 text-red-200 flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Failed
                                </div>
                              )}
                            </div>
                            <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</div>
                            <div className={`text-xs mt-2 text-right flex items-center justify-end ${
                              msg.sender === user._id 
                                ? activeTab === "floor" ? 'text-red-100' : 'text-blue-100'
                                : 'text-gray-500'
                            }`}>
                              {formatTime(msg.createdAt)}
                              {msg.sender === user._id && (
                                <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="bg-white p-4 lg:p-6 border-t border-gray-200 shadow-lg">
            <div className="max-w-full mx-auto">
              <div className="flex space-x-3">
                <textarea
                  placeholder={
                    activeTab === "floor" 
                      ? `Send a Message` 
                      : "Send a Message"
                  }
                  className="flex-1 border-2 border-gray-200 rounded-2xl px-4 lg:px-6 py-3 focus:outline-none focus:border-red-500 transition-colors duration-300 shadow-sm bg-gray-50 focus:bg-white resize-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={1}
                  style={{ minHeight: '50px', maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`text-white rounded-full p-3 lg:px-8 lg:py-3 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center ${
                    activeTab === "floor" 
                      ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600" 
                      : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  }`}
                >
                  <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden lg:inline ml-2">Send</span>
                </button>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Message;