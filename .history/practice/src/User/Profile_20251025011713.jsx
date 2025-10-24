import React, { useEffect, useState } from "react";
import socket from "../utils/socket";
import api from "../utils/api";

function Profile({ user, setView }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  const fetchUser = async () => {
    if (!user?._id) return;
    try {
      const { data } = await api.get(`/users/${user._id}`);
      setProfile(data.user ?? data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      setError("Failed to load profile. Please refresh the page.");
    }
  };

  useEffect(() => {
    fetchUser();
  }, [user?._id]);

  useEffect(() => {
    const handler = (updatedId) => {
      if (updatedId === user?._id) fetchUser();
    };
    socket.on("user-updated", handler);
    return () => socket.off("user-updated", handler);
  }, [user?._id]);

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 lg:ml-[250px] lg:w-[calc(100%-250px)]">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 max-w-md w-full mx-4 text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">{error}</p>
          <button 
            onClick={fetchUser}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <main className="w-full min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 lg:ml-[250px] lg:w-[calc(100%-250px)]">
        <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">Profile</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-pulse">
            {/* Profile Overview Skeleton */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                <div className="h-5 bg-gray-200 rounded w-1/2 mx-auto sm:mx-0"></div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center sm:justify-start">
                  <div className="h-4 bg-gray-100 rounded w-24 mx-auto sm:mx-0"></div>
                  <div className="h-4 bg-gray-100 rounded w-20 mx-auto sm:mx-0"></div>
                </div>
              </div>
            </div>
            
            {/* Info Card Skeleton */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-100 rounded w-20 sm:w-24 mb-2"></div>
                    <div className="h-10 bg-gray-50 rounded border border-gray-200"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isVerified = Boolean(profile.verified);

  // Format role for display - change "Staff_Office" to "Staff"
  const getDisplayRole = (role) => {
    if (role === "Staff_Office") {
      return "Staff";
    }
    return role;
  };

  return (
    <main className="w-full min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 lg:ml-[250px] lg:w-[calc(100%-250px)]">
      {/* Header */}
      <header className="text-black px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between border-b border-gray-200 bg-white">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">Profile</h1>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Profile Overview Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 lg:gap-8">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full border-2 sm:border-4 border-white shadow-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-600 text-2xl sm:text-3xl lg:text-4xl font-bold">
                {profile.profilePicture ? (
                  <img
                    src={
                      profile.profilePicture.startsWith("http")
                        ? profile.profilePicture
                        : `http://localhost:5000${profile.profilePicture}`
                    }
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                ) : (
                  profile.name?.charAt(0)?.toUpperCase() || "?"
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 sm:p-1 shadow-md">
                {isVerified ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              {/* Name */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
                {profile.name}
              </h2>

              {/* Email */}
              <p className="text-gray-500 flex items-center justify-center sm:justify-start mb-3 text-sm sm:text-base">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="truncate">{profile.email}</span>
              </p>

              {/* Role + Verified */}
              <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2 mt-2">
                <span className="text-gray-600 bg-gray-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm capitalize">
                  {getDisplayRole(profile.role)}
                </span>
                <span
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                    isVerified
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isVerified ? "Verified" : "Not Verified"}
                </span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center justify-center sm:justify-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Account Information
                </h3>
                <button
                  onClick={() => setView("editProfile")}
                  className="text-xs sm:text-sm text-gray-600 hover:text-red-500 font-medium transition-all duration-200 flex items-center justify-center cursor-pointer px-2 sm:px-3 py-1.5 w-full sm:w-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Field label="Full Name" value={profile.name} icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                } />
                <Field label="Email" value={profile.email} icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                } />
                <Field label="ID Number" value={profile.id_number} icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                } />
                <Field label="Department" value={profile.department} icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                } />
                {profile.role === "Student" && (
                  <>
                    <Field label="Course" value={profile.course} icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                    } />
                    <Field label="Year Level" value={profile.year_level} icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                    } />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, icon }) {
  return (
    <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
      <label className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide flex items-center">
        {icon}
        <span className="ml-1.5 truncate">{label}</span>
      </label>
      <div className="p-1 sm:p-2">
        <p className={`text-sm sm:text-base ${value ? "text-gray-800 font-medium" : "text-gray-400 italic"} break-words`}>
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

export default Profile;