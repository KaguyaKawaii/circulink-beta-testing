const User = require("../models/User");
const sendEmail = require("../utils/sendMail");

const tempUsers = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.signup = async (req, res) => {
  try {
    const { name, email, id_number, password, role, department, course, year_level } = req.body;

    if (!name || !email || !id_number || !password || !department || !role) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!email.endsWith("@usa.edu.ph")) {
      return res.status(400).json({ message: "Email must end with @usa.edu.ph" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already used." });
    }

    if (role === "Student" && (!course || !year_level)) {
      return res.status(400).json({ message: "Course and year level required for students." });
    }

    const otp = generateOtp();

    tempUsers.set(email, {
      name,
      email: email.toLowerCase(),
      id_number,
      password,
      role,
      department,
      course: course || "N/A",
      year_level: role === "Student" ? year_level : "N/A",
      otp,
      createdAt: Date.now(),
    });

    const otpEmailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 2px solid #CC0000; padding-bottom: 20px;">
        <h2 style="color: #000000; margin-bottom: 5px;">USA-FLD LRC</h2>
        <p style="color: #666666;">One-Time Password Verification</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your OTP for registration is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; color: #cc0000; letter-spacing: 5px; margin: 15px 0;">
            ${otp}
          </div>
          <p style="color: #666666; font-size: 14px;">Expires in 5 minutes</p>
        </div>
        
        <p style="color: #666666; font-size: 14px;">
          Enter this code on the verification page to complete your registration.
        </p>
      </div>
      
      <div style="border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center; color: #999999; font-size: 12px;">
        <p>University of San Agustin - FLD Learning Resource Center</p>
      </div>
    </div>
    `;

    await sendEmail({
      to: email,
      subject: "Your OTP for USA-FLD LRC Registration",
      html: otpEmailTemplate,
    });

    res.status(200).json({ message: "OTP sent to email." });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error during signup." });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const tempUser = tempUsers.get(email);

    if (!tempUser || tempUser.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const now = Date.now();
    if (now - tempUser.createdAt > 5 * 60 * 1000) {
      tempUsers.delete(email);
      return res.status(400).json({ message: "OTP expired. Please register again." });
    }

    const newUser = new User({
      name: tempUser.name,
      email: tempUser.email,
      id_number: tempUser.id_number,
      password: tempUser.password,
      role: tempUser.role,
      department: tempUser.department,
      course: tempUser.course,
      year_level: tempUser.year_level,
    });

    await newUser.save();
    tempUsers.delete(email);

    const welcomeEmailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 2px solid #CC0000; padding-bottom: 20px;">
        <h2 style="color: #000000; margin-bottom: 5px;">Welcome to USA-FLD LRC</h2>
        <p style="color: #666666;">Registration Successful</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p>Dear <strong>${tempUser.name}</strong>,</p>
        <p>Your account has been successfully created and verified.</p>
        
        <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${tempUser.name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${tempUser.email}</p>
          <p style="margin: 5px 0;"><strong>Role:</strong> ${tempUser.role}</p>
          <p style="margin: 5px 0;"><strong>Department:</strong> ${tempUser.department}</p>
          ${tempUser.role === 'Student' ? `
          <p style="margin: 5px 0;"><strong>Course:</strong> ${tempUser.course}</p>
          <p style="margin: 5px 0;"><strong>Year Level:</strong> ${tempUser.year_level}</p>
          ` : ''}
        </div>
        
      </div>
      
      <div style="border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center; color: #999999; font-size: 12px;">
        <p>University of San Agustin - FLD Learning Resource Center</p>
      </div>
    </div>
    `;

    await sendEmail({
      to: email,
      subject: "Welcome to USA-FLD Learning Resource Center!",
      html: welcomeEmailTemplate,
    });

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ message: "OTP verification failed." });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const tempUser = tempUsers.get(email);

    if (!tempUser) {
      return res.status(400).json({ message: "No signup session found. Please register again." });
    }

    const newOtp = generateOtp();
    tempUser.otp = newOtp;
    tempUser.createdAt = Date.now();

    const resendOtpTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 2px solid #CC0000; padding-bottom: 20px;">
        <h2 style="color: #000000; margin-bottom: 5px;">USA-FLD LRC</h2>
        <p style="color: #666666;">New OTP Request</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p>Hello <strong>${tempUser.name}</strong>,</p>
        <p>Your new OTP is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; color: #cc0000; letter-spacing: 5px; margin: 15px 0;">
            ${newOtp}
          </div>
          <p style="color: #666666; font-size: 14px;">Expires in 5 minutes</p>
        </div>
        
        <p style="color: #666666; font-size: 14px;">
          Use this new code to complete your registration.
        </p>
      </div>
      
      <div style="border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center; color: #999999; font-size: 12px;">
        <p>University of San Agustin - FLD Learning Resource Center</p>
      </div>
    </div>
    `;

    await sendEmail({
      to: email,
      subject: "Your New OTP for USA-FLD LRC Registration",
      html: resendOtpTemplate,
    });

    res.status(200).json({ message: "OTP resent successfully." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ message: "Failed to resend OTP." });
  }
};