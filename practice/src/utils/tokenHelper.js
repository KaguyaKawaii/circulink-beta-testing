// utils/tokenHelper.js
// Simple helper to avoid circular dependencies

export const getSessionToken = () => {
  try {
    const session = JSON.parse(localStorage.getItem("userSession") || "{}");
    return session.sessionToken || null;
  } catch (error) {
    console.error("Error getting session token:", error);
    return null;
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem("userSession");
  } catch (error) {
    console.error("Error clearing session:", error);
  }
};

export const getUser = () => {
  try {
    const session = JSON.parse(localStorage.getItem("userSession") || "{}");
    return session.user || null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

export const setUserSession = (userData, sessionToken) => {
  try {
    const sessionData = {
      user: userData,
      sessionToken: sessionToken,
      timestamp: Date.now(),
      expiresIn: 24 * 60 * 60 * 1000 // 24 hours
    };
    localStorage.setItem("userSession", JSON.stringify(sessionData));
    return true;
  } catch (error) {
    console.error("Error setting user session:", error);
    return false;
  }
};