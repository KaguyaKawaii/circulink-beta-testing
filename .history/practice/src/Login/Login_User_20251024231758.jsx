import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, CheckCircle, Home } from "lucide-react";
import Logo from "../assets/logo.png";
import "../index.css";

function Login_User({ onSwitchToSignUp, onLoginSuccess, setView }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [authedUser, setAuthedUser] = useState(null);

  useEffect(() => {
    localStorage.removeItem("userSession");
    window.history.pushState(null, null, window.location.href);
    const handlePopState = () => window.location.replace("/");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    console.log("🔐 Login attempt:", { email, passwordLength: password.length });

    const start = Date.now();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      console.log("📊 Login response:", {
        status: res.status,
        ok: res.ok,
        data: data
      });

      if (!res.ok) {
        // ✅ Handle suspended accounts with a more friendly message
        if (res.status === 403 || data.message?.toLowerCase().includes("suspended")) {
          throw new Error("Your account has been suspended. Please contact the administrator.");
        }
        
        if (res.status === 401) {
          // Get more specific error information
          console.error("🔍 401 Error Details:", {
            email: email,
            userExists: data.user ? "Yes" : "No",
            message: data.message
          });
          throw new Error(data.message || "Invalid email or password. Please check your credentials.");
        }
        
        throw new Error(data.message || "Login failed. Please try again.");
      }

      if (data.user?.role?.toLowerCase() === "admin") {
        throw new Error("Admin accounts must log in through the admin portal.");
      }

      // ✅ Handle Staff_Office role - redirect to user dashboard
      if (data.user?.role === "Staff_Office") {
        console.log("Staff_Office user logging in - redirecting to user dashboard");
      }

      const elapsed = Date.now() - start;
      const delay = elapsed < 1000 ? 1000 - elapsed : 0;
      setTimeout(() => {
        setLoading(false);
        setAuthedUser(data.user);
        setSuccessModal(true);
      }, delay);
    } catch (err) {
      setLoading(false);
      console.error("❌ Login error:", err);
      setError(err.message || "An error occurred. Please try again later.");
    }
  };

  const closeSuccess = () => {
    setSuccessModal(false);
    if (authedUser) {
      localStorage.setItem("userSession", JSON.stringify(authedUser));
      onLoginSuccess(authedUser);
    }
  };

  const handleBackToHome = () => {
    setView("home");
  };

  return (
    <main className="min-h-screen  w-screen bg-white md:bg-gradient-to-br md:from-blue-50 md:via-white md:to-yellow-50 flex items-center justify-center p-0 m-0 overflow-x-hidden">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-500/50 backdrop-blur-md">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center mx-4">
            <Loader2 size={48} className="text-red-600 animate-spin mb-4" />
            <p className="text-gray-700 text-base md:text-lg font-semibold">Logging in…</p>
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
            <p className="font-bold text-sm md:text-base">Error</p>
            <p className="text-xs md:text-sm">{error}</p>
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
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input
                className="w-full border border-gray-300 p-3 md:p-4 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base"
                type="text"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => setView("resetPassword")}
                  className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  className="w-full border border-gray-300 p-3 md:p-4 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full p-3 md:p-4 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-base"
            >
              Login
            </button>
          </form>

          {/* Admin Portal Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setView("adminLogin")}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium cursor-pointer transition-colors duration-200"
            >
              Admin Portal →
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm md:text-base">
              Don't have an account?{" "}
              <button
                onClick={onSwitchToSignUp}
                className="text-red-600 hover:text-red-800 font-semibold cursor-pointer transition-colors duration-200"
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
          </div>
        </div>
      </div>

      {/* Success Modal */}
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
              Welcome back! You're now being redirected to your dashboard.
            </p>
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
          }
        }
      `}</style>
    </main>
  );
}

export default Login_User;