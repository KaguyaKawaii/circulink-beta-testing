// SignUp_User.jsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Eye, EyeOff, CheckCircle, Loader2, Search, X, ChevronDown } from "lucide-react";
import Logo from "../assets/logo.png";
import lrc from '../assets/logo2.png';
import DataPrivacyModal from "./Modals/DataPrivacyModal";
import TermsConditionsModal from "./Modals/TermsConditionsModal";

function SignUp_User({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    id_number: "",
    password: "",
    confirmPassword: "",
    role: "",
    department: "",
    course: "",
    year_level: "",
    otherDepartment: "",
  });

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [message, setMessage] = useState("");
  const [messageClass, setMessageClass] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendTimerActive, setResendTimerActive] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showYearLevelDropdown, setShowYearLevelDropdown] = useState(false);
  const [showDataPrivacyModal, setShowDataPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Role options with display names
  const roleOptions = [
    { value: "Student", label: "Student" },
    { value: "Faculty", label: "Faculty" },
    { value: "Staff_Office", label: "Staff" }
  ];

  const departmentOptions = {
    "CLASE": "College of Liberal Arts, Sciences, and Education (CLASE)",
    "COT": "College of Technology (COT)",
    "COC": "College of Commerce (COC)",
    "CNND": "College of Nursing, Nutrition, and Dietetics (CNND)",
    "CPMT": "College of Pharmacy and Medical Technology (CPMT)",
    "COL": "College of Law (COL)",
    "SHS": "Senior High School (SHS)"
  };

  const courseOptions = {
    SHS: ["STEM", "ABM", "HUMSS"],
    CLASE: [
      "Bachelor of Arts in Communication",
      "Bachelor of Arts in Philosophy",
      "Bachelor of Arts in Political Science",
      "Bachelor of Science in Foreign Service",
      "Bachelor of Science in Psychology",
      "Bachelor of Science in Biology (Medical)",
      "Bachelor of Science in Biology (Biological)",
      "Bachelor of Science in Chemistry",
      "Bachelor of Science in Computer Science",
      "Bachelor of Science in Information Technology",
      "Bachelor of Library and Information Science",
      "Bachelor of Music in Music Education",
      "Bachelor of Music in Music Performance (Piano)",
      "Bachelor of Music in Music Performance (Voice)",
      "Bachelor of Elementary Education",
      "Bachelor of Science in Secondary Education (English)",
      "Bachelor of Science in Secondary Education (Filipino)",
      "Bachelor of Science in Secondary Education (Mathematics)",
      "Bachelor of Science in Secondary Education (Social Studies)",
      "Bachelor of Culture And Arts Education",
      "Bachelor of Special Need Education (Early Childhood Education)",
      "Master of Arts in Guidance and Counseling (MAGC)",
      "Master of Arts in Religious Studies (MARS)",
      "Master of Arts in Education - English",
      "Master of Arts in Education - Filipino",
      "Master of Arts in Education - Mathematics",
      "Master of Arts in Education - Natural Science",
      "Master of Arts in Education - Physics",
      "Master of Arts in Education - Religious Education",
      "Master of Arts in Education - Social Science",
      "Master of Arts in Education - Special Education",
      "Doctor of Philosophy in Education - Educational Management",
      "Doctor of Philosophy in Education - Psychology and Guidance",
      "Doctor of Philosophy in Education - Curriculum Development",
    ],
    CNND: [
      "Bachelor of Science in Nursing",
      "Bachelor of Science in Nutrition and Dietetics",
    ],
    CPMT: [
      "Bachelor of Science in Medical Laboratory Science",
      "Bachelor of Science in Pharmacy",
    ],
    COT: [
      "Bachelor of Science in Architecture",
      "Bachelor of Science in Landscape Architecture",
      "Bachelor of Science in Interior Design",
      "Bachelor of Science in Chemical Engineering",
      "Bachelor of Science in Civil Engineering",
      "Bachelor of Science in Computer Engineering",
      "Bachelor of Science in Electronics Engineering",
      "Bachelor of Science in Mechanical Engineering",
      "Bachelor of Fine Arts",
    ],
    COC: [
      "Bachelor of Science in Accountancy",
      "Bachelor of Science in Management Accounting",
      "Bachelor of Science in Business Administration (Financial Management)",
      "Bachelor of Science in Business Administration (Marketing Management)",
      "Bachelor of Science in Hospitality Management",
      "Bachelor of Science in Tourism Management (Certificate of Culinary Arts)",
      "Master of Business Administration (MBA) - General",
      "Master of Business Administration (MBA) - Marketing Management",
      "Master of Business Administration (MBA) - Financial Management",
      "Master of Business Administration (MBA) - Human Resource Management",
      "Master in Public Administration (MPA)",
    ],
    COL: [
      "Juris Doctor"
    ]
  };

  const yearLevelOptions = {
    SHS: ["Grade 11", "Grade 12"],
    COL: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    GRADUATE: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    UNDERGRADUATE: ["1st Year", "2nd Year", "3rd Year", "4th Year"]
  };

  // Get display label for current role
  const getRoleDisplayLabel = () => {
    const roleOption = roleOptions.find(role => role.value === formData.role);
    return roleOption ? roleOption.label : "Select Role";
  };

  // Filter courses based on search input
  const filteredCourses = useMemo(() => {
    if (!formData.department || !courseOptions[formData.department]) return [];
    
    const courses = courseOptions[formData.department];
    if (!courseSearch.trim()) return courses;
    
    const searchTerm = courseSearch.toLowerCase();
    return courses.filter(course => 
      course.toLowerCase().includes(searchTerm)
    );
  }, [formData.department, courseSearch]);

  // Get year levels based on department and course
  const getYearLevels = () => {
    if (formData.department === "SHS") {
      return yearLevelOptions.SHS;
    } else if (formData.department === "COL") {
      return yearLevelOptions.COL;
    } else if (isGraduateProgram(formData.course)) {
      if (formData.course.includes("Doctor")) {
        return yearLevelOptions.GRADUATE;
      }
      return ["1st Year", "2nd Year"];
    } else {
      return yearLevelOptions.UNDERGRADUATE;
    }
  };

  // Check if a course is a graduate program
  const isGraduateProgram = (course) => {
    const graduateKeywords = ["Master", "Doctor", "MBA", "MPA", "MAGC", "MARS", "MAED"];
    return graduateKeywords.some(keyword => course.includes(keyword));
  };

  // Check if department is "Other" (for Faculty)
  const isOtherDepartment = formData.department === "Other";

  useEffect(() => {
    if (message) {
      setMessageClass("animate-shake");
      const t = setTimeout(() => {
        setMessage("");
        setMessageClass("");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  useEffect(() => {
    let t;
    if (resendTimerActive && resendCooldown > 0) {
      t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    } else if (resendCooldown === 0) {
      setResendTimerActive(false);
    }
    return () => clearTimeout(t);
  }, [resendCooldown, resendTimerActive]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "role") {
      setFormData((p) => ({
        ...p,
        role: value,
        department: "",
        course: "",
        year_level: "",
        otherDepartment: "",
      }));
      setShowRoleDropdown(false);
      return;
    }

    if (name === "department") {
      setFormData((p) => ({
        ...p,
        department: value,
        course: "",
        year_level: "",
        otherDepartment: value === "Other" ? p.otherDepartment : "",
      }));
      setCourseSearch("");
      setShowCourseDropdown(false);
      setShowDepartmentDropdown(false);
      return;
    }

    if (name === "course") {
      setFormData((p) => ({
        ...p,
        course: value,
        year_level: "",
      }));
      setCourseSearch(value);
      setShowCourseDropdown(false);
      return;
    }

    if (name === "year_level") {
      setFormData((p) => ({
        ...p,
        year_level: value,
      }));
      setShowYearLevelDropdown(false);
      return;
    }

    setFormData((p) => ({
      ...p,
      [name]: name === "email" ? value.toLowerCase() : value,
    }));
  };

  const handleRoleSelect = (roleValue) => {
    setFormData((p) => ({
      ...p,
      role: roleValue,
      department: "",
      course: "",
      year_level: "",
      otherDepartment: "",
    }));
    setShowRoleDropdown(false);
  };

  const handleDepartmentSelect = (dept) => {
    setFormData((p) => ({
      ...p,
      department: dept,
      course: "",
      year_level: "",
      otherDepartment: dept === "Other" ? p.otherDepartment : "",
    }));
    setCourseSearch("");
    setShowCourseDropdown(false);
    setShowDepartmentDropdown(false);
  };

  const handleCourseSelect = (course) => {
    setFormData((p) => ({
      ...p,
      course: course,
      year_level: "",
    }));
    setCourseSearch(course);
    setShowCourseDropdown(false);
  };

  const handleYearLevelSelect = (yearLevel) => {
    setFormData((p) => ({
      ...p,
      year_level: yearLevel,
    }));
    setShowYearLevelDropdown(false);
  };

  const handleCourseSearchChange = (e) => {
    const value = e.target.value;
    setCourseSearch(value);
    setFormData((p) => ({
      ...p,
      course: value,
      year_level: "",
    }));
    setShowCourseDropdown(true);
  };

  const clearCourseSearch = () => {
    setCourseSearch("");
    setFormData((p) => ({
      ...p,
      course: "",
      year_level: "",
    }));
    setShowCourseDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!agreedToTerms) {
      return setMessage("You must agree to the Data Privacy and Terms & Conditions");
    }

    if (!formData.email.toLowerCase().endsWith("@usa.edu.ph"))
      return setMessage("Email must end with @usa.edu.ph");
    if (formData.password.length < 8)
      return setMessage("Password must be at least 8 characters");
    if (formData.password !== formData.confirmPassword)
      return setMessage("Passwords do not match");
    if (!formData.role) return setMessage("Please select an account role");
    
    // For students, check if department, course and year level are required
    if (formData.role === "Student") {
      if (!formData.department) return setMessage("Please select a department");
      if (!formData.course) return setMessage("Program is required for students");
      if (!formData.year_level) return setMessage("Year Level is required for students");
    }
    
    // For staff, check if department and course are required
    if (formData.role === "Staff_Office") {
      if (!formData.department.trim()) return setMessage("Please enter your office/department");
      if (!formData.course.trim()) return setMessage("Position is required for staff");
    }
    
    // For faculty, check if department is required
    if (formData.role === "Faculty") {
      if (!formData.department) return setMessage("Please select a department");
      if (formData.department === "Other" && !formData.otherDepartment.trim()) {
        return setMessage("Please specify your department");
      }
    }

    try {
      setLoading(true);

      // Determine the final department value
      let finalDepartment = formData.department;
      if (formData.role === "Faculty" && formData.department === "Other") {
        finalDepartment = formData.otherDepartment;
      }

      const payload = {
        ...formData,
        email: formData.email.toLowerCase(),
        course: formData.role === "Student" || formData.role === "Staff_Office" ? formData.course : "N/A",
        year_level: formData.role === "Student" ? formData.year_level : "N/A",
        department: formData.role === "Student" || formData.role === "Staff_Office" || formData.role === "Faculty" ? finalDepartment : "N/A",
      };

      // Remove otherDepartment from payload as it's not needed in the database
      delete payload.otherDepartment;

await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/signup`, payload);

      setMessage("OTP sent to your email.");
      setOtpSent(true);
      setResendCooldown(60);
      setResendTimerActive(true);
    } catch (err) {
      setMessage(err.response?.data?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!otp) return setMessage("Please enter the OTP");

    setLoading(true);
    try {
await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify-otp`, {
        email: formData.email,
        otp,
      });

      setTimeout(() => {
        setLoading(false);
        setSuccessModal(true);
      }, 2000);
    } catch (err) {
      setLoading(false);
      setMessage(err.response?.data?.message || "OTP verification failed.");
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/resend-otp`, {
        email: formData.email,
      });
      setMessage("OTP resent successfully.");
      setResendCooldown(60);
      setResendTimerActive(true);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    setSuccessModal(false);
    onSwitchToLogin();
  };

  return (
    <main className="min-h-screen w-screen bg-white flex items-center justify-center p-0 m-0 overflow-x-hidden">
      {/* full‑screen spinner when loading */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-500/50 backdrop-blur-md">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center mx-4">
            <Loader2 size={48} className="text-red-600 animate-spin mb-4" />
            <p className="text-gray-700 text-base md:text-lg font-semibold">Verifying…</p>
          </div>
        </div>
      )}

      {/* Error Messages - Fixed Positioning */}
      <div className="fixed top-4 left-0 right-0 z-40 flex justify-center">
        {message && (
          <div
            key={message}
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 md:p-4 rounded-lg shadow-lg animate-fade-in-down max-w-md w-[95%] mx-4"
            role="alert"
          >
            <p className="font-bold text-sm md:text-base">Notice</p>
            <p className="text-xs md:text-sm">{message}</p>
          </div>
        )}
      </div>

      {/* Main Content Container - Full screen white background */}
      <div className="w-full h-full bg-white overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden w-full bg-white pt-8 pb-6 px-6">
          <div className="flex flex-col items-center">
            <div className="flex justify-center gap-6 mb-4">
              <img src={Logo} alt="USA logo" className="h-16 w-16" />
              <img src={lrc} alt="LRC logo" className="h-16 w-16" />
            </div>
            <h1 className="text-xl font-serif font-semibold text-center text-gray-800">
              University of San Agustin
            </h1>
            <p className="text-md font-semibold text-gray-700 text-center">
              Learning Resource Center
            </p>
            <div className="w-12 h-1 bg-yellow-500 mt-2"></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="w-full max-w-4xl mx-auto px-6 pb-8">
          <div className="bg-white md:rounded-2xl  md:border md:border-gray-200 md:overflow-hidden md:flex">
            {/* Left side - University Info - Hidden on mobile, shown on desktop */}
            <div className="hidden md:flex md:w-2/5 bg-yellow-500 p-10 text-white flex-col justify-center items-center text-center">
              <div className="flex justify-around w-full mb-4">
                <img 
                  className="relative w-[130px] h-[130px]" 
                  src={Logo} 
                  alt="University of San Agustin Logo" 
                />
                <img 
                  src={lrc} 
                  alt="Learning Resource Center Logo" 
                  className="relative w-[130px] h-[130px]"
                />
              </div>
              <h1 className="text-2xl font-serif font-bold mb-4">
                University of San Agustin
              </h1>
              <div className="w-16 h-1 bg-yellow-400 mb-4"></div>
              <p className="text-xl font-semibold text-white">
                Learning Resource Center
              </p>
            </div>

            {/* Right side - Form Content */}
            <div className="w-full md:w-3/5 p-6 md:p-8">
              {/* ---------- SIGN UP vs OTP ---------- */}
              {!otpSent ? (
                /* ======= SIGN‑UP FORM ======= */
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4"
                >
                  <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                    Create Account
                  </h2>

                  {/* Full name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Email (@usa.edu.ph)</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="e.g. juandelacruz@usa.edu.ph"
                      value={formData.email}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* ID number */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">ID Number</label>
                    <input
                      type="text"
                      name="id_number"
                      placeholder="Enter your ID number"
                      maxLength={15}
                      value={formData.id_number}
                      onChange={(e) => {
                        const input = e.target.value;
                        if (/^\d{0,15}$/.test(input)) {
                          handleChange(e);
                        }
                      }}
                      className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Account role */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Account Role</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        className="w-full border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-left flex justify-between items-center bg-white"
                      >
                        <span className={formData.role ? "text-gray-800" : "text-gray-500"}>
                          {getRoleDisplayLabel()}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </button>
                      
                      {/* Role Dropdown */}
                      {showRoleDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {roleOptions.map((role) => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => handleRoleSelect(role.value)}
                              className="w-full px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">{role.label}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Department - Different input types based on role */}
                  {(formData.role === "Student" || formData.role === "Staff_Office" || formData.role === "Faculty") && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        {formData.role === "Student" ? "Department" : 
                         formData.role === "Faculty" ? "Department" : 
                         "Office/Department"}
                      </label>
                      {formData.role === "Student" ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                            className="w-full border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-left flex justify-between items-center bg-white"
                          >
                            <span className={formData.department ? "text-gray-800" : "text-gray-500"}>
                              {formData.department ? departmentOptions[formData.department] : "Select Department"}
                            </span>
                            <ChevronDown size={16} className="text-gray-400" />
                          </button>
                          
                          {/* Department Dropdown */}
                          {showDepartmentDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              {Object.entries(departmentOptions).map(([key, value]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => handleDepartmentSelect(key)}
                                  className="w-full px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium">{value}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : formData.role === "Faculty" ? (
                        <>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                              className="w-full border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-left flex justify-between items-center bg-white"
                            >
                              <span className={formData.department ? "text-gray-800" : "text-gray-500"}>
                                {formData.department === "Other" ? "Other" : formData.department ? departmentOptions[formData.department] : "Select Department"}
                              </span>
                              <ChevronDown size={16} className="text-gray-400" />
                            </button>
                            
                            {/* Department Dropdown */}
                            {showDepartmentDropdown && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {Object.entries(departmentOptions).map(([key, value]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleDepartmentSelect(key)}
                                    className="w-full px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium">{value}</div>
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => handleDepartmentSelect("Other")}
                                  className="w-full px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                                >
                                  <div className="font-medium">Other</div>
                                </button>
                              </div>
                            )}
                          </div>
                          {isOtherDepartment && (
                            <input
                              type="text"
                              name="otherDepartment"
                              placeholder="Please specify your department"
                              value={formData.otherDepartment}
                              onChange={handleChange}
                              className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mt-2"
                              required
                            />
                          )}
                        </>
                      ) : (
                        <input
                          type="text"
                          name="department"
                          placeholder="Enter your office/department (e.g., Registrar's Office, HR Department)"
                          value={formData.department}
                          onChange={handleChange}
                          className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                      )}
                    </div>
                  )}

                  {/* Program/Position - Show for Students and Staff (not for Faculty) */}
                  {(formData.role === "Student" || formData.role === "Staff_Office") && formData.department && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        {formData.role === "Staff_Office" ? "Position" : "Program"}
                      </label>
                      {formData.role === "Student" ? (
                        <div className="relative">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search or select program..."
                              value={courseSearch}
                              onChange={handleCourseSearchChange}
                              onFocus={() => setShowCourseDropdown(true)}
                              className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent w-full pr-10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                              {courseSearch && (
                                <button
                                  type="button"
                                  onClick={clearCourseSearch}
                                  className="text-gray-400 hover:text-red-600 transition-colors duration-200"
                                >
                                  <X size={16} />
                                </button>
                              )}
                              <Search size={16} className="text-gray-400" />
                            </div>
                          </div>
                          
                          {/* Course Dropdown */}
                          {showCourseDropdown && filteredCourses.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              {filteredCourses.map((course) => (
                                <button
                                  key={course}
                                  type="button"
                                  onClick={() => handleCourseSelect(course)}
                                  className="w-full px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium">{course}</div>
                                  {isGraduateProgram(course) && (
                                    <div className="text-xs text-gray-500 mt-1">Graduate Program</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* No results message */}
                          {showCourseDropdown && courseSearch && filteredCourses.length === 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg p-4 text-center text-gray-500">
                              No programs found matching "{courseSearch}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          name="course"
                          placeholder="Enter your position (e.g., Administrative Assistant, Clerk)"
                          value={formData.course}
                          onChange={handleChange}
                          className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                      )}
                    </div>
                  )}

                  {/* Year Level - Show only for Students (not for Staff or Faculty) */}
                  {formData.role === "Student" && formData.course && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Year Level</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowYearLevelDropdown(!showYearLevelDropdown)}
                          className="w-full border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-left flex justify-between items-center bg-white"
                        >
                          <span className={formData.year_level ? "text-gray-800" : "text-gray-500"}>
                            {formData.year_level || "Select Year Level"}
                          </span>
                          <ChevronDown size={16} className="text-gray-400" />
                        </button>
                        
                        {/* Year Level Dropdown */}
                        {showYearLevelDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {getYearLevels().map((yearLevel) => (
                              <button
                                key={yearLevel}
                                type="button"
                                onClick={() => handleYearLevelSelect(yearLevel)}
                                className="w-full px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium">{yearLevel}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        name="password"
                        placeholder="Minimum 8 characters"
                        value={formData.password}
                        onChange={handleChange}
                        className="border border-gray-300 p-3 rounded-xl w-full hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                      >
                        {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showPw2 ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Re‑enter your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="border border-gray-300 p-3 rounded-xl w-full hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw2((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                      >
                        {showPw2 ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Terms and Conditions Agreement */}
                  <div className="flex items-start gap-3 mt-2 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="termsAgreement"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 text-red-600 focus:ring-red-500 rounded"
                    />
                    <label htmlFor="termsAgreement" className="text-sm text-gray-700">
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowDataPrivacyModal(true)}
                        className="text-red-600 hover:text-red-800 font-medium underline cursor-pointer transition-colors duration-300"
                      >
                        Data Privacy Policy
                      </button>{" "}
                      and{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-red-600 hover:text-red-800 font-medium underline cursor-pointer transition-colors duration-300"
                      >
                        Terms & Conditions
                      </button>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="p-3 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg mt-2"
                  >
                    {loading ? "Please wait…" : "Sign Up"}
                  </button>
                </form>
              ) : (
                /* ======= OTP VERIFY ======= */
                <div className="flex flex-col gap-4 mt-2">
                  <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                    Verify Email
                  </h2>
                  
                  <p className="text-center text-green-700 bg-green-50 p-3 rounded-xl">
                    OTP sent to: <strong>{formData.email}</strong>
                  </p>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Verification Code</label>
                    <input
                      type="text"
                      placeholder="Enter 6‑digit OTP"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-center text-xl tracking-widest"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleOtpVerify}
                      disabled={loading || otp.length !== 6}
                      className="flex-1 p-3 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? "Verifying…" : "Verify"}
                    </button>
                    
                    <button
                      onClick={handleResendOtp}
                      disabled={resendTimerActive}
                      className="p-3 rounded-xl bg-gray-600 hover:bg-gray-700 font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {resendTimerActive ? `${resendCooldown}s` : "Resend"}
                    </button>
                  </div>

                  <button
                    onClick={() => setOtpSent(false)}
                    className="text-red-600 hover:text-red-800 font-medium text-center mt-2"
                  >
                    ← Back to Sign Up
                  </button>
                </div>
              )}

              {/* Switch to login */}
              <p className="text-center text-gray-600 mt-6">
                Already have an account?{" "}
                <button
                  onClick={onSwitchToLogin}
                  className="text-red-600 hover:text-red-800 font-bold cursor-pointer transition-colors duration-300"
                >
                  Login
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full mx-auto text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Success!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully.
            </p>
            <button
              onClick={goToLogin}
              className="w-full p-3 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

      {/* Data Privacy Modal */}
      <DataPrivacyModal 
        isOpen={showDataPrivacyModal}
        onClose={() => setShowDataPrivacyModal(false)}
      />

      {/* Terms & Conditions Modal */}
      <TermsConditionsModal 
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

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

export default SignUp_User;