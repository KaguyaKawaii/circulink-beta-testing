import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Mail, RotateCcw, Shield, Lock, ArrowLeft } from "lucide-react";
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
    if (onBackToUserLogin) {
      onBackToUserLogin();
    }
  };

  // Check if account is still locked
  if (lockUntil && lockUntil > Date.now()) {
    const remainingMinutes = Math.ceil((lockUntil - Date.now()) / 1000 / 60);
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="text-red-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Account Locked</h2>
            <p className="text-gray-600 text-base mb-4">
              Your account has been temporarily locked due to multiple failed login attempts.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 font-medium">
                Try again in <span className="font-bold">{remainingMinutes} minute{remainingMinutes > 1 ? 's' : ''}</span>
              </p>
            </div>
            <button
              onClick={resetLogin}
              className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors duration-300"
            >
              Return to Login
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={handleBackToUserLogin}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-300"
            >
              <ArrowLeft size={16} />
              Back to User Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-gray-200">
            <div className="relative">
              <Loader2 size={64} className="text-blue-600 animate-spin mb-4" />
            </div>
            <p className="text-gray-700 text-lg font-semibold mt-2">
              {requiresOTP ? "Verifying OTP..." : "Authenticating..."}
            </p>
            <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md mx-auto">
        {/* Back to User Login Button */}
        <div className="mb-6">
          <button
            onClick={handleBackToUserLogin}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-300 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to User Login
          </button>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={Logo} 
                alt="University of San Agustin Logo" 
                className="h-20 w-20 bg-white/20 p-3 rounded-full"
              />
            </div>
            <h1 className="text-2xl font-bold mb-2">University of San Agustin</h1>
            <h2 className="text-xl font-semibold mb-3">Learning Resource Center</h2>
            <div className="bg-white/20 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
              <p className="text-white font-semibold text-sm">Admin Portal</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {requiresOTP ? "Verify Identity" : "Admin Login"}
              </h2>
              <p className="text-gray-600 text-sm">
                {requiresOTP 
                  ? "Enter the verification code sent to your email" 
                  : "Restricted access for authorized personnel only"
                }
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 animate-fade-in">
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
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={32} className="text-blue-600" />
                  </div>
                  <p className="text-gray-700 text-sm">
                    Verification code sent to:
                  </p>
                  <p className="text-blue-600 font-semibold mt-1">{adminEmail}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Verification Code</label>
                  <input
                    className="w-full border border-gray-300 bg-gray-50 p-4 rounded-xl text-center text-2xl font-mono tracking-widest text-gray-800 placeholder-gray-400 transition-all duration-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                    className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-semibold text-white transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verify Code
                  </button>
                </div>

                <div className="text-center pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={otpCountdown > 0 || loading}
                    className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed mx-auto text-sm"
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
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-700 text-sm">
                      <strong className="font-semibold">Security Notice:</strong> {remainingAttempts} attempt{remainingAttempts > 1 ? 's' : ''} remaining before account lock.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Admin Username</label>
                  <input
                    className="w-full border border-gray-300 bg-gray-50 p-4 rounded-xl text-gray-800 placeholder-gray-500 focus:border-blue-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-blue-200"
                    type="text"
                    placeholder="Enter admin username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      className="w-full border border-gray-300 bg-gray-50 p-4 rounded-xl text-gray-800 placeholder-gray-500 focus:border-blue-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-blue-200 pr-12"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-200 p-1"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-semibold text-white transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Authenticating..." : "Login to Admin Portal"}
                </button>

                {maintenanceMode && (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                    <p className="text-gray-700 text-sm">
                      <strong className="font-semibold">System Notice:</strong> Maintenance mode is active
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="mb-4">
            <button
              onClick={handleBackToUserLogin}
              className="text-gray-600 hover:text-gray-800 transition-colors duration-300 text-sm font-medium"
            >
              ← Return to User Login
            </button>
          </div>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} University of San Agustin. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            For authorized administrative use only
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}

export default Login_Admin;