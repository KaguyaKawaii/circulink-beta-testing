// EditProfile.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import api from "../utils/api";
import "react-image-crop/dist/ReactCrop.css";
import "../index.css";
import ReactCrop from "react-image-crop";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import ReportProblemModal from "./Modals/ReportProblemModal";

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

const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

// Supported image types
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

async function getCroppedBlob(image, crop, fileType = "image/jpeg", quality = 0.95) {
  if (!crop?.width || !crop?.height) {
    throw new Error("Invalid crop");
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // HD quality - larger output size
  const finalSize = 512; // HD quality output
  canvas.width = finalSize;
  canvas.height = finalSize;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    finalSize,
    finalSize
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        blob.name = "profile-hd.jpg";
        resolve(blob);
      },
      fileType,
      quality
    );
  });
}

// Password Input Component with Eye Icon
const PasswordInput = ({ label, name, value, onChange, required = false, placeholder = "" }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-sm sm:text-base pr-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer focus:outline-none"
          tabIndex="-1"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
};

// Reusable Input Component
const Input = ({ label, name, type = "text", value, onChange, required = false, disabled = false, placeholder = "" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed text-sm sm:text-base"
    />
  </div>
);

function EditProfile({ user, setView }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    course: "",
    year_level: "",
    floor: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [image, setImage] = useState(null);
  const [tempImage, setTempImage] = useState(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Image crop modal states
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [modalImgSrc, setModalImgSrc] = useState("");
  const [crop, setCrop] = useState({ unit: "%", width: 80, height: 80, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Dropdown states
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showYearLevelDropdown, setShowYearLevelDropdown] = useState(false);

  // Check if a course is a graduate program
  const isGraduateProgram = (course) => {
    const graduateKeywords = ["Master", "Doctor", "MBA", "MPA", "MAGC", "MARS", "MAED"];
    return graduateKeywords.some(keyword => course.includes(keyword));
  };

  const fetchUserProfile = async () => {
    try {
      const { data } = await api.get(`/users/${user._id}`);
      if (data.success) {
        setForm({
          name: data.user.name,
          email: data.user.email,
          department: data.user.department || "",
          course: data.user.course || "",
          year_level: data.user.year_level || "",
          floor: data.user.floor || ""
        });

        if (data.user.profilePicture) {
          // Add timestamp to prevent caching and ensure HD quality
          const timestamp = new Date().getTime();
          const profileUrl = data.user.profilePicture.startsWith("http")
            ? `${data.user.profilePicture}?t=${timestamp}`
            : `${import.meta.env.VITE_API_URL}${data.user.profilePicture}?t=${timestamp}`;
          setProfileUrl(profileUrl);
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Failed to load profile.");
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (error || successMsg) {
      setToastVisible(true);
      const timer = setTimeout(() => setToastVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, successMsg]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  // Department dropdown handlers
  const handleDepartmentSelect = (dept) => {
    setForm((p) => ({
      ...p,
      department: dept,
      course: "",
      year_level: "",
    }));
    setShowDepartmentDropdown(false);
  };

  // Course dropdown handlers
  const handleCourseSelect = (course) => {
    setForm((p) => ({
      ...p,
      course: course,
      year_level: "",
    }));
    setShowCourseDropdown(false);
  };

  // Year level dropdown handlers
  const handleYearLevelSelect = (yearLevel) => {
    setForm((p) => ({
      ...p,
      year_level: yearLevel,
    }));
    setShowYearLevelDropdown(false);
  };

  // Get display label for department
  const getDepartmentDisplayLabel = () => {
    if (!form.department) return "Select Department";
    return departmentOptions[form.department] || form.department;
  };

  const openPhotoModal = () => {
    setError("");
    setSuccessMsg("");
    setCompletedCrop(null);
    setCrop({ unit: "%", width: 80, height: 80, aspect: 1 });
    setModalImgSrc("");
    setIsPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setIsPhotoModalOpen(false);
    setModalImgSrc("");
    setCompletedCrop(null);
  };

  const validateImageFile = (file) => {
    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      return "Please select an image file (JPEG, PNG, WebP, GIF).";
    }

    // Check for specific supported image types
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return "Unsupported image format. Please use JPEG, PNG, WebP, or GIF.";
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return "Image size too large. Please select an image under 10MB.";
    }

    return null;
  };

  const onModalFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate the file
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      // Clear the file input
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setModalImgSrc(reader.result.toString());
      setCompletedCrop(null);
      setError(""); // Clear any previous errors
    };
    reader.onerror = () => {
      setError("Failed to read the image file.");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const onImageLoaded = useCallback((img) => {
    imgRef.current = img;
    
    // Safety check for valid image
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      console.warn('Invalid image element provided to onImageLoaded');
      // Set safe default crop
      setCrop({ 
        unit: "%", 
        width: 80, 
        height: 80, 
        x: 10, 
        y: 10,
        aspect: 1 
      });
      return false;
    }

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    console.log('Image loaded with dimensions:', naturalWidth, 'x', naturalHeight);
    
    // Validate dimensions
    if (naturalWidth <= 0 || naturalHeight <= 0 || isNaN(naturalWidth) || isNaN(naturalHeight)) {
      console.error('Invalid image dimensions:', naturalWidth, naturalHeight);
      setCrop({ 
        unit: "%", 
        width: 80, 
        height: 80, 
        x: 10, 
        y: 10,
        aspect: 1 
      });
      return false;
    }

    // Calculate crop size as percentage of the smaller dimension
    const aspectRatio = naturalWidth / naturalHeight;
    let cropSize;
    
    if (aspectRatio > 1) {
      // Wider than tall
      cropSize = (naturalHeight / naturalWidth) * 80;
    } else {
      // Taller than wide or square
      cropSize = (naturalWidth / naturalHeight) * 80;
    }
    
    // Ensure cropSize is a valid number between 10 and 90
    const safeCropSize = Math.max(10, Math.min(90, cropSize || 80));
    const safeX = (100 - safeCropSize) / 2;
    const safeY = (100 - safeCropSize) / 2;

    console.log('Setting crop to:', { width: safeCropSize, height: safeCropSize, x: safeX, y: safeY });

    setCrop({ 
      unit: "%", 
      width: safeCropSize, 
      height: safeCropSize, 
      x: safeX, 
      y: safeY,
      aspect: 1 
    });
    
    return false;
  }, []);

  const onCropComplete = useCallback((crop) => {
    setCompletedCrop(crop);
  }, []);

  const handleSaveCropped = async () => {
    if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) {
      setError("Please select a crop first.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccessMsg("");

      const blob = await getCroppedBlob(imgRef.current, completedCrop, "image/jpeg", 0.95);
      const file = new File([blob], "profile-hd.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("profile", file);

      const response = await api.post(`/users/${user._id}/upload-picture`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log('Upload response:', response.data);

      setSuccessMsg("Profile picture updated successfully in HD quality.");
      await fetchUserProfile();
      closePhotoModal();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Upload error details:", err);
      console.error("Error response:", err.response);
      setError(err.response?.data?.message || "Failed to upload image. Please check if the server is running.");
    } finally {
      setUploading(false);
    }
  };

  // 📌 Profile Picture Reset - FIXED
  const resetProfilePicture = async () => {
    try {
      setUploading(true);
      setError("");
      setSuccessMsg("");
      
      // CORRECT ENDPOINT - Using the working endpoint
      await api.delete(`/users/${user._id}/remove-picture`);
      
      console.log('✅ Profile picture reset successful');
      setSuccessMsg("Profile picture reset to default.");
      await fetchUserProfile();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      console.error("Reset error:", err);
      setError(err.response?.data?.message || err.message || "Failed to reset profile picture.");
    } finally {
      setUploading(false);
    }
  };

  // 📌 Profile Update - FIXED with correct endpoint
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      // CORRECT ENDPOINT - Using the working endpoint from userController
      const response = await api.put(`/users/${user._id}/update-profile`, form);
      
      console.log('✅ Profile update successful:', response.data);
      setSuccessMsg("Profile updated successfully.");
      await fetchUserProfile();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      console.error("Profile update failed:", err);
      setError(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // 📌 Change Password - FIXED with correct endpoint
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError("New passwords do not match.");
        setLoading(false);
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        setError("New password must be at least 8 characters long.");
        setLoading(false);
        return;
      }

      // CORRECT ENDPOINT - Using the working endpoint
      const response = await api.put(`/users/${user._id}/change-password`, {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      
      console.log('✅ Password change successful:', response.data);
      setSuccessMsg("Password changed successfully!");
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

    } catch (err) {
      console.error("Password change error:", err);
      setError(err.response?.data?.message || err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 lg:ml-[250px] lg:w-[calc(100%-250px)]">
      {/* Header with enhanced design */}
      <header className="bg-white/80 backdrop-blur-sm px-4 sm:px-6 h-[70px] flex items-center justify-between shadow-sm border-b border-gray-200/80 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Edit Profile</h1>
        </div>

        <button
          type="button"
          onClick={() => setView("profile")}
          className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-all duration-300 cursor-pointer bg-gray-50 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Back to Profile</span>
        </button>
      </header>

      {/* Toast Notifications with animation */}
      {toastVisible && (error || successMsg) && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down w-full max-w-sm px-4">
          <div
            className={`w-full text-center py-3 px-4 rounded-xl font-medium text-white shadow-xl flex items-center justify-center space-x-2 ${
              error ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-green-500 to-green-600"
            }`}
          >
            {error ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{error || successMsg}</span>
          </div>
        </div>
      )}

      {/* Main Content - Enhanced spacing and design */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-6 lg:gap-8">
          {/* Left: Profile Picture Section - Enhanced card design */}
          <div className="w-full xl:w-2/5 flex flex-col items-center">
            <div className="w-full max-w-md xl:max-w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-600 rounded-full mr-3"></div>
                Profile Picture
              </h3>

              <div className="flex flex-col items-center">
                <div className="relative group mb-6">
                  <div className="relative w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    {profileUrl ? (
                      <img
                        src={profileUrl}
                        alt="Profile"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="eager"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/default-avatar.png";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white text-3xl sm:text-4xl lg:text-5xl font-semibold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Animated ring effect */}
                    <div className="absolute inset-0 rounded-full ring-4 ring-white/50 ring-offset-2 ring-offset-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  <button
                    type="button"
                    onClick={openPhotoModal}
                    className="absolute -bottom-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-3 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Change profile photo"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={openPhotoModal}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={resetProfilePicture}
                    disabled={uploading}
                    className="flex-1 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-red-300 hover:text-red-600 py-3 px-4 rounded-xl font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {uploading ? "Resetting..." : "Reset"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Profile and Password Forms - Enhanced design */}
          <div className="w-full xl:w-3/5 space-y-6">
            {/* Profile Information Form */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-100 pb-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-600 rounded-full mr-3"></div>
                  Account Information
                </h3>
                <span className="text-xs text-gray-400 mt-1 sm:mt-0">Last updated: {new Date().toLocaleDateString()}</span>
              </div>

              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Full Name - Full width on mobile */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-sm sm:text-base"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Department</label>
                    {user.role === "Staff_Office" ? (
                      <input
                        type="text"
                        name="department"
                        value={form.department}
                        onChange={handleChange}
                        placeholder="Enter department"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-sm sm:text-base"
                        required
                      />
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-sm sm:text-base text-left flex justify-between items-center hover:border-red-500 group"
                        >
                          <span className={form.department ? "text-gray-800" : "text-gray-500"}>
                            {getDepartmentDisplayLabel()}
                          </span>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${showDepartmentDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Department Dropdown */}
                        {showDepartmentDropdown && (
                          <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fadeIn">
                            {Object.entries(departmentOptions).map(([key, value]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleDepartmentSelect(key)}
                                className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:text-red-700 transition-all duration-200 border-b border-gray-100 last:border-b-0 text-sm sm:text-base"
                              >
                                <div className="font-medium">{value}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Course - For Students */}
                  {user.role === "Student" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Course</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-sm sm:text-base text-left flex justify-between items-center hover:border-red-500 group"
                          disabled={!form.department}
                        >
                          <span className={form.course ? "text-gray-800" : "text-gray-500"}>
                            {form.course || (form.department ? "Select Course" : "Select Department First")}
                          </span>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${showCourseDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Course Dropdown */}
                        {showCourseDropdown && form.department && courseOptions[form.department] && (
                          <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fadeIn">
                            {courseOptions[form.department].map((course) => (
                              <button
                                key={course}
                                type="button"
                                onClick={() => handleCourseSelect(course)}
                                className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:text-red-700 transition-all duration-200 border-b border-gray-100 last:border-b-0 text-sm sm:text-base"
                              >
                                <div className="font-medium">{course}</div>
                                {isGraduateProgram(course) && (
                                  <div className="text-xs text-gray-500 mt-1">Graduate Program</div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Year Level - For Students */}
                  {user.role === "Student" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Year Level</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowYearLevelDropdown(!showYearLevelDropdown)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-sm sm:text-base text-left flex justify-between items-center hover:border-red-500 group"
                          disabled={!form.course && !form.department}
                        >
                          <span className={form.year_level ? "text-gray-800" : "text-gray-500"}>
                            {form.year_level || (form.course ? "Select Year Level" : "Select Course First")}
                          </span>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${showYearLevelDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Year Level Dropdown */}
                        {showYearLevelDropdown && (
                          <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fadeIn">
                            {(() => {
                              let yearLevelsToShow = yearLevels;
                              if (form.department === "SHS") {
                                yearLevelsToShow = ["Grade 11", "Grade 12"];
                              } else if (form.department === "COL") {
                                yearLevelsToShow = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
                              } else if (isGraduateProgram(form.course)) {
                                if (form.course.includes("Doctor")) {
                                  yearLevelsToShow = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
                                } else {
                                  yearLevelsToShow = ["1st Year", "2nd Year"];
                                }
                              }
                              return yearLevelsToShow.map((yearLevel) => (
                                <button
                                  key={yearLevel}
                                  type="button"
                                  onClick={() => handleYearLevelSelect(yearLevel)}
                                  className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:text-red-700 transition-all duration-200 border-b border-gray-100 last:border-b-0 text-sm sm:text-base"
                                >
                                  <div className="font-medium">{yearLevel}</div>
                                </button>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Floor Assignment - For Staff */}
                  {user.role === "Staff" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Floor Assignment</label>
                      <input
                        type="text"
                        name="floor"
                        value={form.floor}
                        onChange={handleChange}
                        placeholder="Enter floor assignment"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-sm sm:text-base"
                      />
                    </div>
                  )}

                  {/* Email - Disabled */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed text-sm sm:text-base pr-12"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 group">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg">
                          Email cannot be changed
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ID Number - Disabled */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-600 mb-2">ID Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={user.id_number}
                        disabled
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed text-sm sm:text-base pr-12"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 group">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg">
                          ID Number cannot be changed
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-8 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-100 pb-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-600 rounded-full mr-3"></div>
                  Change Password
                </h3>
                <span className="text-xs text-gray-400 mt-1 sm:mt-0">Use strong password for security</span>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <PasswordInput
                      label="Current Password"
                      name="oldPassword"
                      value={passwordForm.oldPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <PasswordInput
                      label="New Password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <PasswordInput
                      label="Confirm New Password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                {/* Password strength indicator */}
                {passwordForm.newPassword && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-1 w-1/4 rounded-full transition-all duration-300 ${
                        passwordForm.newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`h-1 w-1/4 rounded-full transition-all duration-300 ${
                        passwordForm.newPassword.length >= 8 && /[A-Z]/.test(passwordForm.newPassword) ? 'bg-green-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`h-1 w-1/4 rounded-full transition-all duration-300 ${
                        passwordForm.newPassword.length >= 8 && /[0-9]/.test(passwordForm.newPassword) ? 'bg-green-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`h-1 w-1/4 rounded-full transition-all duration-300 ${
                        passwordForm.newPassword.length >= 8 && /[!@#$%^&*]/.test(passwordForm.newPassword) ? 'bg-green-500' : 'bg-gray-200'
                      }`}></div>
                    </div>
                    <p className="text-xs text-gray-500">Password must be at least 8 characters with uppercase, number, and special character</p>
                  </div>
                )}

                <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-8 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Changing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with enhanced design */}
      <footer className="mt-auto bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          {/* Copyright */}
          <div className="text-sm text-gray-500 order-2 sm:order-1 flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
            © {new Date().getFullYear()} <span className="font-semibold text-gray-700">USA-FLD CircuLink</span>
          </div>

          {/* Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="group flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 transition-all duration-300 cursor-pointer order-1 sm:order-2 px-4 py-2 hover:bg-red-50 rounded-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transition-transform group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Report Problem
          </button>
        </div>
      </footer>

      {/* Modal Components */}
      {showReportModal && (
        <ReportProblemModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          user={user}
        />
      )}

      {/* Photo Upload Modal - Enhanced design */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-auto max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                  Upload Profile Picture
                </h3>
                <button
                  type="button"
                  onClick={closePhotoModal}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {!modalImgSrc ? (
                <div className="border-3 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-red-400 transition-all duration-300 cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onModalFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="w-10 h-10 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-2 font-medium text-lg">Click to upload an image</p>
                    <p className="text-sm text-gray-400">Supports: JPG, PNG, WebP, GIF (Max 10MB)</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={onCropComplete}
                      aspect={1}
                      circularCrop
                      keepSelection
                      minWidth={40}
                      minHeight={40}
                    >
                      <img
                        ref={imgRef}
                        src={modalImgSrc}
                        onLoad={(e) => onImageLoaded(e.currentTarget)}
                        alt="Crop preview"
                        className="max-w-full max-h-[50vh] sm:max-h-[400px] object-contain rounded-xl"
                        onError={(e) => {
                          console.error("Failed to load image in crop modal");
                          setError("Failed to load the selected image. Please try another one.");
                          setModalImgSrc("");
                        }}
                      />
                    </ReactCrop>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setModalImgSrc("");
                        setCompletedCrop(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-red-300 hover:text-red-600 transition-all duration-300 cursor-pointer font-medium text-sm sm:text-base flex items-center justify-center gap-2 order-2 sm:order-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Choose Different
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCropped}
                      disabled={uploading || !completedCrop}
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2 order-1 sm:order-2 shadow-lg hover:shadow-xl"
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Photo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}

export default EditProfile;