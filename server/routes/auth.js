const express = require("express");
const router = express.Router();
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const {
  createOTP,
  verifyOTP,
  deleteOTP,
} = require("../../lib/db/otp");
const {
  createUser,
  getUserByUsername,
  usernameExists,
  phoneNumberExists,
  updateLastLogin,
} = require("../../lib/db/users");
const {
  createSession,
  validateSession,
} = require("../../lib/db/sessions");
const {
  normalizePhoneNumber,
  normalizeUsername,
  hashPassword,
  verifyPassword,
  getCurrentTimestamp,
} = require("../utils");
const { dynamoClient } = require("../../lib/dynamodb");

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number
 */
router.post("/send-otp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if phone number already exists and is verified
    const phoneCheck = await phoneNumberExists(normalizedPhone);
    if (phoneCheck.exists && phoneCheck.verified) {
      return res.status(400).json({
        error: "Phone number already registered",
      });
    }

    // Generate and store OTP
    const otpCode = await createOTP(normalizedPhone, "registration", null);

    // In development, return OTP in response (remove in production)
    res.json({
      success: true,
      message: "OTP sent successfully",
      otp: process.env.NODE_ENV === "development" ? otpCode : undefined, // Only in dev
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ error: "Phone number and OTP are required" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const result = await verifyOTP(normalizedPhone, otpCode);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "OTP verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

/**
 * POST /api/auth/check-username
 * Check if username is available
 */
router.post("/check-username", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const normalizedUsername = normalizeUsername(username);

    // Validate username format
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return res.status(400).json({
        error: "Username must be 3-20 characters, alphanumeric and underscore only",
      });
    }

    const exists = await usernameExists(normalizedUsername);

    res.json({
      available: !exists,
      message: exists ? "Username already taken" : "Username available",
    });
  } catch (error) {
    console.error("Error checking username:", error);
    res.status(500).json({ error: "Failed to check username" });
  }
});

/**
 * POST /api/auth/register
 * Complete registration (Step 3)
 */
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      phoneNumber,
      password,
      role,
      avatar,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !phoneNumber || !password || !role || !avatar) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const normalizedUsername = normalizeUsername(username);

    // Check if phone number already exists and is verified
    const phoneCheck = await phoneNumberExists(normalizedPhone);
    if (phoneCheck.exists && phoneCheck.verified) {
      return res.status(400).json({
        error: "Phone number already registered",
      });
    }

    // Verify OTP was verified - check for any recent verified OTP
    // Query for verified OTPs in the last 10 minutes
    const now = getCurrentTimestamp();
    const tenMinutesAgo = now - 600;
    
    const otpQuery = await dynamoClient.send(
      new QueryCommand({
        TableName: "OTPVerifications",
        KeyConditionExpression: "phoneNumber = :phoneNumber AND createdAt >= :tenMinutesAgo",
        FilterExpression: "verified = :true",
        ExpressionAttributeValues: {
          ":phoneNumber": normalizedPhone,
          ":tenMinutesAgo": tenMinutesAgo,
          ":true": true,
        },
        ScanIndexForward: false,
        Limit: 1,
      })
    );

    if (!otpQuery.Items || otpQuery.Items.length === 0) {
      return res.status(400).json({
        error: "Please verify your phone number with OTP first",
      });
    }

    const verifiedOTP = otpQuery.Items[0];

    // Check username availability
    const usernameAvailable = !(await usernameExists(normalizedUsername));
    if (!usernameAvailable) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Validate username format
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return res.status(400).json({
        error: "Username must be 3-20 characters, alphanumeric and underscore only",
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser({
      firstName,
      lastName,
      username: normalizedUsername,
      phoneNumber: normalizedPhone,
      passwordHash,
      role,
      avatar,
    });

    // Delete verified OTP (optional cleanup)
    if (verifiedOTP) {
      try {
        await deleteOTP(normalizedPhone, verifiedOTP.createdAt);
      } catch (err) {
        // Ignore if deletion fails (TTL will handle it)
        console.log("OTP cleanup warning:", err.message);
      }
    }

    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("user-agent") || "unknown";
    const { sessionId, expiresAt } = await createSession(
      {
        userId: user.userId,
        username: user.username,
        role: user.role,
      },
      ipAddress,
      userAgent,
      false // Registration doesn't have remember me
    );

    res.json({
      success: true,
      message: "Registration successful",
      user: {
        userId: user.userId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      session: {
        sessionId,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const normalizedUsername = normalizeUsername(username);

    // Get user by username
    const user = await getUserByUsername(normalizedUsername);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check account status
    if (user.accountStatus !== "active") {
      return res.status(403).json({
        error: `Account is ${user.accountStatus}. Please contact support.`,
      });
    }

    // Check phone verification
    if (!user.phoneVerified) {
      return res.status(403).json({
        error: "Phone number not verified. Please complete registration.",
      });
    }

    // Update last login
    await updateLastLogin(user.userId);

    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("user-agent") || "unknown";
    const { sessionId, expiresAt } = await createSession(
      {
        userId: user.userId,
        username: user.username,
        role: user.role,
      },
      ipAddress,
      userAgent,
      rememberMe || false
    );

    res.json({
      success: true,
      message: "Login successful",
      user: {
        userId: user.userId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      session: {
        sessionId,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /api/auth/session
 * Validate and get session info
 */
router.get("/session", async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"] || req.cookies?.sessionId;

    if (!sessionId) {
      return res.status(401).json({ error: "Session ID required" });
    }

    const result = await validateSession(sessionId);

    if (!result.valid) {
      return res.status(401).json({ error: result.error });
    }

    // Update activity
    const { updateSessionActivity } = require("../../lib/db/sessions");
    await updateSessionActivity(sessionId);

    res.json({
      success: true,
      session: result.session,
    });
  } catch (error) {
    console.error("Error validating session:", error);
    res.status(500).json({ error: "Session validation failed" });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post("/logout", async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"] || req.cookies?.sessionId;

    if (sessionId) {
      const { invalidateSession } = require("../../lib/db/sessions");
      await invalidateSession(sessionId);
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

module.exports = router;

