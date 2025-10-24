import React, { useEffect, useRef, useState, useCallback } from "react";
import api from "../utils/api";
import "react-image-crop/dist/ReactCrop.css";
import "../index.css";
import ReactCrop from "react-image-crop";
import { ChevronDown } from "lucide-react";

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

// Reusable Input Component
const Input = ({ label, name, type = "text", value, onChange, required = false, disabled = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed text-sm sm:text-base"
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
          department: data.user.department,
          course: data.user.course,
          year_level: data.user.year_level,
          floor: data.user.floor || ""
        });

        if (data.user.profilePicture) {
          // Add timestamp to prevent caching and ensure HD quality
          const timestamp = new Date().getTime();
          const profileUrl = data.user.profilePicture.startsWith("http")
            ? `${data.user.profilePicture}?t=${timestamp}`
            : `http://localhost:5000${data.user.profilePicture}?t=${timestamp}`;
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
      const timer = setTimeout(() => setToastVisible(false), 2000);
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

      // ✅ FIXED: Use the correct API path with /api prefix
      const uploadUrl = `http://localhost:5000/api/users/${user._id}/upload-picture`;
      console.log('Uploading to:', uploadUrl);
      console.log('User ID:', user._id);
      console.log('File size:', blob.size);
      console.log('File type:', blob.type);

      const response = await api.post(uploadUrl, formData, {
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

  const resetProfilePicture = async () => {
    try {
      setUploading(true);
      setError("");
      setSuccessMsg("");
      
      // ✅ FIXED: Use the correct API path with /api prefix
      await api.delete(`/api/users/${user._id}/remove-picture`);
      setSuccessMsg("Profile picture reset to default.");
      await fetchUserProfile(); // Refresh profile data
      
      // Auto-refresh the page after successful reset
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Reset error:", err);
      setError(err.response?.data?.message || "Failed to reset profile picture.");
    } finally {
      setUploading(false);
    }
  };

const handleProfileSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  setSuccessMsg("");

  try {
    // ✅ FIXED: Use endpoints WITHOUT /api prefix
    const endpoints = [
      `/users/${user._id}/update-profile`,  // This should work
      `/users/update-profile/${user._id}`,
      `/users/profile/${user._id}`
    ];

    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying profile update endpoint: ${endpoint}`);
        const response = await api.put(endpoint, form);
        
        console.log('✅ Profile update successful via:', endpoint);
        console.log('Update response:', response.data);
        
        setSuccessMsg("Profile updated successfully.");
        await fetchUserProfile();
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return; // Success, exit function
        
      } catch (err) {
        lastError = err;
        console.log(`❌ Failed with ${endpoint}:`, err.response?.status);
        if (err.response?.status !== 404) {
          // If it's not a 404, show that error instead
          throw err;
        }
        continue; // Try next endpoint only for 404 errors
      }
    }

    // If all endpoints failed with 404
    throw new Error(`Profile update service is currently unavailable.`);

  } catch (err) {
    console.error("Profile update failed:", err);
    
    if (err.response?.status === 404) {
      setError(`Profile update service unavailable. Please try again later.`);
    } else if (err.message.includes("Profile update service")) {
      setError(err.message);
    } else {
      setError(err.response?.data?.message || "Failed to update profile.");
    }
  } finally {
    setLoading(false);
  }
};

// 📌 Change Password - FIXED with correct endpoints
const handlePasswordSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  setSuccessMsg("");

  try {
    // Validate passwords
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

    console.log("🔄 Attempting password change...");
    console.log("User ID:", user._id);
    
    // ✅ FIXED: Use endpoints WITHOUT /api prefix since your axios instance already adds it
    const endpoints = [
      `/users/${user._id}/change-password`,  // This is the correct one
      `/users/change-password/${user._id}`,
      `/users/profile/change-password`
    ];

    let success = false;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await api.put(endpoint, {
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        });
        
        console.log('✅ Password change successful via:', endpoint);
        console.log('Response:', response.data);
        
        setSuccessMsg("Password changed successfully!");
        setPasswordForm({
          oldPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        success = true;
        break; // Exit loop on success
        
      } catch (err) {
        console.log(`❌ Failed with ${endpoint}:`, err.response?.status);
        
        // If it's not a 404, show the actual error
        if (err.response?.status !== 404) {
          throw err;
        }
        // Continue to next endpoint for 404 errors
      }
    }

    if (!success) {
      throw new Error("Password change service is currently unavailable. Please try again later.");
    }

  } catch (err) {
    console.error("Password change error:", err);
    
    if (err.response?.data?.message) {
      setError(err.response.data.message);
    } else if (err.message.includes("Password change service")) {
      setError(err.message);
    } else {
      setError("Failed to change password. Please check your current password.");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="w-full min-h-screen flex flex-col bg-gray-50 lg:ml-[250px] lg:w-[calc(100%-250px)]">
      {/* Header */}
      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">Edit Profile</h1>

        <button
          type="button"
          onClick={() => setView("profile")}
          className="text-sm text-gray-500 hover:text-gray-700 transition flex items-center cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Back to Profile</span>
        </button>
      </header>

      {/* Toast Notifications */}
      {toastVisible && (error || successMsg) && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down w-full max-w-sm px-4">
          <div
            className={`w-full text-center py-3 px-4 rounded-lg font-medium text-white shadow-lg ${
              error ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {error || successMsg}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left: Profile Picture Section - Made wider */}
          <div className="w-full lg:w-2/5 flex flex-col items-center">
            <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Profile Picture</h3>

              <div className="flex flex-col items-center">
                <div className="relative group mb-6">
                  <div className="relative w-40 h-40 lg:w-48 lg:h-48 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    {profileUrl ? (
                      <img
                        src={profileUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        loading="eager"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/default-avatar.png";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-400 to-red-600 text-white text-4xl font-semibold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={openPhotoModal}
                    className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center focus:opacity-100 cursor-pointer"
                    aria-label="Change profile photo"
                  >
                    <div className="bg-white p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-gray-800"
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
                    </div>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={openPhotoModal}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-4 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
                  >
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={resetProfilePicture}
                    disabled={uploading}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 px-4 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? "Resetting..." : "Reset"}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  Max 10MB • HD quality output
                </p>
              </div>
            </div>
          </div>

          {/* Right: Profile and Password Forms - Made wider */}
          <div className="w-full lg:w-3/5 space-y-6">
            {/* Profile Information Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-100 pb-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Account Information</h3>
              </div>

              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base"
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base"
                        required
                      />
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base text-left flex justify-between items-center hover:border-red-500"
                        >
                          <span className={form.department ? "text-gray-800" : "text-gray-500"}>
                            {getDepartmentDisplayLabel()}
                          </span>
                          <ChevronDown size={18} className="text-gray-400" />
                        </button>
                        
                        {/* Department Dropdown */}
                        {showDepartmentDropdown && (
                          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
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
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base text-left flex justify-between items-center hover:border-red-500"
                        >
                          <span className={form.course ? "text-gray-800" : "text-gray-500"}>
                            {form.course || "Select Course"}
                          </span>
                          <ChevronDown size={18} className="text-gray-400" />
                        </button>
                        
                        {/* Course Dropdown */}
                        {showCourseDropdown && form.department && courseOptions[form.department] && (
                          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {courseOptions[form.department].map((course) => (
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
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base text-left flex justify-between items-center hover:border-red-500"
                        >
                          <span className={form.year_level ? "text-gray-800" : "text-gray-500"}>
                            {form.year_level || "Select Year Level"}
                          </span>
                          <ChevronDown size={18} className="text-gray-400" />
                        </button>
                        
                        {/* Year Level Dropdown */}
                        {showYearLevelDropdown && (
                          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
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
                                  className="w-full px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base"
                      />
                    </div>
                  )}

                  {/* Email - Disabled */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Email</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed text-base"
                    />
                    <div className="absolute top-11 right-3 group">
                      <svg
                        className="w-5 h-5 text-gray-400 cursor-pointer"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Email cannot be changed
                      </div>
                    </div>
                  </div>

                  {/* ID Number - Disabled */}
                  <div className="relative ">
                    <label className="block text-sm font-medium text-gray-600 mb-2">ID Number</label>
                    <input
                      type="text"
                      value={user.id_number}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed text-base"
                    />
                    <div className="absolute top-11 right-3 group">
                      <svg
                        className="w-5 h-5 text-gray-400 cursor-pointer"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <div className="absolute   bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        ID Number cannot be changed
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-8 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-100 pb-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="oldPassword"
                      value={passwordForm.oldPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition text-base"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-8 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  >
                    {loading ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Upload Profile Picture</h3>
                <button
                  type="button"
                  onClick={closePhotoModal}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {!modalImgSrc ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 transition-colors cursor-pointer bg-gray-50">
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
                    <svg
                      className="w-16 h-16 mx-auto text-gray-400 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-600 mb-2 font-medium text-lg">Click to upload an image</p>
                    <p className="text-gray-500">Max 10MB</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-4">
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
                        className="max-w-full max-h-[400px] object-contain rounded-lg"
                        onError={(e) => {
                          console.error("Failed to load image in crop modal");
                          setError("Failed to load the selected image. Please try another one.");
                          setModalImgSrc("");
                        }}
                      />
                    </ReactCrop>
                  </div>

                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setModalImgSrc("");
                        setCompletedCrop(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition cursor-pointer font-medium"
                    >
                      Choose Different
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCropped}
                      disabled={uploading || !completedCrop}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? "Uploading..." : "Save Photo"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default EditProfile;