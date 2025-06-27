import axiosInstance from '../utils/axios';

export const getUserProfile = async () => {
  try {
    // Mock user profile data since user-service endpoint doesn't exist yet
    const mockProfile = {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe', 
      email: 'john.doe@email.com',
      phone: '+84 123 456 789',
      dateOfBirth: '1990-01-15',
      gender: 'MALE',
      nationality: 'VN',
      idNumber: '123456789',
      passportNumber: 'A12345678',
      countryOfIssue: 'VN',
      passportExpiryDate: '2030-01-15'
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockProfile;
    
    // Real implementation when user-service is ready:
    /*
    const response = await axiosInstance.get('/user-service/api/v1/users/profile');
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch user profile');
    }
    */
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch user profile');
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await axiosInstance.put('/user-service/api/v1/users/profile', profileData);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update user profile');
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to update user profile');
  }
};
