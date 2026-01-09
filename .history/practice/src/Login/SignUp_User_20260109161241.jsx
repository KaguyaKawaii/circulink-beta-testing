// SignUp_User.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { Eye, EyeOff, CheckCircle, Loader2, Search, X, ChevronDown, AlertCircle, Check, XCircle } from "lucide-react";
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
  const [activeStep, setActiveStep] = useState(1); // For multi-step form
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Refs for click outside detection
  const roleDropdownRef = useRef(null);
  const deptDropdownRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  // Refs for dropdown positioning
  const roleButtonRef = useRef(null);
  const deptButtonRef = useRef(null);
  const yearButtonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({});

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

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  // Calculate dropdown position
  const calculateDropdownPosition = (buttonRef, dropdownHeight = 240) => {
    if (!buttonRef.current) return "bottom";
    
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      return "top";
    }
    return "bottom";
  };

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRoleDropdown && roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setShowRoleDropdown(false);
      }
      if (showDepartmentDropdown && deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) {
        setShowDepartmentDropdown(false);
      }
      if (showCourseDropdown && courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
        setShowCourseDropdown(false);
      }
      if (showYearLevelDropdown && yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearLevelDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRoleDropdown, showDepartmentDropdown, showCourseDropdown, showYearLevelDropdown]);

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

  // Auto-redirect from success modal
  useEffect(() => {
    if (successModal) {
      const timer = setTimeout(() => {
        setSuccessModal(false);
        onSwitchToLogin();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successModal, onSwitchToLogin]);

  // Update password strength
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.password));
  }, [formData.password]);

  // Validate email function
  const isValidEmail = (email) => {
    // Check if it's a valid email format and ends with @usa.edu.ph
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.toLowerCase().endsWith("@usa.edu.ph");
  };

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

    if (name === "password") {
      setFormData((p) => ({
        ...p,
        [name]: value,
      }));
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
    // Auto-advance step for non-Student roles
    if (roleValue !== "Student") {
      setActiveStep(3); // Skip to step 3 (password)
    }
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

  // Handle dropdown toggle with position calculation
  const handleRoleDropdownToggle = () => {
    const newState = !showRoleDropdown;
    setShowRoleDropdown(newState);
    if (newState) {
      setTimeout(() => {
        setDropdownPosition(prev => ({
          ...prev,
          role: calculateDropdownPosition(roleButtonRef)
        }));
      }, 10);
    }
  };

  const handleDepartmentDropdownToggle = () => {
    const newState = !showDepartmentDropdown;
    setShowDepartmentDropdown(newState);
    if (newState) {
      setTimeout(() => {
        setDropdownPosition(prev => ({
          ...prev,
          department: calculateDropdownPosition(deptButtonRef)
        }));
      }, 10);
    }
  };

  const handleYearLevelDropdownToggle = () => {
    const newState = !showYearLevelDropdown;
    setShowYearLevelDropdown(newState);
    if (newState) {
      setTimeout(() => {
        setDropdownPosition(prev => ({
          ...prev,
          year: calculateDropdownPosition(yearButtonRef, 200)
        }));
      }, 10);
    }
  };

  // Handle keyboard navigation for dropdowns
  const handleDropdownKeyDown = (e, type) => {
    if (e.key === "Escape") {
      if (type === "role") setShowRoleDropdown(false);
      if (type === "dept") setShowDepartmentDropdown(false);
      if (type === "course") setShowCourseDropdown(false);
      if (type === "year") setShowYearLevelDropdown(false);
    }
    if (e.key === "Enter" && type === "role" && !showRoleDropdown) {
      e.preventDefault();
      setShowRoleDropdown(true);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!agreedToTerms) {
      return setMessage("You must agree to the Data Privacy and Terms & Conditions");
    }

    // Validate email - must be a valid email format AND end with @usa.edu.ph
    if (!isValidEmail(formData.email)) {
      return setMessage("Please enter a valid @usa.edu.ph email address (e.g., name@usa.edu.ph)");
    }
    
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

  // Check if step is complete
  const isStepComplete = (step) => {
    switch (step) {
      case 1:
        return formData.name && isValidEmail(formData.email) && formData.id_number && formData.role;
      case 2:
        if (formData.role === "Student") {
          return formData.department && formData.course && formData.year_level;
        } else if (formData.role === "Faculty") {
          return formData.department && (formData.department !== "Other" || formData.otherDepartment);
        } else if (formData.role === "Staff_Office") {
          return formData.department && formData.course;
        }
        return true;
      case 3:
        return formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && agreedToTerms;
      default:
        return false;
    }
  };

  // Render step progress indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${activeStep >= step ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {activeStep > step ? <Check size={16} /> : step}
          </div>
          {step < 3 && (
            <div className={`w-12 h-1 mx-2 ${activeStep > step ? 'bg-red-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
      <div className="ml-4 text-sm text-gray-600">
        {activeStep === 1 && "Basic Info"}
        {activeStep === 2 && "Academic Info"}
        {activeStep === 3 && "Security"}
      </div>
    </div>
  );

  // Render password strength meter
  const renderPasswordStrength = () => (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-xs font-medium text-gray-600">Password Strength:</div>
        <div className="text-xs font-medium">
          {passwordStrength === 0 && <span className="text-red-600">Weak</span>}
          {passwordStrength === 1 && <span className="text-orange-500">Fair</span>}
          {passwordStrength === 2 && <span className="text-yellow-600">Good</span>}
          {passwordStrength >= 3 && <span className="text-green-600">Strong</span>}
        </div>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full ${passwordStrength >= level ? (passwordStrength === 1 ? 'bg-red-500' : passwordStrength === 2 ? 'bg-orange-500' : passwordStrength === 3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Check size={12} className={formData.password.length >= 8 ? "text-green-500" : "text-gray-300"} />
          <span>At least 8 characters</span>
        </div>
        <div className="flex items-center gap-1">
          <Check size={12} className={/[A-Z]/.test(formData.password) ? "text-green-500" : "text-gray-300"} />
          <span>One uppercase letter</span>
        </div>
        <div className="flex items-center gap-1">
          <Check size={12} className={/[0-9]/.test(formData.password) ? "text-green-500" : "text-gray-300"} />
          <span>One number</span>
        </div>
        <div className="flex items-center gap-1">
          <Check size={12} className={/[^A-Za-z0-9]/.test(formData.password) ? "text-green-500" : "text-gray-300"} />
          <span>One special character</span>
        </div>
      </div>
    </div>
  );

  // Render dropdown with proper positioning
  const renderDropdown = (type, content, items, onSelect) => {
    const position = dropdownPosition[type] || "bottom";
    
    return (
      <div 
        className={`absolute z-50 w-full ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto`}
      >
        {items.map((item) => (
          <button
            key={typeof item === 'object' ? item.value : item}
            type="button"
            onClick={() => onSelect(typeof item === 'object' ? item.value : item)}
            className="w-full px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
          >
            {content(item)}
          </button>
        ))}
      </div>
    );
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
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm md:text-base">Notice</p>
                <p className="text-xs md:text-sm">{message}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Container - Full screen white background */}
      <div className="w-full h-full bg-white overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden w-full bg-white pt-6 pb-4 px-6">
          <div className="flex flex-col items-center">
            <div className="flex justify-center gap-4 mb-3">
              <img src={Logo} alt="USA logo" className="h-12 w-12" />
              <img src={lrc} alt="LRC logo" className="h-12 w-12" />
            </div>
            <h1 className="text-lg font-serif font-semibold text-center text-gray-800">
              University of San Agustin
            </h1>
            <p className="text-sm font-semibold text-gray-700 text-center">
              Learning Resource Center
            </p>
            <div className="w-12 h-1 bg-yellow-500 mt-2"></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="w-full h-full max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-white md:rounded-2xl md:border md:border-gray-200 md:overflow-hidden md:flex">
            {/* Left side - University Info - Hidden on mobile, shown on desktop */}
            <div className="hidden md:flex md:w-2/5 bg-yellow-500 p-8 text-white flex-col justify-center items-center text-center">
              <div className="flex justify-around w-full mb-6">
                <img 
                  className="relative w-[100px] h-[100px]" 
                  src={Logo} 
                  alt="University of San Agustin Logo" 
                />
                <img 
                  src={lrc} 
                  alt="Learning Resource Center Logo" 
                  className="relative w-[100px] h-[100px]"
                />
              </div>
              <h1 className="text-xl font-serif font-bold mb-3">
                University of San Agustin
              </h1>
              <div className="w-16 h-1 bg-yellow-400 mb-3"></div>
              <p className="text-lg font-semibold text-white">
                Learning Resource Center
              </p>
              <p className="text-sm mt-4 text-yellow-100">
                Create your account to access library resources and services
              </p>
            </div>

            {/* Right side - Form Content */}
            <div className="w-full md:w-3/5 p-4 md:p-8">
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

                  {/* Step Indicator */}
                  {renderStepIndicator()}

                  {/* Step 1: Basic Information */}
                  {activeStep === 1 && (
                    <>
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
                          autoFocus
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Email (@usa.edu.ph)</label>
                        <input
                          type="email"
                          name="email"
                          placeholder="e.g. juandelacruz@usa.edu.ph"
                          value={formData.email}
                          onChange={handleChange}
                          className={`border p-3 rounded-xl transition-colors duration-300 outline-none focus:ring-2 focus:border-transparent ${formData.email ? (isValidEmail(formData.email) ? 'border-green-500 hover:border-green-600 focus:ring-green-500' : 'border-red-500 hover:border-red-600 focus:ring-red-500') : 'border-gray-300 hover:border-red-500 focus:ring-red-500'}`}
                          required
                        />
                        {formData.email && !isValidEmail(formData.email) && (
                          <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                            <XCircle size={12} />
                            Please enter a valid @usa.edu.ph email address
                          </div>
                        )}
                        {isValidEmail(formData.email) && (
                          <div className="text-green-600 text-xs mt-1 flex items-center gap-1">
                            <Check size={12} />
                            Valid @usa.edu.ph email
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">ID Number</label>
                        <input
                          type="text"
                          name="id_number"
                          placeholder="Enter your 15-digit ID number"
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
                        <div className="text-xs text-gray-500 mt-1">15-digit numeric ID</div>
                      </div>

                      <div className="flex flex-col gap-1" ref={roleDropdownRef}>
                        <label className="text-sm font-medium text-gray-700">Account Role</label>
                        <div className="relative">
                          <button
                            ref={roleButtonRef}
                            type="button"
                            onClick={handleRoleDropdownToggle}
                            onKeyDown={(e) => handleDropdownKeyDown(e, "role")}
                            className="w-full border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-left flex justify-between items-center bg-white"
                          >
                            <span className={formData.role ? "text-gray-800" : "text-gray-500"}>
                              {getRoleDisplayLabel()}
                            </span>
                            <ChevronDown 
                              size={16} 
                              className={`text-gray-400 transition-transform duration-300 ${showRoleDropdown ? 'rotate-180' : ''}`}
                            />
                          </button>
                          
                          {/* Role Dropdown */}
                          {showRoleDropdown && renderDropdown(
                            "role",
                            (item) => <div className="font-medium">{item.label}</div>,
                            roleOptions,
                            handleRoleSelect
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        disabled={!isStepComplete(1)}
                        className="p-3 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </>
                  )}

                  {/* Step 2: Academic Information */}
                  {activeStep === 2 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1 mb-2 self-start"
                      >
                        ← Back to Basic Info
                      </button>

                      {/* Department - Different input types based on role */}
                      {(formData.role === "Student" || formData.role === "Staff_Office" || formData.role === "Faculty") && (
                        <div className="flex flex-col gap-1" ref={deptDropdownRef}>
                          <label className="text-sm font-medium text-gray-700">
                            {formData.role === "Student" ? "Department" : 
                             formData.role === "Faculty" ? "Department" : 
                             "Office/Department"}
                          </label>
                          {formData.role === "Student" ? (
                            <div className="relative">
                              <button
                                ref={deptButtonRef}
                                type="button"
                                onClick={handleDepartmentDropdownToggle}
                                onKeyDown={(e) => handleDropdownKeyDown(e, "dept")}
                                className="w-full border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-left flex justify-between items-center bg-white"
                              >
                                <span className={formData.department ? "text-gray-800" : "text-gray-500"}>
                                  {formData.department ? departmentOptions[formData.department] : "Select Department"}
                                </span>
                                <ChevronDown 
                                  size={16} 
                                  className={`text-gray-400 transition-transform duration-300 ${showDepartmentDropdown ? 'rotate-180' : ''}`}
                                />
                              </button>
                              
                              {/* Department Dropdown */}
                              {showDepartmentDropdown && renderDropdown(
                                "department",
                                (item) => <div className="font-medium">{departmentOptions[item]}</div>,
                                Object.keys(departmentOptions),
                                handleDepartmentSelect
                              )}
                            </div>
                          ) : formData.role === "Faculty" ? (
                            <>
                              <div className="relative">
                                <button
                                  ref={deptButtonRef}
                                  type="button"
                                  onClick={handleDepartmentDropdownToggle}
                                  onKeyDown={(e) => handleDropdownKeyDown(e, "dept")}
                                  className="w-full border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-left flex justify-between items-center bg-white"
                                >
                                  <span className={formData.department ? "text-gray-800" : "text-gray-500"}>
                                    {formData.department === "Other" ? "Other" : formData.department ? departmentOptions[formData.department] : "Select Department"}
                                  </span>
                                  <ChevronDown 
                                    size={16} 
                                    className={`text-gray-400 transition-transform duration-300 ${showDepartmentDropdown ? 'rotate-180' : ''}`}
                                  />
                                </button>
                                
                                {/* Department Dropdown */}
                                {showDepartmentDropdown && (
                                  <div className={`absolute z-50 w-full ${dropdownPosition.department === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto`}>
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
                        <div className="flex flex-col gap-1" ref={courseDropdownRef}>
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
                                  onKeyDown={(e) => handleDropdownKeyDown(e, "course")}
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
                                <div className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
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
                                <div className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg p-4 text-center text-gray-500">
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
                        <div className="flex flex-col gap-1" ref={yearDropdownRef}>
                          <label className="text-sm font-medium text-gray-700">Year Level</label>
                          <div className="relative">
                            <button
                              ref={yearButtonRef}
                              type="button"
                              onClick={handleYearLevelDropdownToggle}
                              onKeyDown={(e) => handleDropdownKeyDown(e, "year")}
                              className="w-full border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-left flex justify-between items-center bg-white"
                            >
                              <span className={formData.year_level ? "text-gray-800" : "text-gray-500"}>
                                {formData.year_level || "Select Year Level"}
                              </span>
                              <ChevronDown 
                                size={16} 
                                className={`text-gray-400 transition-transform duration-300 ${showYearLevelDropdown ? 'rotate-180' : ''}`}
                              />
                            </button>
                            
                            {/* Year Level Dropdown */}
                            {showYearLevelDropdown && renderDropdown(
                              "year",
                              (item) => <div className="font-medium">{item}</div>,
                              getYearLevels(),
                              handleYearLevelSelect
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          className="flex-1 p-3 rounded-xl bg-gray-600 hover:bg-gray-700 font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveStep(3)}
                          disabled={!isStepComplete(2)}
                          className="flex-1 p-3 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Continue
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 3: Security */}
                  {activeStep === 3 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1 mb-2 self-start"
                      >
                        ← Back to {formData.role === "Student" ? "Academic Info" : "Department Info"}
                      </button>

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
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                            aria-label={showPw ? "Hide password" : "Show password"}
                          >
                            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        {renderPasswordStrength()}
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
                            className={`border p-3 rounded-xl w-full transition-colors duration-300 outline-none focus:ring-2 focus:border-transparent ${formData.confirmPassword ? (formData.password === formData.confirmPassword ? 'border-green-500 focus:ring-green-500 hover:border-green-600' : 'border-red-500 focus:ring-red-500 hover:border-red-600') : 'border-gray-300 hover:border-red-500 focus:ring-red-500'}`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw2((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                            aria-label={showPw2 ? "Hide password" : "Show password"}
                          >
                            {showPw2 ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                          <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                            <XCircle size={12} />
                            Passwords do not match
                          </div>
                        )}
                        {formData.confirmPassword && formData.password === formData.confirmPassword && (
                          <div className="text-green-600 text-xs mt-1 flex items-center gap-1">
                            <Check size={12} />
                            Passwords match
                          </div>
                        )}
                      </div>

                      {/* Terms and Conditions Agreement */}
                      <div className="flex items-start gap-3 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <input
                          type="checkbox"
                          id="termsAgreement"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 text-red-600 focus:ring-red-500 rounded h-5 w-5"
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

                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => setActiveStep(2)}
                          className="flex-1 p-3 rounded-xl bg-gray-600 hover:bg-gray-700 font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={loading || !isStepComplete(3)}
                          className="flex-1 p-3 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {loading ? "Processing…" : "Sign Up"}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              ) : (
                /* ======= OTP VERIFY ======= */
                <div className="flex flex-col gap-4 mt-2">
                  <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                    Verify Email
                  </h2>
                  
                  <div className="text-center text-green-700 bg-green-50 p-4 rounded-xl border border-green-200">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle size={24} className="text-green-600" />
                      <p className="font-medium">OTP Sent Successfully!</p>
                    </div>
                    <p className="text-sm">
                      Verification code sent to: <br />
                      <strong className="text-lg">{formData.email}</strong>
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Check your inbox (and spam folder)
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">6-Digit Verification Code</label>
                    <input
                      type="text"
                      placeholder="Enter 6‑digit OTP"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setOtp(value);
                      }}
                      className="border border-gray-300 p-3 rounded-xl hover:border-red-500 transition-colors duration-300 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-center text-xl tracking-widest font-mono"
                      autoFocus
                    />
                    <div className="text-xs text-gray-500 text-center mt-1">
                      Enter the 6-digit code from your email
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleOtpVerify}
                      disabled={loading || otp.length !== 6}
                      className="flex-1 p-3 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Verifying…
                        </span>
                      ) : "Verify OTP"}
                    </button>
                    
                    <button
                      onClick={handleResendOtp}
                      disabled={resendTimerActive}
                      className="p-3 rounded-xl bg-gray-600 hover:bg-gray-700 font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[100px]"
                    >
                      {resendTimerActive ? (
                        <span className="font-mono">{resendCooldown}s</span>
                      ) : "Resend"}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setActiveStep(3);
                    }}
                    className="text-red-600 hover:text-red-800 font-medium text-center mt-2 flex items-center justify-center gap-1"
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
                  className="text-red-600 hover:text-red-800 font-bold cursor-pointer transition-colors duration-300 underline"
                >
                  Login here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full mx-auto text-center animate-scale-in">
            <div className="relative">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl -z-10"></div>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Success!</h2>
            <p className="text-gray-600 mb-4">
              Your account has been created successfully.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Redirecting to login in 3 seconds...
            </p>
            <button
              onClick={goToLogin}
              className="w-full p-3 rounded-xl bg-[#CC0000] hover:bg-[#b80000] font-semibold text-white cursor-pointer transition-colors duration-300 shadow-md hover:shadow-lg"
            >
              Go to Login Now
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
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes scale-in {
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
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}

export default SignUp_User;