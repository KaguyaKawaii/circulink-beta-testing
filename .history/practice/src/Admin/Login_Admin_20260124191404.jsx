import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Mail, RotateCcw, Shield, Lock, ArrowLeft, Key, User, AlertTriangle } from "lucide-react";
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
  const [activeStep, setActiveStep] = useState(1); // 1: Login, 2: OTP

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

  useEffect(() => {
    if (requiresOTP) {
      setActiveStep(2);
    } else {
      setActiveStep(1);
    }
  }, [requiresOTP]);

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
    setActiveStep(1);
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
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl flex bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
          {/* Left Section - Branding */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-900/20 to-gray-900 p-12 flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
            <div className="relative z-10 text-center">
              <div className="w-32 h-32 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-800/50 backdrop-blur-sm">
                <Lock className="text-red-400" size={60} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Account Locked</h1>
              <p className="text-gray-300 text-lg">Security measures have been activated</p>
            </div>
          </div>

          {/* Right Section - Content */}
          <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/20 rounded-full mb-6 border border-red-800/50">
                <AlertTriangle className="text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Temporary Account Restriction</h2>
              <p className="text-gray-400 mb-6">
                Due to multiple failed login attempts, your account has been temporarily secured.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-400 mb-2">{remainingMinutes}</div>
                  <div className="text-gray-400 text-sm">MINUTES REMAINING</div>
                </div>
              </div>
              <p className="text-gray-300 text-center">
                Your access will be restored automatically after the security cooldown period.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={resetLogin}
                className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold transition-all duration-300 border border-gray-700"
              >
                Return to Login
              </button>
              <button
                onClick={handleBackToUserLogin}
                className="w-full py-3 rounded-xl bg-red-900/20 hover:bg-red-900/30 text-red-300 font-semibold transition-all duration-300 border border-red-900/30 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Back to User Login
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-sm">
          <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-red-800/50">
            <div className="relative">
              <Loader2 size={64} className="text-red-500 animate-spin mb-4" />
            </div>
            <p className="text-gray-200 text-lg font-semibold mt-2">
              {requiresOTP ? "Verifying Security Code..." : "Authenticating..."}
            </p>
            <p className="text-gray-400 text-sm mt-2">Please wait while we secure your access</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${activeStep >= 1 ? 'text-red-500' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep >= 1 ? 'bg-red-900/30 border border-red-800/50' : 'bg-gray-800 border border-gray-700'}`}>
                <User size={20} />
              </div>
              <span className="ml-2 font-medium">Credentials</span>
            </div>
            
            <div className={`w-16 h-1 mx-4 ${activeStep >= 2 ? 'bg-red-500' : 'bg-gray-800'}`}></div>
            
            <div className={`flex items-center ${activeStep >= 2 ? 'text-red-500' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep >= 2 ? 'bg-red-900/30 border border-red-800/50' : 'bg-gray-800 border border-gray-700'}`}>
                <Key size={20} />
              </div>
              <span className="ml-2 font-medium">Verification</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800 min-h-[600px]">
          {/* Left Section - Visual & Branding */}
          <div className="lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-950 p-12 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <img 
                  src={Logo} 
                  alt="University of San Agustin Logo" 
                  className="h-16 w-16 bg-gray-800/50 p-3 rounded-xl border border-gray-700 backdrop-blur-sm"
                />
                <div>
                  <h1 className="text-2xl font-bold text-white">University of San Agustin</h1>
                  <h2 className="text-lg font-semibold text-red-400">Learning Resource Center</h2>
                </div>
              </div>

              <div className="mb-8">
                <div className="inline-flex items-center gap-2 bg-red-900/20 px-4 py-2 rounded-full border border-red-800/50 mb-4">
                  <Shield className="text-red-400" size={16} />
                  <span className="text-red-300 text-sm font-medium">Secure Admin Portal</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  {requiresOTP ? "Two-Factor Authentication" : "Administrative Access"}
                </h3>
                <p className="text-gray-400">
                  {requiresOTP 
                    ? "For enhanced security, please verify your identity with the code sent to your registered email."
                    : "Access restricted to authorized administrative personnel only. All activities are monitored and logged for security purposes."
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Enhanced Security</h4>
                    <p className="text-gray-400 text-sm">Multi-factor authentication with real-time monitoring</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Activity Logging</h4>
                    <p className="text-gray-400 text-sm">All administrative actions are recorded for audit purposes</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Role-Based Access</h4>
                    <p className="text-gray-400 text-sm">Granular permissions based on administrative roles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Login Form */}
          <div className="lg:w-1/2 p-12 flex flex-col justify-center">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-white">
                  {requiresOTP ? "Enter Verification Code" : "Admin Login"}
                </h2>
                <button
                  onClick={handleBackToUserLogin}
                  className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors duration-300 text-sm"
                >
                  <ArrowLeft size={16} />
                  User Login
                </button>
              </div>
              <p className="text-gray-400">
                {requiresOTP 
                  ? "Step 2 of 2: Enter the 6-digit code"
                  : "Step 1 of 2: Enter your credentials"
                }
              </p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-xl mb-6 animate-fade-in">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="flex-shrink-0" size={20} />
                  <div>
                    <p className="font-semibold">Security Alert</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {remainingAttempts > 0 && remainingAttempts < 5 && (
              <div className="bg-amber-900/20 border border-amber-800/50 text-amber-200 p-4 rounded-xl mb-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <div>
                    <p className="font-semibold">Security Warning</p>
                    <p className="text-sm mt-1">{remainingAttempts} attempt{remainingAttempts > 1 ? 's' : ''} remaining before account lock.</p>
                  </div>
                </div>
              </div>
            )}

            {requiresOTP ? (
              // OTP Verification Form
              <form onSubmit={handleOTPVerification} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-800/50">
                    <Mail className="text-red-400" size={36} />
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Code sent to your email address
                  </p>
                  <p className="text-red-300 font-semibold">{adminEmail}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    The code expires in 10 minutes
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-300">6-Digit Verification Code</label>
                  <div className="flex justify-center gap-3">
                    {[0,1,2,3,4,5].map((index) => (
                      <input
                        key={index}
                        className="w-16 h-20 border border-gray-700 bg-gray-800 rounded-xl text-center text-3xl font-mono text-white focus:border-red-500 focus:ring-2 focus:ring-red-900 transition-all duration-300 outline-none"
                        type="text"
                        maxLength="1"
                        value={otp[index] || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value) {
                            const newOtp = otp.split('');
                            newOtp[index] = value;
                            setOtp(newOtp.join('').slice(0, 6));
                            // Auto-focus next input
                            if (index < 5 && value) {
                              const nextInput = document.querySelector(`input:nth-child(${index + 2})`);
                              if (nextInput) nextInput.focus();
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[index] && index > 0) {
                            const prevInput = document.querySelector(`input:nth-child(${index})`);
                            if (prevInput) prevInput.focus();
                          }
                        }}
                        disabled={loading}
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={resetLogin}
                      disabled={loading}
                      className="flex-1 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold text-gray-200 transition-all duration-300 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Go Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="flex-1 py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-semibold text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify & Continue
                    </button>
                  </div>

                  <div className="text-center pt-4 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={otpCountdown > 0 || loading}
                      className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw size={18} />
                      {otpCountdown > 0 ? `Resend code in ${otpCountdown}s` : "Resend verification code"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              // Login Form
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Admin Username</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <User size={20} />
                      </div>
                      <input
                        className="w-full border border-gray-700 bg-gray-800 p-4 pl-12 rounded-xl text-white placeholder-gray-500 focus:border-red-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-red-900"
                        type="text"
                        placeholder="admin.username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Lock size={20} />
                      </div>
                      <input
                        className="w-full border border-gray-700 bg-gray-800 p-4 pl-12 pr-12 rounded-xl text-white placeholder-gray-500 focus:border-red-500 transition-all duration-300 outline-none focus:ring-2 focus:ring-red-900"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors duration-200 p-1"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-semibold text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield size={20} />
                      Login to Admin Portal
                    </>
                  )}
                </button>

                {maintenanceMode && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-300">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">System Maintenance Active</span>
                    </div>
                  </div>
                )}

                <div className="text-center pt-6 border-t border-gray-800">
                  <p className="text-xs text-gray-500">
                    By logging in, you agree to comply with the university's security policies
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} University of San Agustin. All rights reserved.
          </p>
          <p className="text-xs text-gray-700 mt-1">
            Admin Portal v2.1 • Last updated: {new Date().toLocaleDateString()}
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
        
        /* Custom focus ring for OTP inputs */
        input:focus {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(239, 68, 68, 0.15);
        }
      `}</style>
    </main>
  );
}

export default Login_Admin;