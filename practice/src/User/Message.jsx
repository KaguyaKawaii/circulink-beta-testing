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

// Message Bubble Component
const MessageBubble = ({ message, isOwn, isUnread, activeTab, user }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`flex max-w-[85%] lg:max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar for received messages */}
        {!isOwn && (
          <div className="flex-shrink-0 mr-2 mt-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${
              activeTab === MESSAGE_TYPES.FLOOR 
                ? 'bg-gradient-to-br from-red-500 to-orange-500' 
                : 'bg-gradient-to-br from-blue-500 to-cyan-500'
            }`}>
              {message.senderName?.charAt(0) || 'U'}
            </div>
          </div>
        )}
        
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name */}
          {!isOwn && (
            <span className="text-xs text-gray-500 ml-2 mb-1">
              {message.senderName}
            </span>
          )}
          
          <div className="relative">
            {/* Message bubble */}
            <div className={`
              px-4 py-2 rounded-2xl shadow-sm break-words whitespace-pre-wrap
              ${isOwn 
                ? activeTab === MESSAGE_TYPES.FLOOR
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-br-none'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-none'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
              }
              ${isUnread && !isOwn ? 'ring-2 ring-green-400 ring-opacity-50' : ''}
            `}>
              <div className="text-sm leading-relaxed">{message.content}</div>
              
              {/* Message metadata */}
              <div className={`flex items-center justify-end mt-1 space-x-1 text-xs ${
                isOwn 
                  ? activeTab === MESSAGE_TYPES.FLOOR ? 'text-red-100' : 'text-blue-100'
                  : 'text-gray-400'
              }`}>
                <span>{formatTime(message.createdAt)}</span>
                {isOwn && (
                  <>
                    {message.status === "sending" && (
                      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2" />
                      </svg>
                    )}
                    {message.status === "sent" && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {message.status === "failed" && (
                      <svg className="w-3 h-3 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* NEW badge */}
            {isUnread && !isOwn && (
              <div className="absolute -top-2 -left-2 z-10">
                <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                  NEW
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.object.isRequired,
  isOwn: PropTypes.bool.isRequired,
  isUnread: PropTypes.bool.isRequired,
  activeTab: PropTypes.string.isRequired,
  user: PropTypes.object.isRequired
};

const DateSeparator = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
        {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : formatDate(date)}
      </div>
    </div>
  );
};

DateSeparator.propTypes = {
  date: PropTypes.string.isRequired
};

const LoadingSkeleton = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-red-500 border-t-transparent mx-auto mb-3"></div>
      <p className="text-gray-500 text-sm">Loading messages...</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center text-gray-400 max-w-sm px-4">
      <div className="text-6xl mb-3 opacity-30">💬</div>
      <h3 className="text-lg font-semibold mb-1 text-gray-500">No messages yet</h3>
      <p className="text-gray-400 text-sm mb-3">Send a message to start the conversation</p>
    </div>
  </div>
);

// Typing Indicator
const TypingIndicator = () => (
  <div className="flex justify-start mb-2">
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
        <span className="text-gray-600 text-xs">...</span>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
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
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const messagesEndRef = useRef(null);
  const messageSound = useRef(new Audio("/ringtone_message.wav"));
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
    try { messageSound.current.volume = 0.5; } catch (e) {}
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [newMessage]);

  // Typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
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
      console.error("Failed to fetch unread messages:", error);
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
      console.warn("Failed to mark messages as read:", error.message);
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

  // Mark conversation as read
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      markConversationAsRead();
    }
  }, [activeTab, selectedFloor, messages.length]);

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
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
    }

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
    setReplyTo(null);
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
    setReplyTo(null);
    fetchMessages();
    setIsSidebarOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // Click outside sidebar
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

  const handleHamburgerClick = (e) => {
    e.stopPropagation();
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <main 
      className="lg:ml-[250px] w-full lg:w-[calc(100%-250px)] h-screen flex flex-col bg-gray-100 overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-[60px] flex items-center px-4 lg:px-6 flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <button 
              onClick={handleHamburgerClick}
              data-hamburger="true"
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-800">
                {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "Administration"}
              </h1>
              <p className="text-xs text-gray-500">
                {activeTab === MESSAGE_TYPES.FLOOR 
                  ? `Chat with ${selectedFloor} Receptionist`
                  : "Chat with Admin Team"
                }
              </p>
            </div>
          </div>
          
          {/* Unread badge */}
          {getCurrentUnreadCount() > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-sm">
              {getCurrentUnreadCount()} new
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          ref={sidebarRef}
          className={`
            fixed lg:static top-0 left-0 h-full w-[280px] bg-white border-r border-gray-200 z-40 flex flex-col
            transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Conversations</h2>
              {isMobile && (
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Tab Buttons - Removed toggle, showing both options separately */}
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => handleTabChange(MESSAGE_TYPES.FLOOR)}
              className={`w-full text-left px-3 py-3 rounded-lg transition-all mb-2 ${
                activeTab === MESSAGE_TYPES.FLOOR 
                  ? "bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500" 
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activeTab === MESSAGE_TYPES.FLOOR ? "bg-red-500" : "bg-gray-300"
                  }`}></div>
                  <span className={`text-sm ${
                    activeTab === MESSAGE_TYPES.FLOOR ? "font-medium text-gray-900" : "text-gray-700"
                  }`}>
                    Floors
                  </span>
                </div>
                {unreadCounts.floor > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCounts.floor > 9 ? "9+" : unreadCounts.floor}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => handleTabChange(MESSAGE_TYPES.ADMIN)}
              className={`w-full text-left px-3 py-3 rounded-lg transition-all ${
                activeTab === MESSAGE_TYPES.ADMIN 
                  ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500" 
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activeTab === MESSAGE_TYPES.ADMIN ? "bg-blue-500" : "bg-gray-300"
                  }`}></div>
                  <span className={`text-sm ${
                    activeTab === MESSAGE_TYPES.ADMIN ? "font-medium text-gray-900" : "text-gray-700"
                  }`}>
                    Administration
                  </span>
                </div>
                {unreadCounts.admin > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCounts.admin > 9 ? "9+" : unreadCounts.admin}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Floor Selection */}
          {activeTab === MESSAGE_TYPES.FLOOR && (
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Floors</h3>
              </div>
              <div className="space-y-1 px-2">
                {FLOORS.map(floor => (
                  <button
                    key={floor}
                    onClick={() => handleFloorSelect(floor)}
                    className={`
                      w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all
                      ${selectedFloor === floor 
                        ? "bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500" 
                        : "hover:bg-gray-50"
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedFloor === floor ? "bg-red-500" : "bg-gray-300"
                      }`}></div>
                      <span className={`text-sm ${
                        selectedFloor === floor ? "font-medium text-gray-900" : "text-gray-700"
                      }`}>
                        {floor}
                      </span>
                    </div>
                    {floorUnreadCounts[floor] > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {floorUnreadCounts[floor] > 9 ? "9+" : floorUnreadCounts[floor]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin Info */}
          {activeTab === MESSAGE_TYPES.ADMIN && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Admin Support</h4>
                    <p className="text-xs text-blue-700">Typically replies in a few hours</p>
                  </div>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Contact administration for account issues, complaints, or inquiries.
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-100 h-full overflow-hidden">
          {/* Messages Container - Fixed height calculation */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 lg:px-6"
            style={{ 
              height: 'calc(100vh - 180px)', // Header (60px) + Input area (~120px)
              maxHeight: 'calc(100vh - 180px)'
            }}
          >
            <div className="max-w-3xl mx-auto">
              {loading ? (
                <LoadingSkeleton />
              ) : messages.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {Object.entries(messageGroups).map(([date, dateMessages]) => (
                    <div key={date}>
                      <DateSeparator date={date} />
                      
                      <div className="space-y-1">
                        {dateMessages.map((msg, index) => (
                          <MessageBubble
                            key={msg._id || index}
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
                  
                  {/* Typing indicator */}
                  {isTyping && <TypingIndicator />}
                </>
              )}
            </div>
          </div>

          {/* Message Input - Fixed at bottom */}
          <div className="bg-white border-t border-gray-200 p-3 lg:p-4 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              {/* Reply preview */}
              {replyTo && (
                <div className="mb-2 px-3 py-2 bg-gray-100 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span className="text-sm text-gray-600">Replying to message</span>
                  </div>
                  <button 
                    onClick={() => setReplyTo(null)} 
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              <div className="flex items-end space-x-2">
                <div className="flex-1 bg-gray-100 rounded-2xl border border-gray-200 focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 transition-all">
                  <textarea
                    ref={textareaRef}
                    placeholder={`Message ${activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'Admin'}...`}
                    className="w-full bg-transparent rounded-2xl px-4 py-3 focus:outline-none resize-none text-sm"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={handleKeyPress}
                    rows={1}
                    style={{ 
                      minHeight: '44px', 
                      maxHeight: '100px'
                    }}
                  />
                </div>
                
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`
                    p-3 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0
                    ${activeTab === MESSAGE_TYPES.FLOOR 
                      ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600" 
                      : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    }
                    shadow-md hover:shadow-lg
                  `}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-1 text-xs text-gray-400 px-3">
                Press Enter to send, Shift + Enter for new line
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global animation styles in a style tag */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
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