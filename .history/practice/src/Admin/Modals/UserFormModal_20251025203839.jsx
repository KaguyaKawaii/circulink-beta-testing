import React, { useState, useEffect } from "react";
import { X, User, Mail, IdCard, Shield, Building, GraduationCap, Layers, CheckCircle, AlertCircle } from "lucide-react";
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

export default function UserFormModal({ mode, user, onClose, onSuccess, onToggleVerified }) {
  const isView = mode === "view";
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
    }
  );
  const [saving, setSaving] = useState(false);
  const [otherDepartment, setOtherDepartment] = useState("");

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

      if (isEdit) {
        const formData = new FormData();
        for (let key in payload) {
          if (payload[key] !== undefined) formData.append(key, payload[key]);
        }
        if (form.profile) formData.append("profile", form.profile);
        response = await axios.put(
          `${import.meta.env.VITE_API_URL}/api/users/admin-edit/${user._id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } else if (isAdd) {
        const formData = new FormData();
        for (let key in payload) {
          if (payload[key] !== undefined) formData.append(key, payload[key]);
        }
        if (form.profile) formData.append("profile", form.profile);
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/users/add-user`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      // ✅ FIXED: Pass the user data to onSuccess
      if (response && response.data.success) {
        onSuccess(response.data.user); // Pass the user data back
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

  const InfoCard = ({ title, value, icon, subtitle }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all duration-200 cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
          {icon}
        </div>
      </div>
    </div>
  );

  const DetailItem = ({ icon, label, value }) => (
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-gray-100 rounded-full text-gray-600">
        {icon}
      </div>
      <div>
        <p className="text-xs font-normal text-gray-500">{label}</p>
        <p className="text-gray-800 font-medium text-sm">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center border border-red-300">
                <User size={24} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {isView ? "User Details" : isEdit ? "Edit User" : "Add New User"}
                </h1>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="flex items-center gap-1.5 text-sm">
                    <IdCard size={16} />
                    {user?.id_number || "New User"}
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-full ${
                    form.verified 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    {form.verified ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {form.verified ? "Verified" : "Not Verified"}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isView ? (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard
                  title="Name"
                  value={user.name}
                  icon={<User size={20} />}
                  subtitle="Full name"
                />
                <InfoCard
                  title="Email"
                  value={user.email}
                  icon={<Mail size={20} />}
                  subtitle="Email address"
                />
              </div>

              {/* User Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <IdCard size={20} className="text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">ID Number</span>
                      <span className="font-semibold text-gray-900">{user.id_number || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Role</span>
                      <span className="font-semibold text-gray-900">{user.role || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Department</span>
                      <span className="font-semibold text-gray-900">{user.department || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Details Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Building size={20} className="text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>
                  </div>
                  <div className="space-y-3">
                    {user.role === "Staff" ? (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600">Assigned Floor</span>
                        <span className="font-semibold text-gray-900">{user.floor || "N/A"}</span>
                      </div>
                    ) : (
                      <>
                        {user.role === "Student" && (
                          <>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-gray-600">Program</span>
                              <span className="font-semibold text-gray-900">{user.course || "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-gray-600">Year Level</span>
                              <span className="font-semibold text-gray-900">{user.yearLevel || "N/A"}</span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-semibold ${
                        user.verified ? "text-emerald-600" : "text-amber-600"
                      }`}>
                        {user.verified ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <User size={20} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">ID Number</label>
                    <input
                      value={form.id_number}
                      onChange={(e) => handleChange("id_number", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => handleChange("role", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                    >
                      <option value="Student">Student</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Staff">Staff</option>
                      <option value="Staff_Office">Staff Office</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Role-Specific Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Building size={20} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Role Details</h3>
                </div>

                {/* Department for Student, Faculty & Staff_Office */}
                {(form.role === "Student" || form.role === "Faculty" || form.role === "Staff_Office") && (
                  <div className="space-y-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        {form.role === "Staff_Office" ? "Office/Department" : "Department"}
                      </label>
                      {form.role === "Faculty" ? (
                        <>
                          <select
                            value={form.department}
                            onChange={(e) => handleChange("department", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                          >
                            <option value="">Select Department</option>
                            {Object.keys(courseOptions).map((dep) => (
                              <option key={dep} value={dep}>{dep}</option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                          {isOtherDepartment && (
                            <input
                              type="text"
                              value={otherDepartment}
                              onChange={(e) => setOtherDepartment(e.target.value)}
                              placeholder="Please specify your department"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mt-2 cursor-pointer"
                              required
                            />
                          )}
                        </>
                      ) : form.role === "Student" ? (
                        <select
                          value={form.department}
                          onChange={(e) => handleChange("department", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                        >
                          <option value="">Select Department</option>
                          {Object.keys(courseOptions).map((dep) => (
                            <option key={dep} value={dep}>{dep}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={form.department}
                          onChange={(e) => handleChange("department", e.target.value)}
                          placeholder="Enter office/department (e.g., Registrar's Office)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                          required
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Assigned Floor for Staff */}
                {form.role === "Staff" && (
                  <div className="space-y-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Assigned Floor</label>
                      <select
                        value={form.floor}
                        onChange={(e) => handleChange("floor", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                      >
                        <option value="">Select Floor</option>
                        {floorOptions.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Program for Student only */}
                {form.role === "Student" && form.department && (
                  <div className="space-y-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Program</label>
                      <select
                        value={form.course}
                        onChange={(e) => handleChange("course", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                      >
                        <option value="">Select Program</option>
                        {courseOptions[form.department]?.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Year Level for Student only */}
                {form.role === "Student" && form.course && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Year Level</label>
                      <select
                        value={form.yearLevel}
                        onChange={(e) => handleChange("yearLevel", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                      >
                        <option value="">Select Year Level</option>
                        {form.department === "SHS" ? (
                          <>
                            <option value="Grade 11">Grade 11</option>
                            <option value="Grade 12">Grade 12</option>
                          </>
                        ) : form.department === "COL" ? (
                          // COL year levels - 1st to 4th Year
                          <>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </>
                        ) : isGraduateProgram(form.course) ? (
                          // Graduate program year levels
                          <>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            {form.course.includes("Doctor") && (
                              <>
                                <option value="3rd Year">3rd Year</option>
                                <option value="4th Year">4th Year</option>
                              </>
                            )}
                          </>
                        ) : (
                          // Undergraduate program year levels
                          <>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Security Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Shield size={20} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Security & Verification</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      {isEdit ? "New Password (optional)" : "Password"}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required={isAdd}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      id="verified"
                      checked={form.verified}
                      onChange={(e) => handleChange("verified", e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                    />
                    <div>
                      <label htmlFor="verified" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Verified Account
                      </label>
                      <p className="text-xs text-gray-500">
                        Verified users can access all system features immediately
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">User ID:</span>{" "}
              <span className="font-mono text-gray-800">{user?._id?.slice(-8) || "New User"}</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              {isView ? (
                <>
                  <button
                    onClick={() => onToggleVerified(user)}
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                      user.verified 
                        ? "bg-gray-600 text-white hover:bg-gray-700" 
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {user.verified ? <X size={16} /> : <CheckCircle size={16} />}
                    {user.verified ? "Unverify" : "Verify"}
                  </button>
                  <button 
                    onClick={onClose} 
                    className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm cursor-pointer"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 font-medium text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        {isEdit ? "Update User" : "Create User"}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}