
import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, EyeOff, Loader2, CheckCircle, Home, Info, Shield, AlertCircle } from "lucide-react";
import Logo from "../assets/logo.png";
import "../index.css";
import api from "../utils/api";

// Constants
const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  LOADING_DELAY: 1000,
  ERROR_TIMEOUT: 5000, // Increased from 3000
  SUCCESS_MODAL_TIMEOUT: 2000, // Auto-close after 2 seconds
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 300000 // 5 minutes in milliseconds
};

const ROLES = {
  ADMIN: 'admin',
  STAFF_OFFICE: 'Staff_Office'
};

function Login_User({ onSwitchToSignUp, onLoginSuccess, setView }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [authedUser, setAuthedUser] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const successModalTimer = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Input validation with better feedback
  const validateInputs = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address (e.g., user@example.com).");
      emailRef.current?.focus();
      return false;
    }
    if (password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters long.`);
      passwordRef.current?.focus();
      return false;
    }
    return true;
  };

  // Calculate password strength
  const calculatePasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 4); // Max 4
  };

  // Event handlers with useCallback
  const handleEmailChange = useCallback((e) => {
    const value = e.target.value;
    setEmail(value);
    // Clear error when user starts typing
    if (error && error.includes('email')) {
      setError("");
    }
  }, [error]);

  const handlePasswordChange = useCallback((e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
    // Clear error when user starts typing
    if (error && error.includes('password')) {
      setError("");
    }
  }, [error]);
  
  const handleBlur = useCallback((field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Check for lockout
  useEffect(() => {
    const storedLockout = localStorage.getItem("loginLockout");
    if (storedLockout) {
      const { attempts, timestamp } = JSON.parse(storedLockout);
      const timePassed = Date.now() - timestamp;
      
      if (timePassed < VALIDATION.LOCKOUT_TIME) {
        setLoginAttempts(attempts);
        setLockoutUntil(new Date(timestamp + VALIDATION.LOCKOUT_TIME));
      } else {
        localStorage.removeItem("loginLockout");
      }
    }
  }, []);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (successModalTimer.current) clearTimeout(successModalTimer.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.removeItem("userSession");
    window.history.pushState(null, null, window.location.href);
    const handlePopState = () => window.location.replace("/");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Better error timeout management
  useEffect(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    
    if (error) {
      errorTimeoutRef.current = setTimeout(() => {
        setError("");
      }, VALIDATION.ERROR_TIMEOUT);
    }
    
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [error]);

  // Store lockout state
  const updateLockoutState = (attempts) => {
    const lockoutData = {
      attempts,
      timestamp: Date.now()
    };
    localStorage.setItem("loginLockout", JSON.stringify(lockoutData));
  };

  // Better session storage with remember me
  const storeUserSession = (userData) => {
    const sessionData = {
      user: userData,
      timestamp: Date.now(),
      expiresIn: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 24 hours
      rememberMe
    };
    localStorage.setItem("userSession", JSON.stringify(sessionData));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Check lockout
    if (lockoutUntil && lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((lockoutUntil - new Date()) / 60000);
      setError(`Account temporarily locked. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`);
      return;
    }

    // Rate limiting protection
    if (loginAttempts >= VALIDATION.MAX_LOGIN_ATTEMPTS) {
      setLockoutUntil(new Date(Date.now() + VALIDATION.LOCKOUT_TIME));
      updateLockoutState(loginAttempts);
      setError("Too many login attempts. Please try again in 5 minutes.");
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password.");
      setTouched({ email: true, password: true });
      !email ? emailRef.current?.focus() : passwordRef.current?.focus();
      return;
    }

    if (!validateInputs()) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 3) {
        updateLockoutState(newAttempts);
      }
      return;
    }

    console.log("🔐 Login attempt:", { email, passwordLength: password.length });

    const start = Date.now();
    setLoading(true);

    try {
      const response = await api.post("/users/login", { email, password, rememberMe });
      
      if (response.data.success) {
        const userData = response.data.user;
        
        if (userData?.role?.toLowerCase() === ROLES.ADMIN) {
          throw new Error("Admin accounts must log in through the admin portal.");
        }

        // Handle Staff_Office role - redirect to user dashboard
        if (userData?.role === ROLES.STAFF_OFFICE) {
          console.log("Staff_Office user logging in - redirecting to user dashboard");
        }

        const elapsed = Date.now() - start;
        const delay = elapsed < VALIDATION.LOADING_DELAY ? VALIDATION.LOADING_DELAY - elapsed : 0;
        
        setTimeout(() => {
          setLoading(false);
          setAuthedUser(userData);
          setSuccessModal(true);
          setLoginAttempts(0);
          localStorage.removeItem("loginLockout");
          setLockoutUntil(null);
          
          // Auto-close success modal after timeout
          successModalTimer.current = setTimeout(() => {
            closeSuccess();
          }, VALIDATION.SUCCESS_MODAL_TIMEOUT);
          
          console.log("✅ Login successful, modal should be visible");
        }, delay);
      } else {
        throw new Error(response.data.message || "Login failed");
      }
      
    } catch (err) {
      setLoading(false);
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        updateLockoutState(newAttempts);
      }
      
      console.error("❌ Login error:", err);
      
      let errorMessage = err.response?.data?.message || err.message || "An error occurred. Please try again later.";
      
      // Add helpful suggestions for common errors
      if (errorMessage.includes("credentials")) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (errorMessage.includes("network")) {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      setError(errorMessage);
      
      // Focus on the appropriate field
      if (errorMessage.includes("email")) {
        emailRef.current?.focus();
      } else if (errorMessage.includes("password")) {
        passwordRef.current?.focus();
      }
    }
  };

  const closeSuccess = () => {
    if (successModalTimer.current) {
      clearTimeout(successModalTimer.current);
    }
    
    console.log("🔗 Closing modal and redirecting to dashboard");
    setSuccessModal(false);
    if (authedUser) {
      storeUserSession(authedUser);
      if (onLoginSuccess) {
        onLoginSuccess(authedUser);
      }
    }
  };

  const handleBackToHome = () => {
    setView("home");
  };

  // Format lockout time
  const formatLockoutTime = () => {
    if (!lockoutUntil) return "";
    const minutes = Math.ceil((lockoutUntil - new Date()) / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  // Password strength indicator
  const getStrengthColor = (strength) => {
    const colors = [
      "bg-gray-300",
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-green-500"
    ];
    return colors[strength] || colors[0];
  };

  const getStrengthText = (strength) => {
    const texts = [
      "Very weak",
      "Weak",
      "Fair",
      "Good",
      "Strong"
    ];
    return texts[strength] || "";
  };

  return (
    <main className="min-h-screen w-screen bg-white md:bg-gradient-to-br md:from-blue-50 md:via-white md:to-yellow-50 flex items-center justify-center p-0 m-0 overflow-x-hidden">
      {loading && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-500/50 backdrop-blur-md"
          role="alert"
          aria-live="polite"
        >
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center mx-4">
            <Loader2 size={48} className="text-red-600 animate-spin mb-4" aria-hidden="true" />
            <p className="text-gray-700 text-base md:text-lg font-semibold">Logging in…</p>
            <p className="text-gray-500 text-sm mt-2">Please wait</p>
          </div>
        </div>
      )}

      {/* Error Messages - Fixed Positioning */}
      <div className="fixed top-4 left-0 right-0 z-40 flex justify-center">
        {error && (
          <div
            key={error}
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 md:p-4 rounded-lg shadow-lg animate-fade-in-down max-w-md w-[95%] mx-4"
            role="alert"
          >
            <div className="flex items-start">
              <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm md:text-base">Error</p>
                <p className="text-xs md:text-sm mt-1">{error}</p>
                {lockoutUntil && lockoutUntil > new Date() && (
                  <p className="text-xs mt-2 font-medium">
                    ⏳ Time remaining: {formatLockoutTime()}
                  </p>
                )}
                {loginAttempts > 0 && loginAttempts < VALIDATION.MAX_LOGIN_ATTEMPTS && (
                  <p className="text-xs mt-1">
                    Attempts remaining: {VALIDATION.MAX_LOGIN_ATTEMPTS - loginAttempts}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Container - Full white background always */}
      <div className="w-full h-full flex items-center justify-center bg-white md:bg-transparent">
        <div className="w-full max-w-md bg-white md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 p-6 md:p-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img src={Logo} alt="University Logo" className="h-14 md:h-16 w-auto" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-sm md:text-base">Sign in to access your account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                Email Address
                <Info size={14} className="ml-1 text-gray-400" />
              </label>
              <input
                ref={emailRef}
                className="w-full border border-gray-300 p-3 md:p-4 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base"
                type="text"
                placeholder="Enter your email address"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleBlur('email')}
                aria-label="Email address"
                aria-required="true"
                aria-invalid={showEmailError ? "true" : "false"}
                autoComplete="username email"
                disabled={lockoutUntil && lockoutUntil > new Date()}
              />
              {showEmailError && (
                <p className="text-red-500 text-xs mt-1 flex items-center" role="alert">
                  <AlertCircle size={12} className="mr-1" />
                  Email is required
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  Password
                  <button
                    type="button"
                    onClick={() => setShowRequirements(!showRequirements)}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    aria-label="Show password requirements"
                  >
                    <Info size={14} />
                  </button>
                </label>
                <button
                  type="button"
                  onClick={() => setView("resetPassword")}
                  className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              
              {/* Password Requirements Tooltip */}
              {showRequirements && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-600 mb-2">
                  <p className="font-semibold mb-1">Password must contain:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>At least {VALIDATION.MIN_PASSWORD_LENGTH} characters</li>
                    <li>One uppercase letter</li>
                    <li>One number</li>
                    <li>One special character</li>
                  </ul>
                </div>
              )}
              
              <div className="relative">
                <input
                  ref={passwordRef}
                  className="w-full border border-gray-300 p-3 md:p-4 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handleBlur('password')}
                  aria-label="Password"
                  aria-required="true"
                  aria-invalid={showPasswordError ? "true" : "false"}
                  autoComplete="current-password"
                  disabled={lockoutUntil && lockoutUntil > new Date()}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  disabled={lockoutUntil && lockoutUntil > new Date()}
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={`font-medium ${
                      passwordStrength === 0 ? 'text-gray-500' :
                      passwordStrength <= 2 ? 'text-red-500' :
                      passwordStrength === 3 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {getStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getStrengthColor(passwordStrength)} transition-all duration-300`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {showPasswordError && (
                <p className="text-red-500 text-xs mt-1 flex items-center" role="alert">
                  <AlertCircle size={12} className="mr-1" />
                  Password is required
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                disabled={lockoutUntil && lockoutUntil > new Date()}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 cursor-pointer">
                Remember me on this device
              </label>
              <Shield size={14} className="ml-1 text-gray-400" />
            </div>

            <button
              type="submit"
              disabled={loading || (lockoutUntil && lockoutUntil > new Date())}
              className={`w-full p-3 md:p-4 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-base ${
                loading || (lockoutUntil && lockoutUntil > new Date()) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Logging in...' : (lockoutUntil && lockoutUntil > new Date()) ? 'Account Locked' : 'Login'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm md:text-base">
              Don't have an account?{" "}
              <button
                onClick={onSwitchToSignUp}
                className="text-red-600 hover:text-red-800 font-semibold cursor-pointer transition-colors duration-200"
                disabled={lockoutUntil && lockoutUntil > new Date()}
              >
                Create Account
              </button>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium cursor-pointer transition-colors duration-200"
              disabled={lockoutUntil && lockoutUntil > new Date()}
            >
              <Home size={18} />
              <span className="text-sm">Back to Home</span>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              © {new Date().getFullYear()} University of San Agustin. All rights reserved.
            </p>
            <p className="text-xs text-center text-gray-400 mt-1">
              Secure login with encryption
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal - This should appear after successful login */}
      {successModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/50 backdrop-blur-md p-4"
          onClick={closeSuccess}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full mx-auto text-center animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">Login Successful!</h3>
            <p className="text-gray-600 text-base md:text-lg mb-4 md:mb-6">
              Welcome back{authedUser?.name ? `, ${authedUser.name}` : ''}! 
              <span className="block mt-1 text-sm">
                Redirecting to dashboard in 2 seconds...
              </span>
            </p>
            <div className="h-1 w-full bg-gray-200 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-green-500 animate-[progress_2s_linear]"></div>
            </div>
            <button
              onClick={closeSuccess}
              className="w-full py-3 md:py-4 bg-red-700 text-white rounded-xl text-base md:text-lg font-semibold hover:bg-red-800 cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

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
        
        @keyframes fade-in-scale {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out;
        }
        
        .animate-fade-in-scale {
          animation: fade-in-scale 0.3s ease-out;
        }

        /* Ensure full white background on mobile */
        @media (max-width: 767px) {
          main {
            background: white !important;
            min-height: 100vh;
            min-height: -webkit-fill-available;
          }
        }
      `}</style>
    </main>
  );
}

export default Login_User;
