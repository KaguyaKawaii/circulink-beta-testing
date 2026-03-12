import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import StaffNavigation from "./StaffNavigation";

const socket = io(`${import.meta.env.VITE_API_URL}`);

function StaffMessages({ setView, staff, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("floor");
  const [searchTerm, setSearchTerm] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [error, setError] = useState(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const searchRef = useRef(null);
  const messageInputRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch total unread count for staff
  const fetchTotalUnreadCount = async () => {
    if (!staff?._id) return;
    
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/staff-total-unread/${staff._id}`
      );
      setTotalUnread(data.count || 0);
    } catch (err) {
      console.error("Failed to fetch total unread count:", err);
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/messages/unread-count/${staff._id}`
        );
        setTotalUnread(data.count || 0);
      } catch (fallbackErr) {
        console.error("Failed to fetch fallback unread count:", fallbackErr);
        setTotalUnread(0);
      }
    }
  };

  // Fetch conversations with proper unread counts
  const fetchConversations = async () => {
    try {
      setError(null);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/floor-users/${staff.floor}`
      );
      
      const conversationsWithUnread = await Promise.all(
        data.map(async (conv) => {
          try {
            const { data: unreadData } = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/messages/unread-count-by-user/${staff._id}/${conv._id}`
            );
            return { ...conv, unreadCount: unreadData.count || 0 };
          } catch (err) {
            console.error(`Failed to fetch unread count for ${conv._id}:`, err);
            return { ...conv, unreadCount: 0 };
          }
        })
      );
      
      setConversations(conversationsWithUnread);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setError("Failed to load conversations. Please try again.");
      setConversations([]);
    }
  };

  // Mark messages as read for a specific user
  const markMessagesAsRead = async (userId) => {
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/messages/mark-read`, {
        staffId: staff._id,
        userId: userId
      });
      
      console.log("✅ Messages marked as read for user:", userId, response.data);
      
      // Immediately update local state
      if (activeTab === "floor") {
        // Update conversations list
        setConversations(prev => 
          prev.map(conv => 
            conv._id === userId 
              ? { ...conv, unreadCount: 0 } 
              : conv
          )
        );
        
        // Update selected user if applicable
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser(prev => prev ? { ...prev, unreadCount: 0 } : null);
        }
      }
      
      // Update total unread count
      fetchTotalUnreadCount();
      
      // Emit socket event to notify others
      socket.emit('markConversationRead', {
        staffId: staff._id,
        userId: userId,
        unreadCount: 0
      });
      
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  // Mark admin messages as read
  const markAdminMessagesAsRead = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/messages/mark-read`, {
        userId: staff._id,
        conversationId: "admin"
      });
      
      console.log("✅ Admin messages marked as read");
      
      // Update total unread count
      fetchTotalUnreadCount();
      
    } catch (err) {
      console.error("Failed to mark admin messages as read:", err);
    }
  };

  // Update unread counts locally when staff sends a message
  const updateUnreadCountsAfterSend = (userId) => {
    // When staff sends a message, their unread count for that conversation should be 0
    if (activeTab === "floor" && userId) {
      setConversations(prev => 
        prev.map(conv => 
          conv._id === userId 
            ? { ...conv, unreadCount: 0 } 
            : conv
        )
      );
      
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(prev => prev ? { ...prev, unreadCount: 0 } : null);
      }
      
      // Emit socket event to update unread count
      socket.emit('staffMessageSent', {
        staffId: staff._id,
        userId: userId,
        floor: staff.floor
      });
    }
    
    fetchTotalUnreadCount();
  };

  // Socket event handling for instant message updates
  useEffect(() => {
    if (!staff?._id) return;

    // Join staff's personal room and floor room
    socket.emit("join", { userId: staff._id });
    socket.emit("join", { userId: staff.floor });

    // Fetch initial data
    fetchTotalUnreadCount();
    if (activeTab === "floor") {
      fetchConversations();
    } else {
      fetchAdminConversation();
    }

    const handleNewMessage = (msg) => {
      console.log("📨 New message received in StaffMessages:", msg);
      
      // Update total unread count
      fetchTotalUnreadCount();
      
      // Update conversations list for floor tab
      if (activeTab === "floor") {
        fetchConversations();
        
        // Check if this message is for the selected conversation
        if (selectedUser) {
          const isRelevantMessage = 
            (msg.sender === selectedUser._id && msg.receiver === staff._id) ||
            (msg.sender === selectedUser._id && msg.floor === staff.floor);
            
          if (isRelevantMessage) {
            // Immediately mark as read since staff is viewing the conversation
            markMessagesAsRead(selectedUser._id);
          }
        }
      }
      
      // Update admin conversation if relevant
      if (activeTab === "admin") {
        fetchAdminConversation();
        
        // If staff is viewing admin conversation, mark as read
        if (msg.sender === "admin" && msg.receiver === staff._id) {
          markAdminMessagesAsRead();
        }
      }
      
      // Add message to current chat if it belongs to the active conversation
      if (activeTab === "floor" && selectedUser) {
        const isRelevantMessage = 
          (msg.sender === selectedUser._id && msg.receiver === staff._id) ||
          (msg.sender === staff._id && msg.receiver === selectedUser._id) ||
          (msg.floor === staff.floor && msg.receiver === selectedUser._id) ||
          (msg.sender === selectedUser._id && msg.floor === staff.floor) ||
          (msg.receiver === staff.floor && msg.sender === selectedUser._id);

        if (isRelevantMessage) {
          setMessages(prev => {
            // Remove any temporary messages with same content
            const filtered = prev.filter(m => 
              !(m.status === "sending" && m.content === msg.content && m.sender === msg.sender)
            );
            
            // Only add if not already present
            const exists = filtered.some(m => m._id === msg._id);
            if (!exists) {
              console.log("✅ Adding new message to current conversation:", msg);
              return [...filtered, msg];
            }
            return filtered;
          });
        }
      }
      
      if (activeTab === "admin") {
        const isRelevantAdminMessage = 
          (msg.sender === "admin" && msg.receiver === staff._id) ||
          (msg.sender === staff._id && msg.receiver === "admin");

        if (isRelevantAdminMessage) {
          setMessages(prev => {
            const messageExists = prev.some(m => m._id === msg._id);
            if (!messageExists) {
              console.log("✅ Adding new admin message:", msg);
              return [...prev, msg];
            }
            return prev;
          });
        }
      }
    };

    const handleUnreadCountUpdate = (data) => {
      if (data.userId === staff._id) {
        setTotalUnread(data.count);
        if (activeTab === "floor") {
          fetchConversations();
        }
      }
    };

    const handleConversationUnreadUpdate = (data) => {
      if (data.staffId === staff._id) {
        setConversations(prev => 
          prev.map(conv => 
            conv._id === data.userId 
              ? { ...conv, unreadCount: data.count || 0 } 
              : conv
          )
        );
        
        if (selectedUser && selectedUser._id === data.userId) {
          setSelectedUser(prev => prev ? { ...prev, unreadCount: data.count || 0 } : null);
        }
        
        fetchTotalUnreadCount();
      }
    };
    
    // Handle when conversation is marked as read
    const handleConversationRead = (data) => {
      if (data.staffId === staff._id) {
        console.log("📥 Conversation marked as read:", data);
        setConversations(prev => 
          prev.map(conv => 
            conv._id === data.userId 
              ? { ...conv, unreadCount: 0 } 
              : conv
          )
        );
        
        if (selectedUser && selectedUser._id === data.userId) {
          setSelectedUser(prev => prev ? { ...prev, unreadCount: 0 } : null);
        }
        
        fetchTotalUnreadCount();
      }
    };

    // Handle message sent confirmation
    const handleMessageSent = (msg) => {
      console.log("✅ Message sent confirmation:", msg);
      setMessages(prev => prev.map(m => 
        m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
      
      // Update unread counts after sending
      if (msg.receiver !== "admin") {
        updateUnreadCountsAfterSend(msg.receiver);
      }
    };
    
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    socket.on("newMessage", handleNewMessage);
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    socket.on("conversationUnreadUpdate", handleConversationUnreadUpdate);
    socket.on("conversationRead", handleConversationRead);
    socket.on("messageSent", handleMessageSent);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      socket.off("newMessage", handleNewMessage);
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
      socket.off("conversationUnreadUpdate", handleConversationUnreadUpdate);
      socket.off("conversationRead", handleConversationRead);
      socket.off("messageSent", handleMessageSent);
    };
  }, [staff, selectedUser, activeTab]);

  const fetchAdminConversation = async () => {
    try {
      setError(null);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/staff-admin-conversation/${staff._id}`
      );
      setMessages(data);
      
      // Mark admin messages as read when viewing
      await markAdminMessagesAsRead();
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      console.error("Failed to fetch admin conversation:", err);
      setError("Failed to load admin conversation. Please try again.");
      setMessages([]);
    }
  };

  const fetchUserConversation = async (user) => {
    try {
      setError(null);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/staff-user-conversation/${staff._id}/${user._id}`
      );
      setMessages(data);
      
      // Mark messages as read immediately when opening conversation
      await markMessagesAsRead(user._id);
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      console.error("Failed to fetch user conversation:", err);
      setError("Failed to load conversation. Please try again.");
      setMessages([]);
    }
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    
    try {
      await fetchUserConversation(user);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedUser(null);
    setMessages([]);
    setNewMessage("");
    setError(null);
    
    if (tab === "admin") {
      fetchAdminConversation();
    } else {
      fetchConversations();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Improved sendMessage function with proper unread handling
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    let tempMsg;
    
    if (activeTab === "floor" && selectedUser) {
      tempMsg = {
        _id: "temp-" + Date.now(),
        localId: Date.now(),
        sender: staff._id,
        receiver: selectedUser._id,
        content: newMessage,
        createdAt: new Date().toISOString(),
        status: "sending",
        senderName: `${staff.floor} Staff`,
        displayName: `${staff.floor} Staff`,
        floor: staff.floor
      };

      setMessages(prev => [...prev, tempMsg]);
      setNewMessage("");

      try {
        setError(null);
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/staff-reply`, {
          staffId: staff._id,
          userId: selectedUser._id,
          content: newMessage,
          floor: staff.floor
        });
        
        console.log("✅ Message sent successfully:", response.data);
        
        // Update unread counts immediately
        updateUnreadCountsAfterSend(selectedUser._id);
        
        // Update the temporary message with the real one
        setMessages(prev => prev.map(msg => 
          msg.localId === tempMsg.localId 
            ? { ...response.data, status: "sent" }
            : msg
        ));
        
      } catch (err) {
        console.error("Failed to send message:", err);
        setError("Failed to send message. Please try again.");
        setMessages(prev => prev.map(msg => 
          msg.localId === tempMsg.localId ? { ...msg, status: "failed" } : msg
        ));
      }
    } else if (activeTab === "admin") {
      tempMsg = {
        _id: "temp-" + Date.now(),
        localId: Date.now(),
        sender: staff._id,
        receiver: "admin",
        content: newMessage,
        createdAt: new Date().toISOString(),
        status: "sending",
        senderName: staff.name,
        displayName: staff.name
      };

      setMessages(prev => [...prev, tempMsg]);
      setNewMessage("");

      try {
        setError(null);
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/staff-to-admin`, {
          staffId: staff._id,
          content: newMessage
        });
        
        console.log("✅ Message to admin sent successfully:", response.data);
        
        fetchTotalUnreadCount();
        
        // Update the temporary message with the real one
        setMessages(prev => prev.map(msg => 
          msg.localId === tempMsg.localId 
            ? { ...response.data, status: "sent" }
            : msg
        ));
        
      } catch (err) {
        console.error("Failed to send message to admin:", err);
        setError("Failed to send message. Please try again.");
        setMessages(prev => prev.map(msg => 
          msg.localId === tempMsg.localId ? { ...msg, status: "failed" } : msg
        ));
      }
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      return "";
    }
  };

  const formatMessageDate = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (d.toDateString() === now.toDateString()) {
        return "Today";
      } else if (d.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      }
    } catch (error) {
      return "";
    }
  };

  const getAvatar = (name, size = "md") => {
    const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
    return (
      <div className={`${sizeClasses} bg-gradient-to-r from-[#CC0000] to-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0`}>
        {name ? name.charAt(0).toUpperCase() : "U"}
      </div>
    );
  };

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      const date = formatMessageDate(msg.createdAt);
      if (!groups[date]) groups[date] = [];
      
      const messageExists = groups[date].some(m => m._id === msg._id);
      if (!messageExists) {
        groups[date].push(msg);
      }
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <StaffNavigation setView={setView} currentView="staffMessages" staff={staff} onLogout={onLogout} />
      
      <div className="ml-[250px] h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">Messages</h1>
          <p className="text-gray-600">Communicate with residents and administration</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Search and Tabs */}
            <div className="p-3 border-b border-gray-200" ref={searchRef}>
              {/* Search Bar */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => searchTerm && setShowSearchDropdown(true)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Tab Buttons */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleTabChange("floor")}
                  className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === "floor" 
                      ? "bg-[#CC0000] text-white shadow" 
                      : "text-gray-600 hover:text-gray-800 hover:bg-white"
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => handleTabChange("admin")}
                  className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === "admin" 
                      ? "bg-[#CC0000] text-white shadow" 
                      : "text-gray-600 hover:text-gray-800 hover:bg-white"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "floor" ? (
                loading ? (
                  // Loading skeletons
                  <div className="p-4 space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="animate-pulse flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="font-medium">No conversations found</p>
                    <p className="text-xs mt-2">{searchTerm ? "Try different search terms" : "Users will appear here"}</p>
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <button
                      key={conv._id}
                      onClick={() => selectUser(conv)}
                      className={`w-full text-left p-3 transition-all duration-200 cursor-pointer hover:bg-gray-50 ${
                        selectedUser?._id === conv._id 
                          ? 'bg-[#CC0000]/5 border-l-4 border-[#CC0000]' 
                          : 'border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {getAvatar(conv.name)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800 text-sm truncate">
                              {conv.name}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {conv.latestMessageAt ? formatTime(conv.latestMessageAt) : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="text-xs text-gray-600 truncate max-w-[180px]">
                              {conv.latestMessage || "No messages yet"}
                            </div>
                            {conv.unreadCount > 0 && (
                              <span className="bg-[#CC0000] text-white text-xs px-2 py-0.5 rounded-full ml-2">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )
              ) : (
                // Admin conversation option
                <div className="p-3">
                  <div 
                    onClick={() => handleTabChange("admin")}
                    className={`bg-white border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                      activeTab === "admin" && !selectedUser ? 'border-[#CC0000] border-2' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#CC0000] rounded-lg flex items-center justify-center text-white mr-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 text-sm">Admin Support</span>
                        <p className="text-xs text-gray-500 mt-1">Contact administration for assistance</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-100">
            {activeTab === "floor" && selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm flex items-center">
                  <div className="flex items-center space-x-3">
                    {getAvatar(selectedUser.name)}
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedUser.name}</h3>
                      <p className="text-xs text-gray-500">User • Active now</p>
                    </div>
                  </div>
                  {selectedUser.unreadCount > 0 && (
                    <span className="ml-auto bg-[#CC0000] text-white text-xs px-2 py-1 rounded-full">
                      {selectedUser.unreadCount} new
                    </span>
                  )}
                </div>
                
                {/* Messages Container */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto px-4 py-6"
                >
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC0000]"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Say hello to {selectedUser.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(messageGroups).map(([date, dateMessages]) => (
                        <div key={date}>
                          <div className="flex justify-center mb-4">
                            <span className="text-xs bg-gray-200/80 text-gray-600 px-3 py-1 rounded-full">
                              {date}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {dateMessages.map((msg, idx) => {
                              const isStaff = msg.sender === staff._id;
                              const showAvatar = !isStaff && (
                                idx === 0 || 
                                dateMessages[idx - 1]?.sender !== msg.sender
                              );
                              
                              return (
                                <div key={msg._id || msg.localId} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`flex items-end space-x-2 max-w-[65%] ${isStaff ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                    {!isStaff && showAvatar ? (
                                      getAvatar(selectedUser.name, "sm")
                                    ) : !isStaff ? (
                                      <div className="w-8"></div>
                                    ) : null}
                                    
                                    <div className="flex flex-col">
                                      <div className={`px-3 py-2 rounded-2xl ${
                                        isStaff 
                                          ? 'bg-[#CC0000] text-white rounded-br-none' 
                                          : 'bg-white border border-gray-200 rounded-bl-none shadow-sm'
                                      }`}>
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {msg.content}
                                        </div>
                                      </div>
                                      <div className={`text-[10px] text-gray-400 mt-1 ${isStaff ? 'text-right' : 'text-left'}`}>
                                        {formatTime(msg.createdAt)}
                                        {msg.status === "sending" && " • Sending"}
                                        {msg.status === "failed" && " • Failed"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="bg-white px-4 py-3 border-t border-gray-200">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2">
                      <textarea
                        ref={messageInputRef}
                        placeholder={`Message ${selectedUser.name}`}
                        className="w-full bg-transparent border-0 focus:ring-0 text-sm resize-none outline-none max-h-32"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        rows={1}
                        style={{ minHeight: '20px' }}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-[#CC0000] text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#CC0000]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC0000] cursor-pointer flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : activeTab === "admin" ? (
              <>
                {/* Admin Chat Header */}
                <div className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm flex items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#CC0000] rounded-lg flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Administration</h3>
                      <p className="text-xs text-gray-500">Support team • Usually replies within an hour</p>
                    </div>
                  </div>
                </div>
                
                {/* Messages Container */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto px-4 py-6"
                >
                  {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start a conversation with administration</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(messageGroups).map(([date, dateMessages]) => (
                        <div key={date}>
                          <div className="flex justify-center mb-4">
                            <span className="text-xs bg-gray-200/80 text-gray-600 px-3 py-1 rounded-full">
                              {date}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {dateMessages.map((msg, idx) => {
                              const isStaff = msg.sender === staff._id;
                              const showAvatar = !isStaff && (
                                idx === 0 || 
                                dateMessages[idx - 1]?.sender !== msg.sender
                              );
                              
                              return (
                                <div key={msg._id || msg.localId} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`flex items-end space-x-2 max-w-[65%] ${isStaff ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                    {!isStaff && showAvatar ? (
                                      <div className="w-8 h-8 bg-[#CC0000] rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        </svg>
                                      </div>
                                    ) : !isStaff ? (
                                      <div className="w-8"></div>
                                    ) : null}
                                    
                                    <div className="flex flex-col">
                                      <div className={`px-3 py-2 rounded-2xl ${
                                        isStaff 
                                          ? 'bg-[#CC0000] text-white rounded-br-none' 
                                          : 'bg-white border border-gray-200 rounded-bl-none shadow-sm'
                                      }`}>
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {msg.content}
                                        </div>
                                      </div>
                                      <div className={`text-[10px] text-gray-400 mt-1 ${isStaff ? 'text-right' : 'text-left'}`}>
                                        {formatTime(msg.createdAt)}
                                        {msg.status === "sending" && " • Sending"}
                                        {msg.status === "failed" && " • Failed"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="bg-white px-4 py-3 border-t border-gray-200">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2">
                      <textarea
                        ref={messageInputRef}
                        placeholder="Message Administration..."
                        className="w-full bg-transparent border-0 focus:ring-0 text-sm resize-none outline-none max-h-32"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        rows={1}
                        style={{ minHeight: '20px' }}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-[#CC0000] text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#CC0000]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC0000] cursor-pointer flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-500">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-700">Your Messages</h3>
                  <p className="text-gray-500 max-w-sm">
                    Select a conversation from the sidebar or choose a tab to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </>
  );
}

export default StaffMessages;