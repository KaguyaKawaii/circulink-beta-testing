// Admin/Login_Admin.jsx
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Mail, RotateCcw, Shield, Lock, ArrowLeft } from "lucide-react";
import { io } from "socket.io-client";
import api from "../utils/api"; // Import the api utility
import Logo from "../assets/logo.png";
import Logo2 from "../assets/logo2.png";
import Logo3 from "../assets/logo3.png";

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
  const [socket, setSocket] = useState(null);
  
  // Get API URL from api utility's baseURL
  const API_URL = api.defaults.baseURL;

  // Initialize Socket.IO with correct path
  useEffect(() => {
    console.log("Attempting to connect to Socket.IO at:", API_URL);
    
    const newSocket = io(API_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
      path: '/socket.io/',
      rejectUnauthorized: false
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully with ID:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    newSocket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('connected', (data) => {
      console.log('Received connected event:', data);
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
      }
    };
  }, [API_URL]);

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
      // Using api utility - note the path starts with /api
      const response = await api.get('/api/system/maintenance-status');
      console.log('Maintenance mode check:', response.data);
      
      if (response.data.success) {
        setMaintenanceMode(response.data.maintenanceMode);
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      // Don't show error to user, just log it
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
      // Using api utility - note the path starts with /api
      console.log('Attempting login with:', { username });
      
      const response = await api.post('/api/admin/login', { 
        username, 
        password 
      });

      console.log('Login response:', response.data);

      // OTP required
      if (response.data.requiresOTP) {
        setRequiresOTP(true);
        setAdminId(response.data.adminId);
        setAdminEmail(response.data.email);
        setOtpCountdown(60);
        setError("");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 423) {
          // Account locked
          setLockUntil(Date.now() + (err.response.data.remainingTime * 60 * 1000));
          setError(err.response.data.message);
        } else {
          setError(err.response.data.message || "Login failed. Please try again.");
          setRemainingAttempts(err.response.data.remainingAttempts || 0);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError("No response from server. Please check your connection.");
      } else {
        // Something happened in setting up the request that triggered an Error
        setError("An error occurred. Please try again.");
      }
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
      const response = await api.post('/api/admin/verify-otp', {
        adminId,
        otp
      });

      console.log('OTP verification response:', response.data);

      // Success: bubble admin object up to parent
      onAdminLoginSuccess(response.data.admin);
    } catch (err) {
      console.error("OTP verification error:", err);
      
      if (err.response) {
        setError(err.response.data.message || "Invalid OTP. Please try again.");
      } else if (err.request) {
        setError("No response from server. Please check your connection.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await api.post('/api/admin/resend-otp', {
        adminId
      });

      console.log('Resend OTP response:', response.data);
      
      setOtpCountdown(60);
      setError("New OTP sent to your email.");
    } catch (err) {
      console.error("Resend OTP error:", err);
      
      if (err.response) {
        setError(err.response.data.message || "Failed to resend OTP.");
      } else if (err.request) {
        setError("No response from server. Please check your connection.");
      } else {
        setError("Failed to resend OTP. Please try again.");
      }
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
    if (onBackToUserLogin) {
      onBackToUserLogin();
    }
  };

  // Check if account is still locked
  if (lockUntil && lockUntil > Date.now()) {
    const remainingMinutes = Math.ceil((lockUntil - Date.now()) / 1000 / 60);
    return (
      <main className="min-h-screen bg-[#1e1e1e] flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-900 via-red-800 to-red-900 p-12 flex-col justify-center items-center text-center relative">
          <div className="absolute top-8 left-8">
            <button
              onClick={handleBackToUserLogin}
              className="inline-flex items-center gap-2 text-red-100 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform cursor-pointer" />
              Back to User Login
            </button>
          </div>
          
          <div className="max-w-lg">
            <div className="mb-10 flex justify-center gap-6">
              <img 
                src={Logo} 
                alt="University of San Agustin Logo" 
                className="h-40 w-40 bg-white/10 p-6 rounded-full backdrop-blur-sm mx-auto"
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">University of San Agustin</h1>
            <h2 className="text-2xl font-semibold text-white mb-8">Learning Resource Center</h2>
            <div className="bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full mb-12 inline-block">
              <p className="text-white font-semibold text-lg">Admin Portal</p>
            </div>
            
            <div className="mt-12">
              <div className="w-32 h-32 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-800/50">
                <Lock className="text-red-300" size={60} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Account Locked</h3>
              <p className="text-red-100 text-lg mb-6">
                Your account has been temporarily locked due to multiple failed login attempts.
              </p>
              <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-6 mb-8 max-w-md mx-auto">
                <p className="text-red-200 font-medium text-lg">
                  Try again in <span className="font-bold text-white">{remainingMinutes} minute{remainingMinutes > 1 ? 's' : ''}</span>
                </p>
              </div>
              <button
                onClick={resetLogin}
                className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all duration-300 border border-white/20 backdrop-blur-sm"
              >
                Return to Login
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-8">
            <p className="text-red-100/70 text-sm">© {new Date().getFullYear()} University of San Agustin</p>
          </div>
        </div>

        {/* Right Side - Locked Message (Mobile/Tablet) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md lg:hidden">
            <div className="mb-8">
              <button
                onClick={handleBackToUserLogin}
                className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors duration-300 cursor-pointer"
              >
                <ArrowLeft size={18} />
                Back to User Login
              </button>
            </div>
            
            <div className="text-center">
              <div className="w-24 h-24 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-800/50">
                <Lock className="text-red-400" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Account Locked</h2>
              <p className="text-gray-300 text-base mb-6">
                Your account has been temporarily locked due to multiple failed login attempts.
              </p>
              <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 mb-8">
                <p className="text-red-300 font-medium">
                  Try again in <span className="font-bold text-white">{remainingMinutes} minute{remainingMinutes > 1 ? 's' : ''}</span>
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <button
                  onClick={resetLogin}
                  className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold transition-colors duration-300 border border-gray-700"
                >
                  Return to Login
                </button>
                <button
                  onClick={handleBackToUserLogin}
                  className="w-full py-3 rounded-xl bg-transparent hover:bg-gray-800 text-gray-400 hover:text-gray-200 font-semibold transition-colors duration-300 border border-gray-700 cursor-pointer"
                >
                  Back to User Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1e1e1e] flex">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1e1e1e]/95 backdrop-blur-sm">
          <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-red-700/50">
            <div className="relative">
              <Loader2 size={64} className="text-red-500 animate-spin mb-4" />
            </div>
            <p className="text-gray-200 text-lg font-semibold mt-2">
              {requiresOTP ? "Verifying OTP..." : "Authenticating..."}
            </p>
            <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
          </div>
        </div>
      )}

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#343434] p-12 flex-col justify-center items-center text-center relative">
        <div className="absolute top-8 left-8">
          <button
            onClick={handleBackToUserLogin}
            className="inline-flex items-center gap-2 text-white hover:text-white transition-colors duration-300 group cursor-pointer"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform cursor-pointer" />
            Back to User Login
          </button>
        </div>
        
        <div className="max-w-lg">
          <div className="mb-10 flex  justify-center gap-6">
            <img 
              src={Logo} 
              alt="University of San Agustin Logo" 
              className="h-40 w-40  p-6 backdrop-blur-sm mx-auto"
            />
            <img 
              src={Logo2} 
              alt="University of San Agustin Logo" 
              className="h-40 w-40  p-6 backdrop-blur-sm mx-auto"
            />
            <img 
              src={Logo3} 
              alt="University of San Agustin Logo" 
              className="h-40 w-40  p-6 backdrop-blur-sm mx-auto"
            />
            
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">University of San Agustin</h1>
          <h1 className="text-4xl font-bold text-yellow-500 mb-4 border-t border-gray-700 pt-5">Circulink</h1>
          <h2 className="text-2xl font-semibold text-white mb-8">Learning Resource Center</h2>
          <div className="bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full mb-12 inline-block">
            <p className="text-white font-semibold text-lg">Admin Portal</p>
          </div>
          
          
          <div className="mt-8">
            <p className="text-white text-lg mb-6">Secure Administrative Access Portal</p>
            
              
            <p className="text-white/60 text-sm">
              For authorized administrative personnel only. All access is logged and monitored.
            </p>
          </div>
        </div>
        
        <div className="absolute bottom-8">
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} University of San Agustin</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Back Button - Mobile */}
          <div className="mb-6 lg:hidden">
            <button
              onClick={handleBackToUserLogin}
              className="inline-flex items-center gap-2 text-white hover:text-gray-200 transition-colors duration-300 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Back to User Login
            </button>
          </div>

          {/* Form Header */}
          <div className="text-left mb-8">
            <div className="flex items-center gap-3 mb-4">
              
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {requiresOTP ? "Verify Identity" : "Admin Login"}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {requiresOTP 
                    ? "Enter the verification code sent to your email" 
                    : "Restricted access for authorized personnel only"
                  }
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800/50 text-red-200 p-4 rounded-lg mb-6 animate-fade-in">
              <p className="font-bold flex items-center gap-2 text-sm">
                <Shield size={16} />
                Authentication Required
              </p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {requiresOTP ? (
            // OTP Verification Form
            <form onSubmit={handleOTPVerification} className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-800/50">
                  <Mail size={36} className="text-red-400" />
                </div>
                <p className="text-gray-300 text-sm">
                  Verification code sent to:
                </p>
                <p className="text-red-300 font-semibold mt-1 text-lg">{adminEmail}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Verification Code</label>
                <input
                  className="w-full border border-gray-700 bg-[#1e1e1e] p-4 rounded-xl text-center text-2xl font-mono tracking-widest text-white placeholder-gray-600 transition-all duration-300 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-900"
                  type="text"
                  placeholder="000000"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={resetLogin}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold text-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-semibold text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify Code
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={otpCountdown > 0 || loading}
                  className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 font-medium transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed mx-auto text-sm"
                >
                  <RotateCcw size={16} />
                  {otpCountdown > 0 ? `Resend code in ${otpCountdown}s` : "Resend verification code"}
                </button>
              </div>
            </form>
          ) : (
            // Login Form
            <form onSubmit={handleAdminLogin} className="space-y-6">
              {remainingAttempts > 0 && remainingAttempts < 5 && (
                <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4">
                  <p className="text-amber-200 text-sm">
                    <strong className="font-semibold">Security Notice:</strong> {remainingAttempts} attempt{remainingAttempts > 1 ? 's' : ''} remaining before account lock.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Admin Username</label>
                <input
                  className="w-full border border-gray-700 bg-[#1e1e1e] p-4 rounded-xl text-white placeholder-gray-600 focus:border-red-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-red-900"
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <div className="relative">
                  <input
                    className="w-full border border-gray-700 bg-[#1e1e1e] p-4 rounded-xl text-white placeholder-gray-600 focus:border-red-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-red-900 pr-12"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-400 transition-colors duration-200 p-1"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-semibold text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? "Authenticating..." : "Login to Admin Portal"}
              </button>

              {maintenanceMode && (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
                  <p className="text-gray-300 text-sm">
                    <strong className="font-semibold">System Notice:</strong> Maintenance mode is active
                  </p>
                </div>
              )}
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs text-gray-600">
                  © {new Date().getFullYear()} University of San Agustin
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  For authorized administrative use only
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Version 1.0.0</p>
                <p className="text-xs text-gray-700 mt-1">Secure Admin Portal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Login_Admin;