import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import AdminNavigation from "./AdminNavigation";

const socket = io(import.meta.env.VITE_API_URL);

function AdminMessages({ setView, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedName, setSelectedName] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [userNames, setUserNames] = useState({}); // Cache for user names

  const listRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Smooth scroll to bottom function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Load initial data and setup socket
  useEffect(() => {
    fetchRecipients();
    fetchAllUsers();
    socket.emit("join", { userId: "admin" });

    // Restore last opened recipient
    const savedRecipient = localStorage.getItem("adminSelectedRecipient");
    if (savedRecipient) {
      try {
        const parsed = JSON.parse(savedRecipient);
        setSelectedId(parsed._id);
        setSelectedName(parsed.name);
        setSelectedType(parsed.type || "user");
      } catch (error) {
        console.error("Error parsing saved recipient:", error);
        localStorage.removeItem("adminSelectedRecipient");
      }
    }

    const handleNewMessage = (msg) => {
      console.log("📨 New message received in Admin Messages:", msg);
      
      // Only handle messages that involve admin
      const involvesAdmin = msg.sender === "admin" || msg.receiver === "admin";
      
      if (!involvesAdmin) {
        return; // Ignore user-staff conversations
      }

      const isCurrentConversation = msg.sender === selectedId || msg.receiver === selectedId;

      if (isCurrentConversation) {
        setMessages((prev) => {
          const existing = prev.find(m => m._id === msg._id);
          if (existing) return prev;
          
          // Replace temporary message with real one
          const idx = prev.findIndex(
            (m) => m.localId && m.content === msg.content
          );
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = msg;
            console.log("✅ Replaced temporary message with real one:", msg);
            return copy;
          }
          console.log("✅ Adding new message to admin conversation:", msg);
          return [...prev, msg];
        });
      }

      // Always update recipients when a new message arrives that involves admin
      fetchRecipients();
    };

    // NEW: Handle message sent confirmation
    const handleMessageSent = (msg) => {
      console.log("✅ Admin message sent confirmation:", msg);
      setMessages(prev => prev.map(m => 
        m.localId && m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageSent", handleMessageSent);
    
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageSent", handleMessageSent);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedId]);

  // Fetch messages when recipient changes
  useEffect(() => {
    if (selectedId) {
      socket.emit("join", { userId: selectedId });
      fetchMessagesWithoutLoading();
    }
  }, [selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Enhanced recipient filtering to ensure privacy
  const isAdminConversation = (recipient) => {
    if (!recipient || !recipient._id) return false;
    
    // Filter out floors
    const floorIds = [
      "Ground Floor",
      "Second Floor",
      "Third Floor",
      "Fourth Floor",
      "Fifth Floor",
    ];
    
    if (floorIds.includes(recipient._id)) {
      return false;
    }

    // Only show conversations where admin is involved
    // This ensures user-staff conversations are not visible to admin
    return true;
  };

  // Fetch user name by ID
  const fetchUserName = async (userId) => {
    if (!userId || userId === "admin") return "Administration";
    
    // Check if we already have the name cached
    if (userNames[userId]) {
      return userNames[userId];
    }

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/${userId}`);
      if (res.data && res.data.user) {
        const userName = res.data.user.name || "Unknown User";
        // Cache the name
        setUserNames(prev => ({ ...prev, [userId]: userName }));
        return userName;
      }
    } catch (err) {
      console.error("Failed to fetch user name:", err);
    }

    // Fallback: check in allUsers array
    const user = allUsers.find(u => u._id === userId);
    if (user && user.name) {
      const userName = user.name;
      setUserNames(prev => ({ ...prev, [userId]: userName }));
      return userName;
    }

    return "Unknown User";
  };

  // Enhanced function to fetch messages with proper name handling
  const fetchMessagesWithNames = async (messagesArray) => {
    const messagesWithNames = await Promise.all(
      messagesArray.map(async (msg) => {
        if (msg.senderName) {
          return msg; // Already has a name
        }
        
        if (msg.sender === "admin") {
          return { ...msg, senderName: "Administration" };
        }
        
        // Fetch sender name for non-admin messages
        const senderName = await fetchUserName(msg.sender);
        return { ...msg, senderName };
      })
    );
    
    return messagesWithNames;
  };

  // Fetch recipients with enhanced privacy filtering
  const fetchRecipients = async () => {
    try {
      setError(null);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/recipients/admin`
      );

      // Enhanced filtering for privacy - only show admin-related conversations
      const backendRecipients = res.data.filter(recipient => 
        recipient &&
        recipient._id &&
        recipient.name &&
        isAdminConversation(recipient)
      );

      // Merge with existing recipients, preserving search-added ones
      const existingRecipientsMap = new Map();
      recipients.forEach(recipient => {
        if (recipient && recipient._id && isAdminConversation(recipient)) {
          existingRecipientsMap.set(recipient._id, recipient);
        }
      });

      // Start with backend recipients
      const mergedRecipients = [...backendRecipients];
      
      // Add existing recipients that aren't in backend (like searched users)
      recipients.forEach(recipient => {
        if (recipient && recipient._id && isAdminConversation(recipient)) {
          const existsInBackend = backendRecipients.find(r => r._id === recipient._id);
          const existsInMerged = mergedRecipients.find(r => r._id === recipient._id);
          if (!existsInBackend && !existsInMerged) {
            mergedRecipients.push(recipient);
          }
        }
      });

      // Sort recipients: selected first, then by timestamp (newest first)
      const sortedRecipients = mergedRecipients.sort((a, b) => {
        if (!a || !b) return 0;
        
        // Selected recipient always goes to top
        if (a._id === selectedId) return -1;
        if (b._id === selectedId) return 1;
        
        // Then sort by timestamp (newest first)
        const timeA = new Date(a.timestamp || a.latestMessageTimestamp || a.createdAt || 0);
        const timeB = new Date(b.timestamp || b.latestMessageTimestamp || b.createdAt || 0);
        return timeB - timeA;
      });

      setRecipients(sortedRecipients);
    } catch (err) {
      console.error("Failed to fetch recipients:", err);
      setError("Failed to load conversations. Please try again.");
      setRecipients([]);
    }
  };

  // Fetch messages with privacy check and name handling
  const fetchMessagesWithoutLoading = async () => {
    if (!selectedId) return;
    
    try {
      setError(null);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/admin-conversation/${selectedId}`
      );
      
      // Filter messages to ensure only admin-related conversations
      const filteredMessages = (res.data || []).filter(msg => 
        msg && (msg.sender === "admin" || msg.receiver === "admin")
      );

      // Fetch names for all messages
      const messagesWithNames = await fetchMessagesWithNames(filteredMessages);
      
      setMessages(messagesWithNames);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setError("Failed to load messages. Please try again.");
      setMessages([]);
    }
  };

  // Fetch all users with privacy consideration
  const fetchAllUsers = async () => {
    try {
      setError(null);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/all/users`);

      let usersAndStaff = [];
      
      if (res.data && res.data.success) {
        usersAndStaff = res.data.users.filter(user => 
          user && !user.archived && user.role !== "admin"
        );
      } else {
        usersAndStaff = res.data.filter(user => 
          user && !user.archived && user.role !== "admin"
        );
      }

      setAllUsers(usersAndStaff);
    } catch (err) {
      console.error("Failed to fetch all users:", err);
      setError("Failed to load users. Please try again.");
      setAllUsers([]);
    }
  };

  const searchUsers = async (term) => {
    if (!term.trim()) {
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchDropdown(true);
    setSearchLoading(false);
  };

  // Handle selecting a user from search results
  const handleSearchSelect = (user) => {
    if (!user || !user._id) return;
    
    setSearchTerm("");
    setShowSearchDropdown(false);
    
    // Check if user already exists in recipients
    const existingRecipient = recipients.find(r => r && r._id === user._id);
    
    if (!existingRecipient) {
      // Create new recipient object with proper structure
      const newRecipient = {
        _id: user._id,
        name: user.name,
        type: user.role === "staff" ? "staff" : "user",
        email: user.email,
        department: user.department,
        latestMessage: "New conversation",
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      // Add to recipients and reorder
      const updatedRecipients = [newRecipient, ...recipients];
      setRecipients(updatedRecipients);
    }
    
    // Select the user and save to localStorage
    const recipientToSelect = existingRecipient || {
      _id: user._id,
      name: user.name,
      type: user.role === "staff" ? "staff" : "user"
    };
    
    handleSelectRecipient(recipientToSelect);
  };

  // Handle selecting a recipient from the list
  const handleSelectRecipient = (recipient) => {
    if (!recipient || !recipient._id) return;

    // Save selected recipient to localStorage
    localStorage.setItem("adminSelectedRecipient", JSON.stringify(recipient));
    
    // Update timestamp to move this conversation to top
    const updatedRecipients = recipients.map(r => {
      if (!r) return r;
      return r._id === recipient._id 
        ? { ...r, timestamp: new Date().toISOString() }
        : r;
    }).filter(r => r !== undefined);
    
    // Sort with selected recipient at top
    const sortedRecipients = updatedRecipients.sort((a, b) => {
      if (!a || !b) return 0;
      if (a._id === recipient._id) return -1;
      if (b._id === recipient._id) return 1;
      
      const timeA = new Date(a.timestamp || a.createdAt || 0);
      const timeB = new Date(b.timestamp || b.createdAt || 0);
      return timeB - timeA;
    });

    setRecipients(sortedRecipients);
    setSelectedId(recipient._id);
    setSelectedName(recipient.name);
    setSelectedType(getRecipientType(recipient));
    setShowSearchDropdown(false);
    setError(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send a new message with privacy enforcement
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId) return;

    const tempMsg = {
      _id: "temp-" + Date.now(),
      localId: Date.now(),
      sender: "admin", // Always from admin
      senderName: "Administration",
      receiver: selectedId,
      content: newMessage,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

    try {
      setError(null);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send`, {
        sender: "admin", // Ensure sender is always admin
        receiver: selectedId,
        content: newMessage
      });
      
      // Replace temporary message with real one
      setMessages(prev => prev.map(msg => 
        msg.localId === tempMsg.localId 
          ? { ...response.data, status: "sent" }
          : msg
      ));

      // Update or create recipient in the list
      const updatedRecipients = recipients.map(recipient => {
        if (!recipient) return recipient;
        return recipient._id === selectedId
          ? { 
              ...recipient, 
              timestamp: new Date().toISOString(),
              latestMessage: newMessage,
              latestMessageTimestamp: new Date().toISOString()
            }
          : recipient;
      }).filter(r => r !== undefined);

      // If recipient doesn't exist in the list, create it
      if (!updatedRecipients.find(r => r._id === selectedId)) {
        const newRecipient = {
          _id: selectedId,
          name: selectedName,
          type: selectedType,
          latestMessage: newMessage,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        updatedRecipients.unshift(newRecipient);
      }

      // Sort with current recipient at top
      const sortedRecipients = updatedRecipients.sort((a, b) => {
        if (!a || !b) return 0;
        if (a._id === selectedId) return -1;
        if (b._id === selectedId) return 1;
        
        const timeA = new Date(a.timestamp || a.createdAt || 0);
        const timeB = new Date(b.timestamp || b.createdAt || 0);
        return timeB - timeA;
      });

      setRecipients(sortedRecipients);
      
      // Update localStorage with current recipient
      const currentRecipient = sortedRecipients.find(r => r._id === selectedId);
      if (currentRecipient) {
        localStorage.setItem("adminSelectedRecipient", JSON.stringify(currentRecipient));
      }

    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
      setMessages(prev => prev.map(msg => 
        msg.localId === tempMsg.localId 
          ? { ...msg, status: "failed" }
          : msg
      ));
    }
  };

  // Format time to match StaffMessages
  const formatTime = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return "";
    }
  };

  // Format date to match StaffMessages
  const formatDate = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString();
    } catch (error) {
      return "";
    }
  };

  // Group messages by date like StaffMessages
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      // Additional privacy check for displayed messages
      if (!msg || !(msg.sender === "admin" || msg.receiver === "admin")) {
        return; // Skip non-admin messages
      }
      
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

  const getAvatar = (name, type = "user") => {
    return (
      <div className="w-10 h-10 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
        {name ? name.charAt(0).toUpperCase() : "U"}
      </div>
    );
  };

  const getRecipientType = (recipient) => {
    return recipient.type || "user";
  };

  const filteredSearchResults = allUsers.filter(user =>
    user && (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 5);

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminMessage" onLogout={onLogout} />
      
<div className="ml-[250px] h-screen flex flex-col bg-gray-50">        {/* HEADER */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">Admin Message Center</h1>
          <p className="text-gray-600">Communicate with users and staff</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversations Sidebar - ALWAYS VISIBLE */}
          <div className="w-80 bg-white border-r border-gray-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-600">Admin Conversations</h2>
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-3" ref={searchRef}>
                <input
                  type="text"
                  placeholder="Search users or staff..."
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent text-sm"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  onFocus={() => searchTerm && setShowSearchDropdown(true)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Search Dropdown */}
                {showSearchDropdown && searchTerm && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-3 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#CC0000] mx-auto"></div>
                        <span className="text-sm ml-2">Searching...</span>
                      </div>
                    ) : filteredSearchResults.length > 0 ? (
                      filteredSearchResults.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => handleSearchSelect(user)}
                          className="w-full flex items-center p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {getAvatar(user.name, user.role === "staff" ? "staff" : "user")}
                          <div className="ml-3 text-left">
                            <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">
                              {user.role === "staff" ? "Staff" : "User"}
                              {user.department && ` • ${user.department}`}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500 text-sm">
                        No users found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {recipients.filter(r => r !== undefined).length === 0 ? (
                <div className="text-center p-6 text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="font-medium text-sm">No admin conversations found</p>
                  <p className="text-xs mt-1">{searchTerm ? "Try different search terms" : "Start a conversation with a user or staff"}</p>
                </div>
              ) : (
                recipients.filter(r => r !== undefined).map((recipient) => (
                  <button
                    key={recipient._id}
                    onClick={() => handleSelectRecipient(recipient)}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-all duration-200 cursor-pointer ${
                      selectedId === recipient._id 
                        ? 'bg-gradient-to-r from-red-50 to-yellow-50 border-2 border-red-200 shadow' 
                        : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getAvatar(recipient.name, getRecipientType(recipient))}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800 text-sm truncate">
                              {recipient.name}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {recipient.latestMessage || "Start a conversation..."}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {recipient.timestamp ? formatTime(recipient.timestamp) : 'No messages'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedId ? (
              <>
                <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getAvatar(selectedName, selectedType)}
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{selectedName}</h3>
                        <p className="text-sm text-gray-600">
                          {selectedType === "staff" ? "Staff Member" : "User"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto bg-gradient-to-b from-red-50/30 to-yellow-50/20"
                >
                  <div className="p-4">
                    {messages.length === 0 ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-center text-gray-500">
                          <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
                          <p className="text-gray-600 text-sm">Start the conversation with {selectedName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-full mx-auto space-y-4">
                        {Object.entries(messageGroups).map(([date, dateMessages]) => (
                          <div key={date}>
                            <div className="flex justify-center mb-3">
                              <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                {date}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {dateMessages.map(msg => (
                                <div key={msg._id || msg.localId} className={`flex ${msg.sender === "admin" ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[75%] rounded-lg p-3 shadow transition-all duration-200 ${
                                    msg.sender === "admin" 
                                      ? 'bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-br-md' 
                                      : 'bg-white border border-gray-200 rounded-bl-md'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-semibold">
                                        {msg.sender === "admin" ? "Administration" : `${msg.senderName}`}
                                      </div>
                                      {msg.status === "sending" && (
                                        <div className="text-xs opacity-80 animate-pulse flex items-center">
                                          <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
                                          Sending...
                                        </div>
                                      )}
                                      {msg.status === "failed" && (
                                        <div className="text-xs opacity-80 text-red-200 flex items-center">
                                          Failed
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                                    <div className={`text-xs mt-1 text-right ${
                                      msg.sender === "admin" ? 'text-red-100' : 'text-gray-500'
                                    }`}>
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

                <div className="bg-white p-4 border-t border-gray-200 shadow-lg">
                  <div className="max-w-full mx-auto">
                    <div className="flex space-x-2">
                      <textarea
                        placeholder={`Send a Message`}
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent text-sm shadow-sm resize-none"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        rows={1}
                        style={{ minHeight: '50px', maxHeight: '120px' }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-lg px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-semibold shadow flex items-center space-x-1 text-sm cursor-pointer"
                      >
                        <span>Send</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      Sending as <strong className="text-[#CC0000]">Administration</strong>
                      
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-red-50/50 to-yellow-50/50">
                <div className="text-center text-gray-500">
                  <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-xl font-semibold mb-2">Select a Conversation</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Choose a user or staff member from the list to start messaging.
                    <br />
                    <span className="text-sm text-gray-500">(Only admin-related conversations are shown)</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminMessages;