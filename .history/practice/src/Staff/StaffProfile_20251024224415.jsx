import React, { useEffect, useState } from "react";
import api from "../utils/api";

function StaffProfile({ staff, setView }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const fetchStaff = async () => {
    if (!staff?._id) return;
    try {
      const { data } = await api.get(`/users/${staff._id}`);
      setProfile(data.user ?? data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch staff profile:", err);
      setError("Failed to load profile. Please refresh the page.");
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [staff?._id]);

  useEffect(() => {
    if (error || successMsg) {
      setToastVisible(true);
      const timer = setTimeout(() => setToastVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [error, successMsg]);

  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      await api.put(`/users/change-password/${staff._id}`, {
        oldPassword,
        newPassword,
      });
      setSuccessMsg("Password changed successfully.");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordModal(false);
    } catch (err) {
      console.error("Password change error:", err);
      setError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordModal = () => {
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setError("");
    setSuccessMsg("");
    setShowPasswordModal(false);
  };

  if (error && !profile) {
    return (
      <div className="ml-[250px] w-[calc(100%-250px)] h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchStaff}
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
      <main className="ml-[250px] w-[calc(100%-250px)] h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <header className="text-black px-6 h-[60px] flex items-center justify-between shadow-sm">
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">Staff Profile</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-6">
              <div className="w-20 h-20 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="flex space-x-2">
                  <div className="h-4 bg-gray-100 rounded w-24"></div>
                  <div className="h-4 bg-gray-100 rounded w-20"></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="h-5 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-100 rounded w-24 mb-2"></div>
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

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">Profile</h1>
              <p className="text-gray-600">View and manage all system users</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Centered Profile Container */}
          <div className="flex justify-center">
            <div className="w-full max-w-4xl space-y-8">
              
              {/* Profile Overview Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                <div className="relative flex-shrink-0">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-600 text-4xl font-bold">
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
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                    {isVerified ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {profile.name}
                  </h2>

                  <p className="text-gray-500 flex items-center justify-center md:justify-start mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2 text-gray-400"
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
                    {profile.email}
                  </p>

                  <div className="flex items-center justify-center md:justify-start flex-wrap gap-2 mt-2">
                    <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm capitalize">
                      {profile.role}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
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

              {/* Staff Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-8 py-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Staff Information
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 px-4 rounded-lg font-medium transition-all flex items-center shadow-sm hover:shadow-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Change Password
                    </button>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Full Name" value={profile.name} icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    } />
                    <Field label="Email" value={profile.email} icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    } />
                    <Field label="ID Number" value={profile.id_number} icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    } />
                    <Field label="Floor Assignment" value={profile.floor} icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    } />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full animate-scale-in">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </h3>
            </div>

            <div className="p-6">
              {toastVisible && (error || successMsg) && (
                <div className="mb-4 animate-slide-up">
                  <div
                    className={`w-full text-center py-2 px-3 rounded-lg font-medium text-white ${
                      error ? "bg-red-600" : "bg-green-600"
                    }`}
                  >
                    {error || successMsg}
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                <div className="space-y-4">
                  <Input
                    label="Old Password"
                    name="oldPassword"
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <Input
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetPasswordModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2.5 px-6 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center shadow-sm hover:shadow-md"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Input Component for Password Form
function Input({ label, name, type = "text", value, onChange, required = false, disabled = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// Field Component for Profile Information
function Field({ label, value, icon }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
      <label className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide flex items-center">
        {icon}
        <span className="ml-1.5">{label}</span>
      </label>
      <div className="p-2">
        <p className={value ? "text-gray-800 font-medium" : "text-gray-400 italic"}>
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

export default StaffProfile;