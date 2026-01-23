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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [newMessage]);

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

  const fetchConversations = async () => {
    try {
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
    }
  };

  const markMessagesAsRead = async (userId) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/messages/mark-read`, {
        staffId: staff._id,
        userId: userId
      });
      
      fetchTotalUnreadCount();
      fetchConversations();
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  const markAdminMessagesAsRead = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/messages/mark-read`, {
        userId: staff._id,
        conversationId: "admin"
      });
      
      fetchTotalUnreadCount();
    } catch (err) {
      console.error("Failed to mark admin messages as read:", err);
    }
  };

  const updateUnreadCountsAfterSend = () => {
    fetchTotalUnreadCount();
    
    if (activeTab === "floor") {
      fetchConversations();
      
      if (selectedUser) {
        setConversations(prev => 
          prev.map(conv => 
            conv._id === selectedUser._id 
              ? { ...conv, unreadCount: 0 } 
              : conv
          )
        );
        
        setSelectedUser(prev => prev ? { ...prev, unreadCount: 0 } : null);
      }
    }
  };

  useEffect(() => {
    if (!staff?._id) return;

    socket.emit("join", { userId: staff._id });
    socket.emit("join", { userId: staff.floor });

    fetchTotalUnreadCount();
    if (activeTab === "floor") {
      fetchConversations();
    } else {
      fetchAdminConversation();
    }

    const handleNewMessage = (msg) => {
      console.log("New message received in StaffMessages:", msg);
      
      fetchTotalUnreadCount();
      
      if (activeTab === "floor") {
        fetchConversations();
      }
      
      if (activeTab === "admin") {
        fetchAdminConversation();
      }
      
      if (activeTab === "floor" && selectedUser) {
        const isRelevantMessage = 
          (msg.sender === selectedUser._id && msg.receiver === staff._id) ||
          (msg.sender === staff._id && msg.receiver === selectedUser._id) ||
          (msg.floor === staff.floor && msg.receiver === selectedUser._id) ||
          (msg.sender === selectedUser._id && msg.floor === staff.floor) ||
          (msg.receiver === staff.floor && msg.sender === selectedUser._id);

        if (isRelevantMessage) {
          setMessages(prev => {
            const filtered = prev.filter(m => 
              !(m.status === "sending" && m.content === msg.content && m.sender === msg.sender)
            );
            
            const exists = filtered.some(m => m._id === msg._id);
            if (!exists) {
              return [...filtered, msg];
            }
            return filtered;
          });
          
          if (msg.sender !== staff._id) {
            markMessagesAsRead(selectedUser._id);
          }
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
              return [...prev, msg];
            }
            return prev;
          });
          
          if (msg.sender === "admin") {
            markAdminMessagesAsRead();
          }
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

    socket.on("newMessage", handleNewMessage);
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    socket.on("conversationUnreadUpdate", handleConversationUnreadUpdate);
    
    socket.on("messageSent", (msg) => {
      console.log("Message sent confirmation:", msg);
      setMessages(prev => prev.map(m => 
        m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
    });
    
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
      socket.off("conversationUnreadUpdate", handleConversationUnreadUpdate);
      socket.off("messageSent");
    };
  }, [staff, selectedUser, activeTab]);

  const fetchAdminConversation = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/staff-admin-conversation/${staff._id}`
      );
      setMessages(data);
      
      await markAdminMessagesAsRead();
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      console.error("Failed to fetch admin conversation:", err);
    }
  };

  const fetchUserConversation = async (user) => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/staff-user-conversation/${staff._id}/${user._id}`
      );
      setMessages(data);
      
      await markMessagesAsRead(user._id);
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      console.error("Failed to fetch user conversation:", err);
    }
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    
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
    
    if (tab === "admin") {
      fetchAdminConversation();
      if (isMobile) {
        setIsSidebarOpen(false);
      }
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

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    let tempMsg;
    
    if (activeTab === "floor" && selectedUser) {
      tempMsg = {
        _id: "temp-" + Date.now(),
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
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/staff-reply`, {
          staffId: staff._id,
          userId: selectedUser._id,
          content: newMessage,
          floor: staff.floor
        });
        
        updateUnreadCountsAfterSend();
        
      } catch (err) {
        console.error("Failed to send message:", err);
        setMessages(prev => prev.map(msg => 
          msg._id === tempMsg._id ? { ...msg, status: "failed" } : msg
        ));
      }
    } else if (activeTab === "admin") {
      tempMsg = {
        _id: "temp-" + Date.now(),
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
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/staff-to-admin`, {
          staffId: staff._id,
          content: newMessage
        });
        
        fetchTotalUnreadCount();
        
      } catch (err) {
        console.error("Failed to send message to admin:", err);
        setMessages(prev => prev.map(msg => 
          msg._id === tempMsg._id ? { ...msg, status: "failed" } : msg
        ));
      }
    }
  };

  const formatTime = (iso) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      const date = formatDate(msg.createdAt);
      if (!groups[date]) groups[date] = [];
      
      const messageExists = groups[date].some(m => m._id === msg._id);
      if (!messageExists) {
        groups[date].push(msg);
      }
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const ConversationSkeleton = () => (
    <div className="w-full p-3 rounded mb-2 bg-gray-100 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <StaffNavigation setView={setView} currentView="staffMessages" staff={staff} onLogout={onLogout} />
      
      <div className="md:ml-[250px] w-full md:w-[calc(100%-250px)] h-screen flex flex-col bg-gray-50">
        {/* Mobile Header */}
        <header className="md:hidden bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 ml-4">
            <h1 className="text-lg font-bold text-[#CC0000]">Messages</h1>
          </div>
          {totalUnread > 0 && (
            <div className="bg-[#CC0000] text-white text-xs px-2 py-1 rounded-full">
              {totalUnread}
            </div>
          )}
        </header>

        {/* Desktop Header */}
        <header className="hidden md:block bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">Message Center</h1>
              <p className="text-gray-600 text-sm">Communicate with residents and administration</p>
            </div>
            {totalUnread > 0 && (
              <div className="bg-[#CC0000] text-white text-sm px-3 py-1 rounded-full">
                {totalUnread} unread
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar Overlay for Mobile */}
          {isMobile && isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-20"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`
            ${isMobile ? 'fixed inset-y-0 left-0 z-30 transform' : 'relative'} 
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            transition-transform duration-300 ease-in-out
            w-full md:w-80 bg-white border-r border-gray-200 flex flex-col
            md:static md:h-full
          `}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-700">Conversations</h2>
                {isMobile && (
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleTabChange("floor")}
                  className={`flex-1 py-2 rounded-md text-sm font-medium ${
                    activeTab === "floor" 
                      ? "bg-[#CC0000] text-white shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Residents
                </button>
                <button
                  onClick={() => handleTabChange("admin")}
                  className={`flex-1 py-2 rounded-md text-sm font-medium ${
                    activeTab === "admin" 
                      ? "bg-[#CC0000] text-white shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-3">
              {activeTab === "floor" ? (
                loading ? (
                  <>
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                  </>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="font-medium text-gray-700">No conversations</p>
                    <p className="text-sm mt-1 text-gray-500">
                      {searchTerm ? "No matches found" : "Residents will appear here"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map(conv => (
                      <button
                        key={conv._id}
                        onClick={() => selectUser(conv)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          selectedUser?._id === conv._id 
                            ? 'bg-red-50 border-2 border-red-200 shadow-sm' 
                            : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {conv.unreadCount > 0 && (
                              <div className="bg-[#CC0000] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                {conv.unreadCount}
                              </div>
                            )}
                            <div className="w-10 h-10 bg-[#CC0000] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {conv.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-800 text-sm truncate">
                                  {conv.name}
                                </span>
                                <span className="text-xs text-gray-500 shrink-0 ml-2">
                                  {conv.latestMessageAt ? formatTime(conv.latestMessageAt) : ''}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 truncate mt-1">
                                {conv.latestMessage || "No messages"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="p-2">
                  <div 
                    onClick={() => handleTabChange("admin")}
                    className={`bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      activeTab === "admin" && !selectedUser ? 'ring-2 ring-red-300 ring-opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#CC0000] to-red-700 rounded-lg flex items-center justify-center text-white mr-3 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-red-800 text-sm block">Admin Support</span>
                        <p className="text-xs text-red-600">Always available</p>
                      </div>
                    </div>
                    <p className="text-xs text-red-700 leading-relaxed">
                      Contact administrators for support, questions, or assistance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Back Button */}
            {isMobile && selectedUser && (
              <div className="md:hidden bg-white px-4 py-3 border-b border-gray-200 flex items-center">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setIsSidebarOpen(true);
                  }}
                  className="p-2 mr-3 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 truncate">{selectedUser.name}</h3>
                  <p className="text-gray-600 text-xs">Floor {staff.floor}</p>
                </div>
              </div>
            )}

            {activeTab === "floor" && selectedUser ? (
              <>
                {/* Desktop User Header */}
                <div className="hidden md:block bg-white p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#CC0000] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{selectedUser.name}</h3>
                        <p className="text-gray-600 text-sm">Floor {staff.floor}</p>
                      </div>
                    </div>
                    {selectedUser.unreadCount > 0 && (
                      <span className="bg-[#CC0000] text-white text-xs px-3 py-1.5 rounded-full font-medium">
                        {selectedUser.unreadCount} unread
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Messages Area */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
                >
                  <div className="p-3 md:p-4">
                    {loading ? (
                      <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#CC0000] border-t-transparent mx-auto mb-3"></div>
                          <p className="text-gray-600 text-sm">Loading messages...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex justify-center items-center h-full min-h-[60vh]">
                        <div className="text-center text-gray-500 max-w-xs mx-auto">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="font-medium text-gray-700 mb-2">No messages yet</p>
                          <p className="text-sm text-gray-600">Start the conversation below</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
                        {Object.entries(messageGroups).map(([date, dateMessages]) => (
                          <div key={date} className="space-y-2 md:space-y-3">
                            <div className="flex justify-center">
                              <div className="bg-gray-200 text-gray-700 text-xs px-4 py-1.5 rounded-full font-medium">
                                {date}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {dateMessages.map(msg => (
                                <div 
                                  key={msg._id} 
                                  className={`flex ${msg.sender === staff._id ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div 
                                    className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 md:p-4 ${
                                      msg.sender === staff._id 
                                        ? 'bg-gradient-to-br from-[#CC0000] to-red-700 text-white rounded-br-none' 
                                        : 'bg-white border border-gray-200 shadow-sm rounded-bl-none'
                                    }`}
                                  >
                                    <div className="text-xs font-semibold mb-1.5">
                                      {msg.sender === staff._id ? 'You' : msg.senderName}
                                    </div>
                                    <div className="text-sm md:text-base leading-relaxed">{msg.content}</div>
                                    <div className={`text-xs mt-2 ${msg.sender === staff._id ? 'text-red-100' : 'text-gray-500'}`}>
                                      {formatTime(msg.createdAt)}
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
                </div>

                {/* Message Input */}
                <div className="bg-white border-t border-gray-200 p-3 md:p-4">
                  <div className="flex space-x-2 md:space-x-3">
                    <textarea
                      ref={textareaRef}
                      placeholder={`Message ${selectedUser.name}...`}
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#CC0000] focus:ring-2 focus:ring-red-100 text-sm md:text-base resize-none transition-all duration-200"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      rows={1}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-br from-[#CC0000] to-red-700 text-white rounded-xl px-5 md:px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center min-w-[80px]"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : activeTab === "admin" ? (
              <>
                {/* Admin Header */}
                <div className="bg-white p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#CC0000] to-red-700 rounded-lg flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Administration</h3>
                      <p className="text-gray-600 text-sm">Support and assistance</p>
                    </div>
                  </div>
                </div>
                
                {/* Messages Area */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
                >
                  <div className="p-3 md:p-4">
                    {messages.length === 0 ? (
                      <div className="flex justify-center items-center h-full min-h-[60vh]">
                        <div className="text-center text-gray-500 max-w-xs mx-auto">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <p className="font-medium text-gray-700 mb-2">No messages yet</p>
                          <p className="text-sm text-gray-600">Contact administration below</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
                        {Object.entries(messageGroups).map(([date, dateMessages]) => (
                          <div key={date} className="space-y-2 md:space-y-3">
                            <div className="flex justify-center">
                              <div className="bg-red-100 text-red-800 text-xs px-4 py-1.5 rounded-full font-medium">
                                {date}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {dateMessages.map(msg => (
                                <div 
                                  key={msg._id} 
                                  className={`flex ${msg.sender === staff._id ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div 
                                    className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 md:p-4 ${
                                      msg.sender === staff._id 
                                        ? 'bg-gradient-to-br from-[#CC0000] to-red-700 text-white rounded-br-none' 
                                        : 'bg-white border border-gray-200 shadow-sm rounded-bl-none'
                                    }`}
                                  >
                                    <div className="text-xs font-semibold mb-1.5">
                                      {msg.sender === staff._id ? 'You' : 'Administration'}
                                    </div>
                                    <div className="text-sm md:text-base leading-relaxed">{msg.content}</div>
                                    <div className={`text-xs mt-2 ${msg.sender === staff._id ? 'text-red-100' : 'text-gray-500'}`}>
                                      {formatTime(msg.createdAt)}
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
                </div>

                {/* Message Input */}
                <div className="bg-white border-t border-gray-200 p-3 md:p-4">
                  <div className="flex space-x-2 md:space-x-3">
                    <textarea
                      ref={textareaRef}
                      placeholder="Message administration..."
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#CC0000] focus:ring-2 focus:ring-red-100 text-sm md:text-base resize-none transition-all duration-200"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      rows={1}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-br from-[#CC0000] to-red-700 text-white rounded-xl px-5 md:px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center min-w-[80px]"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
                <div className="text-center text-gray-500 max-w-md mx-auto p-6">
                  <svg className="w-20 h-20 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">Select a Conversation</h3>
                  <p className="text-gray-600 mb-6">
                    Choose a resident to message, or contact administration for support.
                  </p>
                  {isMobile && (
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="bg-[#CC0000] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200"
                    >
                      View Conversations
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default StaffMessages;