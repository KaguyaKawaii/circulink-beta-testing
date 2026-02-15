import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, CheckCircle, ArrowLeft, Mail } from "lucide-react";
import Logo from "../assets/logo.png";
import Logo2 from "../assets/logo2.png";
import Logo3 from "../assets/logo3.png";
import "../index.css";

function ResetPassword({ onBackToLogin }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email.");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep("otp");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return setError("Enter the OTP.");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("reset");
    }, 800); // mimic verifying
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword)
      return setError("Please fill in all fields.");
    if (newPassword !== confirmPassword)
      return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessModal(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const closeSuccess = () => {
    setSuccessModal(false);
    onBackToLogin();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 flex items-center justify-center p-4">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-500/50 backdrop-blur-md">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <Loader2 size={64} className="text-red-600 animate-spin mb-4" />
            <p className="text-gray-700 text-lg font-semibold">Processing…</p>
          </div>
        </div>
      )}

      <div className="flex justify-center absolute top-6 left-0 right-0 z-40">
        {error && (
          <div
            key={error}
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg animate-fade-in-down max-w-md w-[90%] mx-4"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 p-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6 gap-6">
              <img src={Logo} alt="University Logo" className="h-16 w-auto" />
              <img src={Logo2} alt="University Logo" className="h-16 w-auto" />
              <img src={Logo3} alt="University Logo" className="h-16 w-auto" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {step === "email" && "Reset Password"}
              {step === "otp" && "Enter Verification Code"}
              {step === "reset" && "Create New Password"}
            </h2>
            <p className="text-gray-600 text-base">
              {step === "email" && "Enter your email to receive a verification code"}
              {step === "otp" && "Check your email for the verification code"}
              {step === "reset" && "Enter your new password below"}
            </p>
          </div>

          {/* Forms */}
          <div className="space-y-6">
            {step === "email" && (
              <form onSubmit={handleRequestOtp} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    className="w-full border border-gray-300 p-4 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-4 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Send Verification Code"}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Verification Code</label>
                  <input
                    className="w-full border border-gray-300 p-4 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-center tracking-widest text-lg font-mono"
                    type="text"
                    placeholder="Enter the 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    We sent a code to {email}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-4 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Verify Code"}
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      className="w-full border border-gray-300 p-4 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base pr-12"
                      type={showPw ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                    >
                      {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <input
                      className="w-full border border-gray-300 p-4 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base pr-12"
                      type={showConfirmPw ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw((s) => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                    >
                      {showConfirmPw ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-4 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Reset Password"}
                </button>
              </form>
            )}
          </div>

          {/* Back to Login */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={onBackToLogin}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium cursor-pointer transition-colors duration-200"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back to Login</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/50 backdrop-blur-md"
          onClick={closeSuccess}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-[90%] mx-4 text-center animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Password Reset Successful!</h3>
            <p className="text-gray-600 text-lg mb-6">
              Your password has been successfully updated. You can now log in with your new password.
            </p>
            <button
              onClick={closeSuccess}
              className="w-full py-4 bg-red-700 text-white rounded-xl text-lg font-semibold hover:bg-red-800 cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Continue to Login
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
      `}</style>
    </main>
  );
}

export default ResetPassword;