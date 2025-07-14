import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import { jwtDecode } from "jwt-decode";
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const savedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    
    if (savedUser && token) {
      try {
        const userData = JSON.parse(savedUser);
        // If user data doesn't have id, extract it from token
        if (!userData.id && token !== 'debug-token') {
          const decodedToken = jwtDecode(token);
          userData.id = decodedToken.userId;
          localStorage.setItem('currentUser', JSON.stringify(userData));
        }
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        // Clear invalid data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await axiosInstance.post("USER-SERVICE/api/v1/identity/login", credentials);

      if (response && response.status === 200) {
        const token = response.data.data.token;
        const email = response.data.data.username;
        const decodedToken = jwtDecode(token);
        const role = decodedToken.role.toLowerCase();
        const userId = decodedToken.userId;
        const userData = {
          id: userId,
          email: email,
          role: role
        };
        setUser(userData);
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(userData));

        return { success: true, role: role }
      } else {
        return { success: false, message: 'Invalid email or password' };
      }

    } catch (error) {
      console.error('Login Error:', error);
      // Extract error message from the response
      const errorMessage = error.response?.data?.message || 'An error occurred during login';
      return { success: false, message: errorMessage };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  };

  const register = async (userData) => {
    try {
      // Format the request data to match backend expectations
      const registerData = {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        dob: userData.dob,
        phone: userData.phone,
        gender: userData.gender,
        nationality: userData.nationality,
        role: userData.role
      };

      console.log('Sending registration data:', registerData); // For debugging

      const response = await axiosInstance.post("USER-SERVICE/api/v1/identity/register", registerData);

      if (response.status === 200 && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Registration successful!'
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Registration failed'
        };
      }

    } catch (error) {
      console.error('Registration Error:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred during registration';
      return { success: false, message: errorMessage };
    }
  };

  const isAuthenticated = () => !!user;
  const isUser = () => user?.role === 'user';
  const isStaff = () => user?.role === 'staff';
  const isAdmin = () => user?.role === 'admin';
  const isStaffOrAdmin = () => user?.role === 'staff' || user?.role === 'admin';

  const setDebugUser = (debugUserData) => {
    setUser(debugUserData);
    localStorage.setItem('currentUser', JSON.stringify(debugUserData));
    // Set a fake token for API calls that might check for its existence
    localStorage.setItem('token', 'debug-token');
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading,
    isAuthenticated,
    isUser,
    isStaff,
    isAdmin,
    isStaffOrAdmin,
    setDebugUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
