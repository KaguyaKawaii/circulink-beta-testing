import React, { useState, useEffect } from "react";
import { 
  X, User, Mail, IdCard, Shield, Building, GraduationCap, 
  Layers, Calendar, Clock, CheckCircle, AlertCircle, Save,
  Upload, Image
} from "lucide-react";
import axios from "axios";

const courseOptions = {
  SHS: ["STEM", "ABM", "HUMSS"],
  CLASE: [
    // Undergraduate Programs
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
    // Graduate Programs - Master's
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
    // Graduate Programs - PhD
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
    // Graduate Programs
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

const floorOptions = ["Ground Floor", "Second Floor", "Third Floor", "Fourth Floor", "Fifth Floor"];

// Check if a course is a graduate program
const isGraduateProgram = (course) => {
  const graduateKeywords = ["Master", "Doctor", "MBA", "MPA", "MAGC", "MARS", "MAED"];
  return graduateKeywords.some(keyword => course.includes(keyword));
};

export default function UserFormModal({ mode, user, onClose, onSuccess }) {
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const [form, setForm] = useState(
    user || {
      name: "",
      email: "",
      id_number: "",
      role: "Student",
      department: "",
      course: "",
      yearLevel: "",
      floor: "",
      password: "",
      verified: false,
      profilePicture: null
    }
  );
  const [saving, setSaving] = useState(false);
  const [otherDepartment, setOtherDepartment] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imgTimestamp, setImgTimestamp] = useState(Date.now());

  // Check if department is "Other" (for Faculty)
  const isOtherDepartment = form.department === "Other";

  useEffect(() => {
    if (user && user.department && !Object.keys(courseOptions).includes(user.department)) {
      setOtherDepartment(user.department);
      setForm(prev => ({ ...prev, department: "Other" }));
    }
  }, [user]);

  useEffect(() => {
    if (form.role !== "Student") {
      setForm((f) => ({ ...f, course: "", yearLevel: "" }));
    }
    if (form.role !== "Staff") {
      setForm((f) => ({ ...f, floor: "" }));
    }
  }, [form.role]);

  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getProfilePictureUrl = () => {
    if (previewUrl) return previewUrl;
    if (!user?.profilePicture) return null;
    if (user.profilePicture.startsWith("http")) {
      return `${user.profilePicture}?t=${imgTimestamp}`;
    } else {
      return `${import.meta.env.VITE_API_URL}${user.profilePicture}?t=${imgTimestamp}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Determine the final department value
      let finalDepartment = form.department;
      if (form.role === "Faculty" && form.department === "Other") {
        finalDepartment = otherDepartment;
      }

      const payload = {
        name: form.name,
        email: form.email,
        id_number: form.id_number,
        role: form.role,
        department: form.role === "Staff" ? "N/A" : finalDepartment || "N/A",
        course: form.role === "Student" ? form.course || "N/A" : "N/A",
        yearLevel: form.role === "Student" ? form.yearLevel || "N/A" : "N/A",
        floor: form.role === "Staff" ? form.floor || "N/A" : "N/A",
        password: form.password || undefined,
        verified: form.verified,
      };

      let response;
      const formData = new FormData();
      
      // Append all payload fields
      for (let key in payload) {
        if (payload[key] !== undefined) formData.append(key, payload[key]);
      }
      
      // Append profile file if exists
      if (profileFile) {
        formData.append("profile", profileFile);
      }

      if (isEdit) {
        response = await axios.put(
          `${import.meta.env.VITE_API_URL}/api/users/admin-edit/${user._id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } else if (isAdd) {
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/users/add-user`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      // Pass the user data to onSuccess
      if (response && response.data.success) {
        onSuccess(response.data.user);
      } else {
        throw new Error(response?.data?.message || "Operation failed");
      }

    } catch (err) {
      console.error("Form submission error:", err);
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const EditableField = ({ icon, label, value, onChange, type = "text", options = null, required = false }) => (
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-gray-100 rounded-full text-gray-600">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-normal text-gray-500 mb-1">{label}</p>
        {options ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white"
            required={required}
          >
            <option value="">Select {label}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            rows="3"
            required={required}
          />
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            required={required}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg overflow-hidden max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <header className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEdit ? "Edit User" : "Add New User"}
          </h2>
          <button 
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </header>

        {/* Modal Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
            {/* Profile Picture + Basic Status */}
            <div className="flex flex-col items-center w-full lg:w-1/3">
              <div className="relative w-40 h-40 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden mb-4 group">
                {getProfilePictureUrl() ? (
                  <img
                    src={getProfilePictureUrl()}
                    alt={`${form.name || 'User'}'s profile`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={64} className="text-gray-400" />
                  </div>
                )}
                
                {/* Upload Overlay */}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload size={24} className="text-white" />
                </label>
              </div>

              {/* Status Badges */}
              <div className="flex flex-col gap-2 mb-4 items-center">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${
                    form.verified 
                      ? "bg-green-50 text-green-700 border border-green-100" 
                      : "bg-gray-50 text-gray-600 border border-gray-200"
                  }`}>
                    {form.verified ? "Verified" : "Unverified"}
                  </span>
                </div>

                {/* Verified Checkbox */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={form.verified}
                    onChange={(e) => handleChange("verified", e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="verified" className="text-sm text-gray-700">
                    Mark as verified
                  </label>
                </div>
              </div>

              {/* User ID Display */}
              <div className="text-sm text-gray-600 mt-2 text-center">
                <span className="font-medium">User ID:</span>{" "}
                <span className="font-mono text-gray-800">{user?._id?.slice(-8) || "New User"}</span>
              </div>
            </div>

            {/* User Details Form */}
            <div className="w-full lg:w-2/3 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-700 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <User size={18} className="text-gray-500" /> Basic Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <EditableField
                    icon={<User size={16} />}
                    label="Full Name"
                    value={form.name}
                    onChange={(val) => handleChange("name", val)}
                    required
                  />
                  <EditableField
                    icon={<Mail size={16} />}
                    label="Email"
                    value={form.email}
                    onChange={(val) => handleChange("email", val)}
                    type="email"
                    required
                  />
                  <EditableField
                    icon={<IdCard size={16} />}
                    label="ID Number"
                    value={form.id_number}
                    onChange={(val) => handleChange("id_number", val)}
                    required
                  />
                  <EditableField
                    icon={<Shield size={16} />}
                    label="Role"
                    value={form.role}
                    onChange={(val) => handleChange("role", val)}
                    options={["Student", "Faculty", "Staff", "Staff_Office"]}
                    required
                  />
                </div>
              </div>

              {/* Institution Information */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-700 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Building size={18} className="text-gray-500" /> Institution Details
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {/* Department for Student, Faculty & Staff_Office */}
                  {(form.role === "Student" || form.role === "Faculty" || form.role === "Staff_Office") && (
                    <>
                      {form.role === "Faculty" ? (
                        <div className="space-y-2">
                          <EditableField
                            icon={<Building size={16} />}
                            label="Department"
                            value={form.department}
                            onChange={(val) => handleChange("department", val)}
                            options={[...Object.keys(courseOptions), "Other"]}
                            required
                          />
                          {isOtherDepartment && (
                            <div className="ml-8">
                              <input
                                type="text"
                                value={otherDepartment}
                                onChange={(e) => setOtherDepartment(e.target.value)}
                                placeholder="Please specify your department"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                required
                              />
                            </div>
                          )}
                        </div>
                      ) : form.role === "Student" ? (
                        <EditableField
                          icon={<Building size={16} />}
                          label="Department"
                          value={form.department}
                          onChange={(val) => handleChange("department", val)}
                          options={Object.keys(courseOptions)}
                          required
                        />
                      ) : (
                        <EditableField
                          icon={<Building size={16} />}
                          label="Office/Department"
                          value={form.department}
                          onChange={(val) => handleChange("department", val)}
                          required
                        />
                      )}
                    </>
                  )}

                  {/* Assigned Floor for Staff */}
                  {form.role === "Staff" && (
                    <EditableField
                      icon={<Layers size={16} />}
                      label="Assigned Floor"
                      value={form.floor}
                      onChange={(val) => handleChange("floor", val)}
                      options={floorOptions}
                      required
                    />
                  )}

                  {/* Program for Student */}
                  {form.role === "Student" && form.department && (
                    <EditableField
                      icon={<GraduationCap size={16} />}
                      label="Program"
                      value={form.course}
                      onChange={(val) => handleChange("course", val)}
                      options={courseOptions[form.department] || []}
                      required
                    />
                  )}

                  {/* Year Level for Student */}
                  {form.role === "Student" && form.course && (
                    <EditableField
                      icon={<GraduationCap size={16} />}
                      label="Year Level"
                      value={form.yearLevel}
                      onChange={(val) => handleChange("yearLevel", val)}
                      options={
                        form.department === "SHS" 
                          ? ["Grade 11", "Grade 12"]
                          : form.department === "COL"
                          ? ["1st Year", "2nd Year", "3rd Year", "4th Year"]
                          : isGraduateProgram(form.course)
                          ? form.course.includes("Doctor")
                            ? ["1st Year", "2nd Year", "3rd Year", "4th Year"]
                            : ["1st Year", "2nd Year"]
                          : ["1st Year", "2nd Year", "3rd Year", "4th Year"]
                      }
                      required
                    />
                  )}
                </div>
              </div>

              {/* Security Information */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-700 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Shield size={18} className="text-gray-500" /> Security
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <EditableField
                    icon={<Shield size={16} />}
                    label={isEdit ? "New Password (optional)" : "Password"}
                    value={form.password}
                    onChange={(val) => handleChange("password", val)}
                    type="password"
                    required={isAdd}
                  />
                </div>
              </div>

              {/* System Information (View Only) */}
              {isEdit && user && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-base font-medium text-gray-700 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Clock size={18} className="text-gray-500" /> System Info
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-gray-200 rounded-full text-gray-600">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-normal text-gray-500">Created</p>
                        <p className="text-gray-700 font-medium text-sm">{formatDate(user.createdAt || user.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-gray-200 rounded-full text-gray-600">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-normal text-gray-500">Last Updated</p>
                        <p className="text-gray-700 font-medium text-sm">{formatDate(user.updatedAt || user.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEdit ? "Update User" : "Create User"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}