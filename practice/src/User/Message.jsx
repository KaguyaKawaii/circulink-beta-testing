// Message.jsx
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
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

// Message Bubble Component
const MessageBubble = ({ message, isOwn, isUnread, formatTime }) => {
  const [showTime, setShowTime] = useState(false);

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      <div className={`relative group max-w-[70%] md:max-w-[60%]`}>
        {/* Avatar for other users */}
        {!isOwn && (
          <div className="absolute -left-8 bottom-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {message.senderName?.charAt(0) || 'U'}
          </div>
        )}
        
        {/* Message Bubble */}
        <div className={`
          relative px-4 py-2.5 break-words
          ${isOwn 
            ? 'bg-[#0084ff] text-white rounded-2xl rounded-br-sm' 
            : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-sm'
          }
          shadow-sm hover:shadow-md transition-shadow duration-200
        `}>
          {/* Sender Name for group messages */}
          {!isOwn && message.senderName !== 'Admin' && (
            <div className="text-xs font-semibold text-blue-600 mb-1">
              {message.senderName}
            </div>
          )}
          
          {/* Message Content */}
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
          
          {/* Message Footer */}
          <div className={`
            flex items-center justify-end gap-1 mt-1 text-[11px]
            ${isOwn ? 'text-blue-100' : 'text-gray-400'}
          `}>
            <span className={showTime ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}>
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>

        {/* Unread Indicator */}
        {isUnread && !isOwn && (
          <div className="absolute -top-1 -right-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Date Separator Component
const DateSeparator = ({ date }) => {
  let displayDate = '';
  if (isToday(date)) displayDate = 'Today';
  else if (isYesterday(date)) displayDate = 'Yesterday';
  else displayDate = formatDate(date);

  return (
    <div className="flex items-center justify-center my-6">
      <div className="bg-gray-100 text-gray-500 text-xs px-4 py-1.5 rounded-full font-medium shadow-sm">
        {displayDate}
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-4">
    <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#0084ff] border-t-transparent"></div>
    <p className="text-sm text-gray-500 font-medium">Loading messages...</p>
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full px-4">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-800 mb-2">No messages yet</h3>
    <p className="text-sm text-gray-500 text-center max-w-xs">
      Start a conversation by sending a message below. Your messages will appear here.
    </p>
  </div>
);

// Conversation List Item
const ConversationItem = ({ floor, isSelected, unreadCount, lastMessage, lastTime, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center px-4 py-3 transition-all duration-200
        hover:bg-gray-50 active:bg-gray-100
        ${isSelected ? 'bg-blue-50 border-l-4 border-[#0084ff]' : 'border-l-4 border-transparent'}
      `}
    >
      <div className="relative flex-shrink-0">
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center
          ${isSelected 
            ? 'bg-[#0084ff] text-white shadow-md' 
            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
          }
          transition-all duration-200
        `}>
          <span className="text-xl font-bold">
            {floor === 'Administration' ? 'A' : floor.charAt(0)}
          </span>
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5 border-2 border-white shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className={`
            font-semibold text-sm truncate
            ${isSelected ? 'text-[#0084ff]' : 'text-gray-800'}
          `}>
            {floor === 'Administration' ? 'Administration' : `${floor} Reception`}
          </h3>
          {lastTime && (
            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
              {lastTime}
            </span>
          )}
        </div>
        
        <p className="text-xs text-gray-500 truncate text-left">
          {lastMessage || (unreadCount > 0 
            ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` 
            : 'No new messages')}
        </p>
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
  const [unreadCounts, setUnreadCounts] = useState({
    floor: 0,
    admin: 0
  });
  const [floorUnreadCounts, setFloorUnreadCounts] = useState({});
  const [unreadMessageIds, setUnreadMessageIds] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileSidebar(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  // Typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', {
        userId: user._id,
        receiver: activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'admin',
        isTyping: true
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', {
        userId: user._id,
        receiver: activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'admin',
        isTyping: false
      });
    }, 1000);
  };

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

  const getLastMessageForFloor = useCallback((floor) => {
    // This would need to be implemented based on your data structure
    return null;
  }, []);

  const getLastMessageTimeForFloor = useCallback((floor) => {
    // This would need to be implemented based on your data structure
    return null;
  }, []);

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
      setUnreadCounts({ floor: 0, admin: 0 });
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
        
        if (activeTab === MESSAGE_TYPES.FLOOR) {
          const isRelevant = msg.floor === selectedFloor;
          if (isRelevant) {
            if (msg.sender !== user._id) {
              setUnreadMessageIds(prev => new Set([...prev, msg._id]));
              setFloorUnreadCounts(prev => ({
                ...prev,
                [msg.floor]: (prev[msg.floor] || 0) + 1
              }));
            }
            return [...filtered, msg];
          }
        } else if (activeTab === MESSAGE_TYPES.ADMIN) {
          const isRelevant = msg.sender === "admin" || msg.receiver === "admin";
          if (isRelevant) {
            if (msg.sender !== user._id) {
              setUnreadMessageIds(prev => new Set([...prev, msg._id]));
              setUnreadCounts(prev => ({
                ...prev,
                admin: prev.admin + 1
              }));
            }
            return [...filtered, msg];
          }
        }
        return filtered;
      });
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
    socket.on(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);
    socket.on("unreadCountUpdate", fetchAllUnreadCounts);

    return () => {
      isMounted = false;
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);
      socket.off("unreadCountUpdate", fetchAllUnreadCounts);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [user, selectedFloor, activeTab]);

  useEffect(() => {
    if (user?._id) {
      fetchAllUnreadCounts();
      fetchUnreadMessages();
    }
  }, [activeTab, selectedFloor]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/floor-conversation/${user._id}/${selectedFloor}`
      );
      setMessages(data);
      await markConversationAsRead();
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
      await markConversationAsRead();
    } catch (err) {
      console.error("Failed to fetch admin messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempMsg = {
      _id: "temp-" + Date.now(),
      sender: user._id,
      receiver: activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "admin",
      content: newMessage,
      createdAt: new Date().toISOString(),
      status: "sending",
      senderName: user.name,
      floor: activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : undefined
    };

    setMessages(prev => [...prev, tempMsg]);
    const messageToSend = newMessage;
    setNewMessage("");

    try {
      if (activeTab === MESSAGE_TYPES.FLOOR) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send-to-floor`, {
          userId: user._id,
          floor: selectedFloor,
          content: messageToSend
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send-to-admin`, {
          userId: user._id,
          content: messageToSend
        });
      }
    } catch (err) {
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

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
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
      setShowMobileSidebar(false);
    }
  };

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setMessages([]);
    fetchMessages();
    if (isMobile) {
      setShowMobileSidebar(false);
    }
  };

  return (
    <main className="relative w-full h-screen bg-gray-50">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-4 z-30 shadow-sm">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-semibold text-gray-800">Messages</h1>
          <div className="ml-auto flex items-center space-x-2">
            <div className="relative">
              {unreadCounts.floor + unreadCounts.admin > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-white">
                  {unreadCounts.floor + unreadCounts.admin > 9 ? '9+' : unreadCounts.floor + unreadCounts.admin}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full pt-16 lg:pt-0">
        {/* Sidebar Overlay for Mobile */}
        {isMobile && showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Conversations Sidebar */}
        <div className={`
          ${isMobile 
            ? `fixed inset-y-0 left-0 w-[85%] max-w-[320px] z-50 transform transition-transform duration-300 ease-in-out bg-white`
            : 'w-[380px] border-r border-gray-200 bg-white'
          } flex flex-col h-full shadow-xl lg:shadow-none
          ${isMobile && !showMobileSidebar ? '-translate-x-full' : 'translate-x-0'}
        `}>
          {/* Sidebar Header */}
          <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chats
            </h2>
            <p className="text-sm text-gray-600 mt-1">Select a conversation to start messaging</p>
          </div>

          {/* Tabs */}
          <div className="flex p-2 bg-gray-50 border-b border-gray-200">
            <button
              onClick={() => handleTabChange(MESSAGE_TYPES.FLOOR)}
              className={`
                flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200
                ${activeTab === MESSAGE_TYPES.FLOOR
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
                }
              `}
            >
              Floors
              {unreadCounts.floor > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                  {unreadCounts.floor}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange(MESSAGE_TYPES.ADMIN)}
              className={`
                flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ml-2
                ${activeTab === MESSAGE_TYPES.ADMIN
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
                }
              `}
            >
              Admin
              {unreadCounts.admin > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                  {unreadCounts.admin}
                </span>
              )}
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto py-2">
            {activeTab === MESSAGE_TYPES.FLOOR ? (
              FLOORS.map(floor => (
                <ConversationItem
                  key={floor}
                  floor={floor}
                  isSelected={selectedFloor === floor}
                  unreadCount={floorUnreadCounts[floor] || 0}
                  lastMessage={getLastMessageForFloor(floor)}
                  lastTime={getLastMessageTimeForFloor(floor)}
                  onClick={() => handleFloorSelect(floor)}
                />
              ))
            ) : (
              <ConversationItem
                floor="Administration"
                isSelected={true}
                unreadCount={unreadCounts.admin}
                lastMessage="Contact admin support"
                lastTime={null}
                onClick={() => handleTabChange(MESSAGE_TYPES.ADMIN)}
              />
            )}
          </div>

          {/* User Info */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-800">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 hidden lg:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                  {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor.charAt(0) : 'A'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {activeTab === MESSAGE_TYPES.FLOOR ? `${selectedFloor} Reception` : 'Administration'}
                  </h2>
                  <p className="text-sm text-gray-500 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {getCurrentUnreadCount() > 0 
                      ? `${getCurrentUnreadCount()} unread messages` 
                      : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Chat Header */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor.charAt(0) : 'A'}
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">
                  {activeTab === MESSAGE_TYPES.FLOOR ? `${selectedFloor} Reception` : 'Administration'}
                </h2>
                <p className="text-xs text-gray-500">
                  {getCurrentUnreadCount() > 0 ? `${getCurrentUnreadCount()} unread` : 'Active now'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto py-6"
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
              <div className="space-y-2">
                {Object.entries(messageGroups).map(([date, dateMessages]) => (
                  <div key={date}>
                    <DateSeparator date={date} />
                    {dateMessages.map(msg => (
                      <MessageBubble
                        key={msg._id}
                        message={msg}
                        isOwn={msg.sender === user._id}
                        isUnread={isMessageUnread(msg._id)}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 px-4 py-4 lg:px-6">
            <div className="flex items-end space-x-3 max-w-4xl mx-auto">
              <button className="hidden lg:block p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button className="hidden lg:block p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <textarea
                  ref={textareaRef}
                  placeholder={`Message ${activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'Admin'}...`}
                  className="w-full bg-transparent outline-none resize-none text-sm max-h-[120px] text-gray-700 placeholder-gray-400"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  rows={1}
                />
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className={`
                  p-3 rounded-2xl transition-all duration-200 flex-shrink-0
                  ${newMessage.trim() 
                    ? 'bg-[#0084ff] text-white shadow-lg hover:shadow-xl hover:bg-[#0073e6] active:scale-95' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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