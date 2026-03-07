import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import PropTypes from 'prop-types';

// Constants
const MESSAGE_TYPES = {
  FLOOR: "floor",
  ADMIN: "admin"
};

const FLOORS = [
  "Ground Floor",
  "Second Floor",
  "Fourth Floor",
  "Fifth Floor"
];

const SOCKET_EVENTS = {
  NEW_MESSAGE: "newMessage",
  UNREAD_UPDATE: "unreadCountUpdate",
  REFRESH_UNREAD: "refresh-unread-counts",
  MESSAGE_SENT: "messageSent"
};

const socket = io(`${import.meta.env.VITE_API_URL}`);

// Utility Functions
const formatTime = (iso) => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper functions
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

// Extracted UI Components
const MessageBubble = ({ message, isOwn, isUnread, activeTab, user, formatTime }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 animate-in fade-in duration-300`}>
      <div 
        className={`relative max-w-[75%] lg:max-w-[65%] rounded-2xl px-4 py-2 shadow-sm ${
          isOwn 
            ? activeTab === MESSAGE_TYPES.FLOOR 
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-br-none' 
              : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-none'
            : 'bg-white border border-gray-200 rounded-bl-none'
        }`}
      >
        {/* Sender name for received messages */}
        {!isOwn && (
          <div className="text-xs font-semibold mb-1 text-gray-600">
            {message.senderName}
          </div>
        )}
        
        {/* Message content */}
        <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
        </div>
        
        {/* Message footer with time and status */}
        <div className={`flex items-center justify-end space-x-1 mt-1 ${
          isOwn ? 'text-white/70' : 'text-gray-400'
        }`}>
          <span className="text-[10px]">{formatTime(message.createdAt)}</span>
          
          {/* Read receipt for own messages */}
          {isOwn && (
            <svg 
              className={`w-3 h-3 ${message.read ? 'text-blue-300' : 'text-white/50'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          )}
        </div>

        {/* New message indicator */}
        {isUnread && !isOwn && (
          <div className="absolute -top-1 -left-1">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const DateSeparator = ({ date }) => {
  const getDateText = () => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return formatDate(date);
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-100 text-gray-500 text-[10px] font-medium px-3 py-1 rounded-full">
        {getDateText()}
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent mx-auto mb-3"></div>
      <p className="text-sm text-gray-500">Loading messages...</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center text-gray-400">
      <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p className="text-sm">No messages yet</p>
      <p className="text-xs mt-1 opacity-70">Start a conversation</p>
    </div>
  </div>
);

function Message({ user, setView, currentView }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("Ground Floor");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(MESSAGE_TYPES.FLOOR);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({
    floor: 0,
    admin: 0
  });
  const [floorUnreadCounts, setFloorUnreadCounts] = useState({});
  const [unreadMessageIds, setUnreadMessageIds] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const messagesEndRef = useRef(null);
  const messageSound = useRef(new Audio("/ringtone_message.wav"));
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const sidebarRef = useRef(null);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try { messageSound.current.volume = 0.75; } catch (e) {}
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }, 100);
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [newMessage]);

  // Memoized calculations
  const getCurrentUnreadCount = useCallback(() => {
    if (activeTab === MESSAGE_TYPES.FLOOR) {
      return floorUnreadCounts[selectedFloor] || 0;
    } else {
      return unreadCounts.admin;
    }
  }, [activeTab, selectedFloor, floorUnreadCounts, unreadCounts]);

  const isMessageUnread = useCallback((messageId) => {
    return unreadMessageIds.has(messageId);
  }, [unreadMessageIds]);

  const groupMessagesByDate = useCallback(() => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  }, [messages]);

  const messageGroups = useMemo(() => groupMessagesByDate(), [groupMessagesByDate]);

  // API Functions
  const fetchAllUnreadCounts = async () => {
    if (!user?._id) return;

    try {
      const floorCounts = {};
      
      for (const floor of FLOORS) {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/messages/unread-count/${user._id}/${floor}`
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
        `${import.meta.env.VITE_API_URL}/api/messages/unread-count/${user._id}/admin`
      );

      setUnreadCounts({
        floor: totalFloorUnread,
        admin: adminResponse.data.count || 0
      });
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
      setUnreadCounts({ floor: 0, admin: 0 });
      
      const initialCounts = {};
      FLOORS.forEach(floor => {
        initialCounts[floor] = 0;
      });
      setFloorUnreadCounts(initialCounts);
    }
  };

  const fetchUnreadMessages = async () => {
    if (!user?._id) return;
    
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/unread-messages/${user._id}`
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
      let receiver = activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "admin";
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/mark-read-on-reply`, {
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
      let receiver = activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "admin";
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/mark-conversation-read`, {
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

  // Socket and Data Fetching
  useEffect(() => {
    if (!user?._id) return;

    let isMounted = true;

    socket.emit("join", { userId: user._id });
    socket.emit("join", { userId: user.floor });
    socket.emit("join", { userId: "admin" });

    const initializeData = async () => {
      if (!isMounted) return;
      
      await fetchAllUnreadCounts();
      await fetchUnreadMessages();
      
      if (activeTab === MESSAGE_TYPES.FLOOR) {
        await fetchMessages();
      } else {
        await fetchAdminMessages();
      }
    };

    initializeData();

    const handleNewMessage = (msg) => {
      if (!isMounted) return;
      
      console.log("📨 New message received in User Messages:", msg);
      
      setMessages(prev => {
        const filtered = prev.filter(m =>
          !(m.status === "sending" &&
            m.content === msg.content &&
            m.sender === msg.sender)
        );
        const exists = filtered.find(m => m._id === msg._id);
        if (exists) return filtered;
        
        if (activeTab === MESSAGE_TYPES.FLOOR) {
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
            return [...filtered, msg];
          }
        } else if (activeTab === MESSAGE_TYPES.ADMIN) {
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
            return [...filtered, msg];
          }
        }
        return filtered;
      });
    };

    const handleUnreadCountUpdate = (data) => {
      if (isMounted && data.userId === user._id) {
        fetchAllUnreadCounts();
        fetchUnreadMessages();
      }
    };

    const handleRefreshUnreadCounts = (data) => {
      if (isMounted && data.userId === user._id) {
        fetchAllUnreadCounts();
        fetchUnreadMessages();
      }
    };

    const handleMessageSent = (msg) => {
      if (!isMounted) return;
      
      console.log("✅ Message sent confirmation:", msg);
      setMessages(prev => prev.map(m => 
        m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
    };

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(SOCKET_EVENTS.UNREAD_UPDATE, handleUnreadCountUpdate);
    socket.on(SOCKET_EVENTS.REFRESH_UNREAD, handleRefreshUnreadCounts);
    socket.on(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);

    return () => {
      isMounted = false;
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.UNREAD_UPDATE, handleUnreadCountUpdate);
      socket.off(SOCKET_EVENTS.REFRESH_UNREAD, handleRefreshUnreadCounts);
      socket.off(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);
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
        `${import.meta.env.VITE_API_URL}/api/messages/floor-conversation/${user._id}/${selectedFloor}`
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
        `${import.meta.env.VITE_API_URL}/api/messages/user-admin-conversation/${user._id}`
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
    let receiver = activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "admin";
    
    tempMsg = {
      _id: "temp-" + Date.now(),
      sender: user._id,
      receiver: receiver,
      content: newMessage,
      createdAt: new Date().toISOString(),
      status: "sending",
      senderName: user.name,
      floor: activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : undefined
    };

    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");

    try {
      await markMessagesAsReadOnReply();
      
      if (activeTab === MESSAGE_TYPES.FLOOR) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send-to-floor`, {
          userId: user._id,
          floor: selectedFloor,
          content: newMessage
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send-to-admin`, {
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMessages([]);
    if (tab === MESSAGE_TYPES.FLOOR) {
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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // Handle click outside sidebar on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobile && isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target) && 
          !e.target.closest('[data-hamburger]')) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobile, isSidebarOpen]);

  // Handle click on hamburger button
  const handleHamburgerClick = (e) => {
    e.stopPropagation();
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <main 
      className="ml-0 lg:ml-[250px] w-full lg:w-[calc(100%-250px)] h-screen flex flex-col bg-white relative overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Messages Container */}
      <div className="flex flex-1 overflow-hidden relative h-full">
        {/* Mobile Sidebar Overlay - No blur */}
        {isSidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Messenger Style */}
        <aside 
          ref={sidebarRef}
          className={`fixed lg:static top-16 left-0 h-[calc(100vh-64px)] w-[300px] bg-white border-r border-gray-200 z-[70] flex flex-col transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <h2 className="font-bold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chats
            </h2>
          </div>
          
          {/* Tab Buttons */}
          <div className="p-3 border-b border-gray-100">
            <div className="space-y-2">
              <button
                onClick={() => handleTabChange(MESSAGE_TYPES.FLOOR)}
                className={`w-full p-3 rounded-xl text-left transition-all duration-200 flex items-center justify-between ${
                  activeTab === MESSAGE_TYPES.FLOOR 
                    ? "bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500" 
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 mr-3"></div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">Floors</div>
                    <div className="text-xs text-gray-500">Message Receptionist</div>
                  </div>
                </div>
                {unreadCounts.floor > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCounts.floor > 9 ? "9+" : unreadCounts.floor}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => handleTabChange(MESSAGE_TYPES.ADMIN)}
                className={`w-full p-3 rounded-xl text-left transition-all duration-200 flex items-center justify-between ${
                  activeTab === MESSAGE_TYPES.ADMIN 
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500" 
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 mr-3"></div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">Administration</div>
                    <div className="text-xs text-gray-500">Contact admin</div>
                  </div>
                </div>
                {unreadCounts.admin > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCounts.admin > 9 ? "9+" : unreadCounts.admin}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Floor Selection */}
          {activeTab === MESSAGE_TYPES.FLOOR && (
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">Floors</h3>
              </div>
              {FLOORS.map(floor => (
                <button
                  key={floor}
                  onClick={() => handleFloorSelect(floor)}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    selectedFloor === floor ? 'bg-gradient-to-r from-red-50 to-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-1.5 h-1.5 rounded-full mr-3 ${
                      selectedFloor === floor ? 'bg-red-500' : 'bg-gray-300'
                    }`}></div>
                    <span className={`text-sm ${selectedFloor === floor ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {floor}
                    </span>
                  </div>
                  {floorUnreadCounts[floor] > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {floorUnreadCounts[floor] > 9 ? "9+" : floorUnreadCounts[floor]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Admin Info */}
          {activeTab === MESSAGE_TYPES.ADMIN && (
            <div className="p-4">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-700 leading-relaxed">
                  Contact the administration for account issues, complaints, or general inquiries.
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative h-full">
          {/* Chat Header */}
          <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center">
            <button 
              onClick={handleHamburgerClick}
              data-hamburger="true"
              className="lg:hidden p-2 mr-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800 text-base">
                {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "Administration"}
              </h2>
              <p className="text-xs text-gray-500">
                {activeTab === MESSAGE_TYPES.FLOOR ? 'Receptionist' : 'Support Team'}
              </p>
            </div>
            {getCurrentUnreadCount() > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {getCurrentUnreadCount()}
              </span>
            )}
          </div>

          {/* Messages Container - Fixed height accounting for navigation */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50"
            style={{ 
              height: isMobile ? 'calc(100vh - 180px)' : 'calc(100vh - 120px)',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style>{`
              div[ref="messagesContainerRef"]::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {loading ? (
              <LoadingSkeleton />
            ) : messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="max-w-3xl mx-auto">
                {Object.entries(messageGroups).map(([date, dateMessages]) => (
                  <div key={date}>
                    <DateSeparator date={date} />
                    <div className="space-y-1">
                      {dateMessages.map(msg => (
                        <MessageBubble
                          key={msg._id}
                          message={msg}
                          isOwn={msg.sender === user._id}
                          isUnread={isMessageUnread(msg._id)}
                          activeTab={activeTab}
                          user={user}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}
          </div>

          {/* Message Input - Fixed at bottom */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <div className="flex items-end space-x-2 max-w-3xl mx-auto">
              <textarea
                ref={textareaRef}
                placeholder="Type a message..."
                className="flex-1 border-0 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-gray-100 resize-none text-sm"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
                style={{ 
                  minHeight: '40px',
                  maxHeight: '100px',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className={`p-2 rounded-full flex-shrink-0 transition-colors ${
                  activeTab === MESSAGE_TYPES.FLOOR 
                    ? 'text-red-500 hover:bg-red-50 disabled:text-red-300' 
                    : 'text-blue-500 hover:bg-blue-50 disabled:text-blue-300'
                } disabled:cursor-not-allowed`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Prop Validation
Message.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    floor: PropTypes.string.isRequired,
    profilePicture: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string
  }).isRequired,
  setView: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired
};

export default Message;