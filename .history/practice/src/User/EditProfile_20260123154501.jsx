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

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

async function getCroppedBlob(image, crop, fileType = "image/jpeg", quality = 0.95) {
  if (!crop?.width || !crop?.height) {
    throw new Error("Invalid crop");
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const finalSize = 512;
  canvas.width = finalSize;
  canvas.height = finalSize;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

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

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [modalImgSrc, setModalImgSrc] = useState("");
  const [crop, setCrop] = useState({ unit: "%", width: 80, height: 80, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showYearLevelDropdown, setShowYearLevelDropdown] = useState(false);

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
      const timer = setTimeout(() => setToastVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [error, successMsg]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const handleDepartmentSelect = (dept) => {
    setForm((p) => ({
      ...p,
      department: dept,
      course: "",
      year_level: "",
    }));
    setShowDepartmentDropdown(false);
  };

  const handleCourseSelect = (course) => {
    setForm((p) => ({
      ...p,
      course: course,
      year_level: "",
    }));
    setShowCourseDropdown(false);
  };

  const handleYearLevelSelect = (yearLevel) => {
    setForm((p) => ({
      ...p,
      year_level: yearLevel,
    }));
    setShowYearLevelDropdown(false);
  };

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
    if (!file.type.startsWith("image/")) {
      return "Please select an image file (JPEG, PNG, WebP, GIF).";
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return "Unsupported image format. Please use JPEG, PNG, WebP, or GIF.";
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return "Image size too large. Please select an image under 10MB.";
    }

    return null;
  };

  const onModalFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setModalImgSrc(reader.result.toString());
      setCompletedCrop(null);
      setError("");
    };
    reader.onerror = () => {
      setError("Failed to read the image file.");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const onImageLoaded = useCallback((img) => {
    imgRef.current = img;
    
    if (!img || !img.naturalWidth || !img.naturalHeight) {
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
    
    if (naturalWidth <= 0 || naturalHeight <= 0 || isNaN(naturalWidth) || isNaN(naturalHeight)) {
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

    const aspectRatio = naturalWidth / naturalHeight;
    let cropSize;
    
    if (aspectRatio > 1) {
      cropSize = (naturalHeight / naturalWidth) * 80;
    } else {
      cropSize = (naturalWidth / naturalHeight) * 80;
    }
    
    const safeCropSize = Math.max(10, Math.min(90, cropSize || 80));
    const safeX = (100 - safeCropSize) / 2;
    const safeY = (100 - safeCropSize) / 2;

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

      const uploadUrl = `${import.meta.env.VITE_API_URL}/api/users/${user._id}/upload-picture`;
      const response = await api.post(uploadUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMsg("Profile picture updated successfully in HD quality.");
      await fetchUserProfile();
      closePhotoModal();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Upload error details:", err);
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
      
      const endpoints = [
        `/api/users/${user._id}/remove-picture`,
        `/users/${user._id}/remove-picture`,
      ];

      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          await api.delete(endpoint);
          
          setSuccessMsg("Profile picture reset to default.");
          await fetchUserProfile();
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          success = true;
          break;
          
        } catch (err) {
          if (err.response?.status !== 404) {
            throw err;
          }
        }
      }

      if (!success) {
        throw new Error("Profile picture reset service unavailable.");
      }
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to reset profile picture.");
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
      const endpoints = [
        `/api/users/${user._id}/update-profile`,
        `/api/users/update-profile/${user._id}`,
        `/api/users/profile/${user._id}`,
        `/users/${user._id}/update-profile`,
      ];

      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.put(endpoint, form);
          
          setSuccessMsg("Profile updated successfully.");
          await fetchUserProfile();
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
          
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      throw new Error(`Profile update service unavailable. Tried ${endpoints.length} endpoints.`);

    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

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

      const endpoints = [
        `/api/users/${user._id}/change-password`,
        `/api/users/change-password/${user._id}`,
        `/users/${user._id}/change-password`,
      ];

      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.put(endpoint, {
            oldPassword: passwordForm.oldPassword,
            newPassword: passwordForm.newPassword
          });
          
          setSuccessMsg("Password changed successfully!");
          setPasswordForm({
            oldPassword: "",
            newPassword: "",
            confirmPassword: ""
          });
          success = true;
          break;
          
        } catch (err) {
          if (err.response?.status !== 404) {
            throw err;
          }
        }
      }

      if (!success) {
        throw new Error("Password change service unavailable.");
      }

    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex flex-col bg-gray-50 lg:ml-[250px] lg:w-[calc(100%-250px)]">
      {/* Header - Unchanged */}
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

      {/* Toast Notifications - Enhanced */}
      {toastVisible && (error || successMsg) && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div
            className={`w-full flex items-center justify-between p-4 rounded-xl shadow-lg border ${
              error 
                ? "bg-red-50 border-red-200 text-red-800" 
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${error ? "bg-red-500" : "bg-emerald-500"}`}></div>
              <span className="font-medium">{error || successMsg}</span>
            </div>
            <button
              onClick={() => setToastVisible(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Picture Section */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Picture</h2>
                  <p className="text-sm text-gray-600">Upload a clear photo of yourself</p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="w-48 h-48 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
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
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white text-5xl font-bold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute -bottom-2 -right-2">
                      <button
                        type="button"
                        onClick={openPhotoModal}
                        className="bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
                      >
                        <svg className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      type="button"
                      onClick={openPhotoModal}
                      className="col-span-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={resetProfilePicture}
                      disabled={uploading}
                      className="col-span-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 py-3 px-4 rounded-xl font-medium transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                          Resetting
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Reset
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      Supported formats: JPG, PNG, WebP, GIF
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Max size: 10MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Forms Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Information Form */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900">Account Information</h2>
                  <p className="text-sm text-gray-600 mt-1">Update your personal details</p>
                </div>

                <form onSubmit={handleProfileSubmit}>
                  <div className="p-6">
                    <div className="space-y-6">
                      {/* Full Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 placeholder-gray-400"
                            placeholder="Enter your full name"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Department */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Department
                          </label>
                          {user.role === "Staff_Office" ? (
                            <input
                              type="text"
                              name="department"
                              value={form.department}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                              required
                            />
                          ) : (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                                className={`w-full px-4 py-3 border rounded-xl text-left flex justify-between items-center transition-all duration-300 ${
                                  form.department
                                    ? "border-gray-200 bg-white text-gray-900"
                                    : "border-gray-200 bg-white text-gray-500"
                                } hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
                              >
                                <span>{getDepartmentDisplayLabel()}</span>
                                <ChevronDown size={20} className="text-gray-400" />
                              </button>
                              
                              {showDepartmentDropdown && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowDepartmentDropdown(false)}
                                  />
                                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
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
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Course - For Students */}
                        {user.role === "Student" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Course
                            </label>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                                className={`w-full px-4 py-3 border rounded-xl text-left flex justify-between items-center transition-all duration-300 ${
                                  form.course
                                    ? "border-gray-200 bg-white text-gray-900"
                                    : "border-gray-200 bg-white text-gray-500"
                                } hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
                              >
                                <span className="truncate">{form.course || "Select Course"}</span>
                                <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                              </button>
                              
                              {showCourseDropdown && form.department && courseOptions[form.department] && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowCourseDropdown(false)}
                                  />
                                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
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
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Year Level - For Students */}
                        {user.role === "Student" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Year Level
                            </label>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowYearLevelDropdown(!showYearLevelDropdown)}
                                className={`w-full px-4 py-3 border rounded-xl text-left flex justify-between items-center transition-all duration-300 ${
                                  form.year_level
                                    ? "border-gray-200 bg-white text-gray-900"
                                    : "border-gray-200 bg-white text-gray-500"
                                } hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
                              >
                                <span>{form.year_level || "Select Year Level"}</span>
                                <ChevronDown size={20} className="text-gray-400" />
                              </button>
                              
                              {showYearLevelDropdown && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowYearLevelDropdown(false)}
                                  />
                                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
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
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Floor Assignment - For Staff */}
                        {user.role === "Staff" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Floor Assignment
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                name="floor"
                                value={form.floor}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                                placeholder="Enter floor assignment"
                              />
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email - Disabled */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              value={user.email}
                              disabled
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="relative group">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                                  Email cannot be changed
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ID Number - Disabled */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ID Number
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={user.id_number}
                              disabled
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="relative group">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                                  ID Number cannot be changed
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-8 rounded-xl font-medium transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving Changes...
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
                  </div>
                </form>
              </div>

              {/* Change Password Form */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
                  <p className="text-sm text-gray-600 mt-1">Update your account password</p>
                </div>

                <form onSubmit={handlePasswordSubmit}>
                  <div className="p-6">
                    <div className="space-y-6">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            name="oldPassword"
                            value={passwordForm.oldPassword}
                            onChange={handlePasswordChange}
                            required
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 placeholder-gray-400"
                            placeholder="Enter current password"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* New Password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              name="newPassword"
                              value={passwordForm.newPassword}
                              onChange={handlePasswordChange}
                              required
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 placeholder-gray-400"
                              placeholder="Enter new password"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Minimum 8 characters</p>
                        </div>

                        {/* Confirm New Password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              name="confirmPassword"
                              value={passwordForm.confirmPassword}
                              onChange={handlePasswordChange}
                              required
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 placeholder-gray-400"
                              placeholder="Confirm new password"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-8 rounded-xl font-medium transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Changing Password...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            Change Password
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-auto overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Upload Profile Picture</h3>
                  <p className="text-sm text-gray-600 mt-1">Crop your photo to fit the circular frame</p>
                </div>
                <button
                  type="button"
                  onClick={closePhotoModal}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {!modalImgSrc ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-3 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-red-400 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onModalFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-800 font-medium text-lg mb-2">Click to upload an image</p>
                    <p className="text-gray-600 text-sm">Drag and drop or click to browse</p>
                    <p className="text-gray-500 text-xs mt-4">JPG, PNG, WebP, GIF • Max 10MB</p>
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
                          setError("Failed to load the selected image. Please try another one.");
                          setModalImgSrc("");
                        }}
                      />
                    </ReactCrop>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setModalImgSrc("");
                        setCompletedCrop(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition cursor-pointer font-medium flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Choose Different
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={closePhotoModal}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition cursor-pointer font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCropped}
                        disabled={uploading || !completedCrop}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save Photo
                          </>
                        )}
                      </button>
                    </div>
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