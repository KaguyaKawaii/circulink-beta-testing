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
const MessageBubble = ({ message, isOwn, isUnread }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`relative max-w-[75%] px-4 py-2 ${
        isOwn 
          ? 'bg-blue-500 text-white rounded-2xl rounded-tr-none' 
          : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none'
      }`}>
        {!isOwn && (
          <div className="text-xs font-medium text-gray-600 mb-1">
            {message.senderName}
          </div>
        )}
        <div className="text-sm break-words whitespace-pre-wrap">{message.content}</div>
        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
          isOwn ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {formatTime(message.createdAt)}
          {isOwn && message.status === "sending" && (
            <span className="text-[10px]">• Sending</span>
          )}
          {isOwn && message.status === "failed" && (
            <span className="text-[10px] text-red-300">• Failed</span>
          )}
        </div>
        {isUnread && !isOwn && (
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-green-500 rounded-full"></div>
        )}
      </div>
    </div>
  );
};

// Date Separator Component
const DateSeparator = ({ date }) => {
  let displayText = formatDate(date);
  if (isToday(date)) displayText = 'Today';
  if (isYesterday(date)) displayText = 'Yesterday';
  
  return (
    <div className="flex justify-center my-4">
      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
        {displayText}
      </span>
    </div>
  );
};

// Loading State
const LoadingState = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p className="text-sm text-gray-500">Loading messages...</p>
    </div>
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div className="text-4xl mb-2">💬</div>
      <h3 className="text-sm font-medium text-gray-700 mb-1">No messages yet</h3>
      <p className="text-xs text-gray-500">Start a conversation below</p>
    </div>
  </div>
);

// Conversation Item Component (for sidebar)
const ConversationItem = ({ 
  type, 
  label, 
  subtitle, 
  isActive, 
  unreadCount, 
  onClick 
}) => {
  const getActiveColor = () => {
    if (!isActive) return 'hover:bg-gray-50';
    return type === MESSAGE_TYPES.FLOOR ? 'bg-blue-50' : 'bg-blue-50';
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center justify-between rounded-lg transition-colors ${getActiveColor()}`}
    >
      <div className="flex-1 text-left">
        <div className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
          {label}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
        )}
      </div>
      {unreadCount > 0 && (
        <span className="bg-blue-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Floor Item Component
const FloorItem = ({ floor, isSelected, unreadCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center justify-between rounded-lg transition-colors ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <span className={`text-sm ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
        {floor}
      </span>
      {unreadCount > 0 && (
        <span className="bg-blue-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
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
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const sidebarRef = useRef(null);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom
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
    }
    return unreadCounts.admin;
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
    } catch (error) {
      console.warn("Failed to mark conversation as read:", error);
    }
  };

  // Socket setup
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
          !(m.status === "sending" && m.content === msg.content)
        );
        
        if (activeTab === MESSAGE_TYPES.FLOOR) {
          const isRelevant = msg.floor === selectedFloor || 
                            (msg.sender === user._id && msg.receiver === selectedFloor);
          
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
        } else {
          const isRelevant = (msg.sender === "admin" && msg.receiver === user._id) ||
                            (msg.sender === user._id && msg.receiver === "admin");
          
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
        m.status === "sending" ? { ...msg, status: "sent" } : m
      ));
    };

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);

    return () => {
      isMounted = false;
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);
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
    setNewMessage("");

    try {
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
    setLoading(true);
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
    setLoading(true);
    fetchMessages();
    setIsSidebarOpen(false);
  };

  // Click outside to close sidebar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobile && isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isSidebarOpen]);

  return (
    <div className="lg:ml-[250px] w-full lg:w-[calc(100%-250px)] h-[calc(100vh-4rem)] lg:h-screen flex flex-col bg-white">
      {/* Messages Header - Now with proper shadow */}
      <div className="flex items-center px-4 sm:px-6 h-[60px] bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <h1 className="ml-2 md:ml-0 text-lg font-medium text-gray-900">
          {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'Admin Messages'}
        </h1>

        {/* Unread badge for mobile */}
        {getCurrentUnreadCount() > 0 && (
          <span className="ml-3 md:hidden text-xs text-gray-500">
            {getCurrentUnreadCount()} unread
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Overlay */}
        {isSidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          ref={sidebarRef}
          className={`
            fixed md:static top-0 left-0 w-72 h-full bg-white border-r border-gray-200 z-50
            transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 md:hidden">
            <h2 className="font-medium text-gray-900">Chats</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-3">
            {/* Conversations */}
            <div className="space-y-1">
              <ConversationItem
                type={MESSAGE_TYPES.FLOOR}
                label="Floors"
                subtitle="Message receptionist"
                isActive={activeTab === MESSAGE_TYPES.FLOOR}
                unreadCount={unreadCounts.floor}
                onClick={() => handleTabChange(MESSAGE_TYPES.FLOOR)}
              />
              
              <ConversationItem
                type={MESSAGE_TYPES.ADMIN}
                label="Administration"
                subtitle="Contact admin"
                isActive={activeTab === MESSAGE_TYPES.ADMIN}
                unreadCount={unreadCounts.admin}
                onClick={() => handleTabChange(MESSAGE_TYPES.ADMIN)}
              />
            </div>

            {/* Floor Selection */}
            {activeTab === MESSAGE_TYPES.FLOOR && (
              <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 mb-2">
                  Select Floor
                </h3>
                <div className="space-y-1">
                  {FLOORS.map(floor => (
                    <FloorItem
                      key={floor}
                      floor={floor}
                      isSelected={selectedFloor === floor}
                      unreadCount={floorUnreadCounts[floor] || 0}
                      onClick={() => handleFloorSelect(floor)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Admin Info */}
            {activeTab === MESSAGE_TYPES.ADMIN && (
              <div className="mt-6 px-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Contact administration for account issues or general inquiries.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat Header - Desktop */}
          <div className="hidden md:flex items-center px-6 h-16 bg-white border-b border-gray-200">
            <h2 className="text-base font-medium text-gray-900">
              {activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'Administration'}
            </h2>
            {getCurrentUnreadCount() > 0 && (
              <span className="ml-3 text-xs text-gray-500">
                {getCurrentUnreadCount()} unread
              </span>
            )}
          </div>

          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4"
          >
            {loading ? (
              <LoadingState />
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
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-end gap-2">
              <textarea
                ref={textareaRef}
                placeholder="Type a message..."
                className="flex-1 border-0 focus:ring-0 resize-none text-sm bg-gray-50 rounded-lg px-4 py-2 max-h-24"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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