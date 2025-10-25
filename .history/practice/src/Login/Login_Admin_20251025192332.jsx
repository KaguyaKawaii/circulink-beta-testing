import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Mail, RotateCcw, Shield, Lock } from "lucide-react";
import Logo from "../assets/logo.png";

function Login_Admin({ onAdminLoginSuccess, onBackToUserLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [lockUntil, setLockUntil] = useState(null);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Check maintenance mode on component mount
  useEffect(() => {
    checkMaintenanceMode();
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const checkMaintenanceMode = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/system/maintenance-status`);
      const data = await response.json();
      if (data.success) {
        setMaintenanceMode(data.maintenanceMode);
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username || !password) {
      setError("Please enter both username and password.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 423) {
          // Account locked
          setLockUntil(Date.now() + (data.remainingTime * 60 * 1000));
          setError(data.message);
        } else {
          setError(data.message || "Login failed. Please try again.");
          setRemainingAttempts(data.remainingAttempts || 0);
        }
        setLoading(false);
        return;
      }

      // OTP required
      if (data.requiresOTP) {
        setRequiresOTP(true);
        setAdminId(data.adminId);
        setAdminEmail(data.email);
        setOtpCountdown(60); // 60 seconds countdown for resend
        setError("");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerification = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid OTP. Please try again.");
        setLoading(false);
        return;
      }

      // Success: bubble admin object up to parent
      onAdminLoginSuccess(data.admin);
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("Server error. Please try again later.");
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to resend OTP.");
      } else {
        setOtpCountdown(60);
        setError("New OTP sent to your email.");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetLogin = () => {
    setRequiresOTP(false);
    setOtp("");
    setError("");
    setLockUntil(null);
  };

  const handleBackToUserLogin = () => {
    if (!maintenanceMode) {
      onBackToUserLogin();
    }
  };

  // Check if account is still locked
  if (lockUntil && lockUntil > Date.now()) {
    const remainingMinutes = Math.ceil((lockUntil - Date.now()) / 1000 / 60);
    return (
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-700/50">
            <Lock className="text-red-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Account Locked</h2>
          <p className="text-gray-300 text-base mb-4">
            Your account has been temporarily locked due to too many failed login attempts.
          </p>
          <p className="text-gray-400 mb-6">
            Please try again in <strong className="text-amber-400">{remainingMinutes} minute{remainingMinutes > 1 ? 's' : ''}</strong>.
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleBackToUserLogin}
              disabled={maintenanceMode}
              className={`px-6 py-3 rounded-lg transition-all duration-300 ${
                maintenanceMode 
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                  : "bg-gray-700 hover:bg-gray-600 text-white cursor-pointer"
              }`}
            >
              {maintenanceMode ? "Maintenance Mode Active" : "Back to User Login"}
            </button>
          </div>
          {maintenanceMode && (
            <p className="text-center text-amber-400 text-sm mt-3">
              User login is currently unavailable during maintenance.
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-gray-900/90 p-8 rounded-2xl flex flex-col items-center border border-amber-500/30">
            <div className="relative">
              <Loader2 size={64} className="text-amber-500 animate-spin mb-4" />
            </div>
            <p className="text-gray-300 text-lg font-semibold mt-2">
              {requiresOTP ? "Verifying OTP..." : "Authenticating..."}
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={Logo} 
              alt="University of San Agustin Logo" 
              className="h-20 w-20 filter brightness-125"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">University of San Agustin</h1>
          <h2 className="text-xl font-bold text-amber-400 mb-3">Learning Resource Center</h2>
          <div className="bg-gradient-to-r from-red-600/20 to-amber-600/20 inline-block px-4 py-2 rounded-full border border-amber-500/30">
            <p className="text-amber-300 font-semibold text-sm">Admin Portal</p>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {requiresOTP ? "Verify OTP" : "Admin Login"}
            </h2>
            <p className="text-gray-400 text-sm">
              {requiresOTP 
                ? "Enter the 6-digit code sent to your email" 
                : "Restricted access for authorized personnel only"
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border-l-4 border-red-500 text-red-200 p-4 rounded-lg mb-6 animate-fade-in-down">
              <p className="font-bold flex items-center gap-2 text-sm">
                <Shield size={16} />
                Authentication Error
              </p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {requiresOTP ? (
            // OTP Verification Form
            <form onSubmit={handleOTPVerification} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-700/30">
                  <Mail size={32} className="text-amber-400" />
                </div>
                <p className="text-gray-300 text-sm">
                  OTP sent to: <strong className="text-amber-300">{adminEmail}</strong>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Check your email for the 6-digit verification code
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Verification Code</label>
                <input
                  className="w-full border border-gray-600 bg-gray-800/50 p-4 rounded-xl text-center text-2xl font-mono tracking-widest text-white placeholder-gray-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  type="text"
                  placeholder="000000"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={resetLogin}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold text-white cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 font-semibold text-white cursor-pointer transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify OTP
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={otpCountdown > 0 || loading}
                  className="flex items-center justify-center gap-2 text-amber-400 hover:text-amber-300 font-medium cursor-pointer transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed mx-auto text-sm"
                >
                  <RotateCcw size={16} />
                  {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          ) : (
            // Login Form
            <form onSubmit={handleAdminLogin} className="space-y-6">
              {remainingAttempts > 0 && remainingAttempts < 5 && (
                <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
                  <p className="text-amber-200 text-sm">
                    <strong>Warning:</strong> {remainingAttempts} attempt{remainingAttempts > 1 ? 's' : ''} remaining before account lock.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Admin Username</label>
                <input
                  className="w-full border border-gray-600 bg-gray-800/50 p-4 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-amber-500"
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <div className="relative">
                  <input
                    className="w-full border border-gray-600 bg-gray-800/50 p-4 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-amber-500 pr-12"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-400 transition-colors duration-200"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 font-semibold text-white cursor-pointer transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Authenticating..." : "Login to Admin Portal"}
              </button>
            </form>
          )}

          {!requiresOTP && (
            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <button
                onClick={handleBackToUserLogin}
                disabled={maintenanceMode || loading}
                className={`font-medium transition-colors duration-300 text-sm ${
                  maintenanceMode 
                    ? "text-gray-500 cursor-not-allowed" 
                    : "text-amber-400 hover:text-amber-300 cursor-pointer"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {maintenanceMode ? "User Login Unavailable (Maintenance)" : "← Back to User Login"}
              </button>
              {maintenanceMode && (
                <p className="text-xs text-amber-400 mt-2">
                  Regular user login is temporarily disabled during system maintenance.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} University of San Agustin. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out;
        }
      `}</style>
    </main>
  );
}

export default Login_Admin;