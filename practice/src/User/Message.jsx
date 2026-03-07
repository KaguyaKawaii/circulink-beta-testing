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

// Message Bubble Component - Facebook Messenger Style
const MessageBubble = ({ message, isOwn, isUnread, activeTab, user }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar for other users */}
        {!isOwn && (
          <div className="flex-shrink-0 mr-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {message.senderName?.charAt(0) || 'U'}
            </div>
          </div>
        )}
        
        <div className="flex flex-col">
          {/* Sender name for group chats */}
          {!isOwn && (
            <span className="text-xs text-gray-500 ml-1 mb-1">{message.senderName}</span>
          )}
          
          <div className={`relative group ${isOwn ? 'mr-0' : 'ml-0'}`}>
            {/* Message bubble */}
            <div className={`
              px-3 py-2 rounded-2xl break-words whitespace-pre-wrap
              ${isOwn 
                ? 'bg-[#0084ff] text-white rounded-br-none' 
                : 'bg-[#f0f2f5] text-gray-800 rounded-bl-none'
              }
              ${isUnread && !isOwn ? 'ring-2 ring-[#0084ff] ring-opacity-50' : ''}
              shadow-sm
            `}>
              <div className="text-[15px] leading-relaxed">{message.content}</div>
              
              {/* Message footer with time and status */}
              <div className={`flex items-center justify-end mt-1 space-x-1 text-[11px] ${
                isOwn ? 'text-[#e6f3ff]' : 'text-gray-500'
              }`}>
                <span>{formatTime(message.createdAt)}</span>
                
                {/* Read receipts for own messages */}
                {isOwn && (
                  <span className="flex items-center">
                    {message.status === "sending" ? (
                      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2" />
                      </svg>
                    ) : message.status === "failed" ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                )}
              </div>
            </div>
            
            {/* New message indicator */}
            {isUnread && !isOwn && (
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#0084ff] rounded-full border-2 border-white"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Date Separator
const DateSeparator = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-[#e4e6eb] text-gray-500 text-[11px] font-medium px-3 py-1 rounded-full">
        {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : formatDate(date)}
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0084ff] border-t-transparent mx-auto mb-3"></div>
      <p className="text-gray-500 text-sm">Loading messages...</p>
    </div>
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center text-gray-400">
      <div className="text-5xl mb-3">💬</div>
      <h3 className="text-base font-semibold mb-1 text-gray-600">No messages yet</h3>
      <p className="text-sm text-gray-400">Start a conversation below</p>
    </div>
  </div>
);

// Conversation Item Component for Sidebar
const ConversationItem = ({ 
  type, 
  title, 
  subtitle, 
  active, 
  unreadCount, 
  onClick,
  icon
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200
        ${active 
          ? 'bg-[#e7f3ff]' 
          : 'hover:bg-gray-100'
        }
      `}
    >
      {/* Avatar */}
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
        ${type === 'floor' 
          ? 'bg-gradient-to-br from-[#00a884] to-[#0084ff]' 
          : 'bg-gradient-to-br from-[#833ab4] to-[#fd1d1d]'
        }
      `}>
        {icon || (
          <span className="text-white font-semibold text-lg">
            {type === 'floor' ? 'F' : 'A'}
          </span>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-sm truncate ${active ? 'text-[#0084ff]' : 'text-gray-800'}`}>
            {title}
          </h3>
          {unreadCount > 0 && (
            <span className="bg-[#0084ff] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 ml-2">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
      </div>
    </button>
  );
};

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const messagesEndRef = useRef(null);
  const messageSound = useRef(new Audio("/ringtone_message.wav"));
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const sidebarRef = useRef(null);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try { messageSound.current.volume = 0.5; } catch (e) {}
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
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
      console.error("Failed to fetch unread messages:", error);
    }
  };

  const markMessagesAsReadOnReply = async () => {
    try {
      let receiver = activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "admin";
      
      await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/mark-read-on-reply`, {
        userId: user._id,
        receiver: receiver,
        conversationType: activeTab
      });
      
      setUnreadMessageIds(new Set());
      await fetchAllUnreadCounts();
      await fetchUnreadMessages();
    } catch (error) {
      console.warn("Failed to mark messages as read:", error.message);
    }
  };

  const markConversationAsRead = async () => {
    try {
      let receiver = activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "admin";
      
      await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/mark-conversation-read`, {
        userId: user._id,
        receiver: receiver,
        conversationType: activeTab
      });
      
      setUnreadMessageIds(new Set());
      await fetchAllUnreadCounts();
      await fetchUnreadMessages();
    } catch (error) {
      console.warn("Failed to mark conversation as read:", error.message);
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
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setMessages([]);
    fetchMessages();
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header - Messenger Style */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center shadow-sm">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-800">Messages</h1>
              <p className="text-xs text-gray-500">
                {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'Admin Support'}
              </p>
            </div>
          </div>
          
          {/* Online status indicator */}
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-xs text-gray-500">Online</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Messenger Style */}
        <aside
          ref={sidebarRef}
          className={`
            ${isMobile 
              ? `fixed inset-0 z-30 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
              : 'w-[360px] border-r border-gray-200'
            }
            bg-white flex flex-col h-full
          `}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
            <p className="text-xs text-gray-500 mt-1">Recent conversations</p>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto py-2">
            {/* Floors Section */}
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Floors
              </h3>
              {FLOORS.map(floor => (
                <ConversationItem
                  key={floor}
                  type="floor"
                  title={floor}
                  subtitle="Floor Receptionist"
                  active={activeTab === MESSAGE_TYPES.FLOOR && selectedFloor === floor}
                  unreadCount={floorUnreadCounts[floor] || 0}
                  onClick={() => {
                    handleTabChange(MESSAGE_TYPES.FLOOR);
                    handleFloorSelect(floor);
                  }}
                  icon={
                    <span className="text-white font-semibold text-lg">
                      {floor.charAt(0)}
                    </span>
                  }
                />
              ))}
            </div>

            {/* Admin Section */}
            <div className="px-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Support
              </h3>
              <ConversationItem
                type="admin"
                title="Administration"
                subtitle="System Admin & Support"
                active={activeTab === MESSAGE_TYPES.ADMIN}
                unreadCount={unreadCounts.admin}
                onClick={() => handleTabChange(MESSAGE_TYPES.ADMIN)}
                icon={
                  <span className="text-white font-semibold text-lg">A</span>
                }
              />
            </div>
          </div>

          {/* Sidebar Footer - User Info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#0084ff] flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-800 truncate">{user?.name}</h3>
                <p className="text-xs text-gray-500 truncate">{user?.floor}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Chat Area - Messenger Style */}
        <div className="flex-1 flex flex-col bg-[#f0f2f5]">
          {/* Chat Header */}
          <div className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#0084ff] flex items-center justify-center text-white font-semibold">
                  {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor.charAt(0) : 'A'}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">
                    {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'Administration'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {activeTab === MESSAGE_TYPES.FLOOR ? 'Floor Receptionist' : 'Typically replies instantly'}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={markConversationAsRead}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Mark as read"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e0 #f1f5f9'
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                width: 6px;
              }
              div::-webkit-scrollbar-track {
                background: #f1f5f9;
              }
              div::-webkit-scrollbar-thumb {
                background: #cbd5e0;
                border-radius: 3px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
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
                    
                    {/* Messages for this date */}
                    <div className="space-y-1">
                      {dateMessages.map(msg => (
                        <MessageBubble
                          key={msg._id}
                          message={msg}
                          isOwn={msg.sender === user._id}
                          isUnread={isMessageUnread(msg._id)}
                          activeTab={activeTab}
                          user={user}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input - Messenger Style */}
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end space-x-2">
                {/* Attachment button */}
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
                  <svg className="w-6 h-6 text-[#0084ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                {/* Text input */}
                <div className="flex-1 bg-[#f0f2f5] rounded-2xl px-4 py-2">
                  <textarea
                    ref={textareaRef}
                    placeholder={`Message ${activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'Admin'}...`}
                    className="w-full bg-transparent border-0 focus:outline-none resize-none text-sm max-h-[100px]"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    rows={1}
                    style={{ minHeight: '20px' }}
                  />
                </div>
                
                {/* Send button */}
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`
                    p-2 rounded-full transition-colors flex-shrink-0
                    ${newMessage.trim() 
                      ? 'text-[#0084ff] hover:bg-[#e7f3ff]' 
                      : 'text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Prop Validation
Message.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    floor: PropTypes.string.isRequired
  }).isRequired,
  setView: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired
};

export default Message;