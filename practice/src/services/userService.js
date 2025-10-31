import api from "../utils/api";
import socket from "../utils/socket";

class UserService {
  static async fetchUser(userId) {
    try {
      if (!userId) return null;
      const { data } = await api.get(`/users/${userId}`);
      return data.user ?? data;
    } catch (err) {
      console.error("Failed to fetch user:", err);
      return null;
    }
  }

  static async updateUserProfile(userId, updates) {
    try {
      const { data } = await api.put(`/users/${userId}`, updates);
      return data.user ?? data;
    } catch (err) {
      console.error("Failed to update user:", err);
      throw err;
    }
  }

  static setupUserUpdateListener(userId, callback) {
    const handler = (updatedId) => {
      if (updatedId === userId) callback();
    };
    socket.on("user-updated", handler);
    return () => socket.off("user-updated", handler);
  }

  static cleanup() {
    socket.off("user-updated");
  }
}

export default UserService;