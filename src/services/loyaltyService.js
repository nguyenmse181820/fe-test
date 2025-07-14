import { apiClient } from './api';

const API_ENDPOINTS = {
    LOYALTY: '/loyalty-service/api/v1/loyalty',
    MEMBERSHIPS: '/loyalty-service/api/v1/memberships',
    USER_VOUCHERS: '/loyalty-service/api/v1/user-vouchers',
    VOUCHER_TEMPLATES: '/loyalty-service/api/v1/vouchers'
};

const loyaltyService = {
    // Membership Management
    getMembership: async (userId) => {
        try {
            const response = await apiClient.get(`${API_ENDPOINTS.MEMBERSHIPS}/user/${userId}`);
            // Return the full response to preserve data structure
            return response.data.data || response.data;
        } catch (error) {
            console.error('Error fetching membership:', error);
            throw error;
        }
    },

    createMembership: async (userId, membershipData) => {
        try {
            const response = await apiClient.post(API_ENDPOINTS.MEMBERSHIPS, {
                userId: userId,
                ...membershipData
            });
            return response.data;
        } catch (error) {
            console.error('Error creating membership:', error);
            throw error;
        }
    },

    updateMembership: async (userId, membershipData) => {
        try {
            const response = await apiClient.put(`${API_ENDPOINTS.MEMBERSHIPS}/${userId}`, membershipData);
            return response.data;
        } catch (error) {
            console.error('Error updating membership:', error);
            throw error;
        }
    },

    // Points Management - get from membership data
    getPointsBalance: async (userId) => {
        try {
            const response = await apiClient.get(`${API_ENDPOINTS.MEMBERSHIPS}/user/${userId}`);
            // Extract points from membership data, return in expected format
            const membership = response.data.data || response.data;
            return { 
                balance: membership.points || 0,
                tier: membership.tier || 'SILVER',
                ...membership 
            };
        } catch (error) {
            console.error('Error fetching points balance:', error);
            // Return default if membership doesn't exist
            return { balance: 0, tier: 'SILVER' };
        }
    },

    // Earn points based on spending
    earnPoints: async (earnPointsData) => {
        try {
            const response = await apiClient.post(`${API_ENDPOINTS.LOYALTY}/points/earn`, earnPointsData);
            return response.data;
        } catch (error) {
            console.error('Error earning points:', error);
            throw error;
        }
    },

    // Adjust points for a booking
    adjustPoints: async (bookingId) => {
        try {
            const response = await apiClient.post(`${API_ENDPOINTS.LOYALTY}/points/adjust/${bookingId}`);
            return response.data;
        } catch (error) {
            console.error('Error adjusting points:', error);
            throw error;
        }
    },

    // Voucher Management (actual backend endpoints)
    getUserVouchers: async (userId) => {
        try {
            const response = await apiClient.get(`${API_ENDPOINTS.USER_VOUCHERS}/user/${userId}`);
            // Handle response structure - may be array or object with data property
            return response.data?.userVouchers || response.data?.data || response.data || [];
        } catch (error) {
            console.error('Error fetching user vouchers:', error);
            throw error;
        }
    },

    redeemVoucherTemplate: async (userId, templateId) => {
        try {
            const response = await apiClient.post(`${API_ENDPOINTS.USER_VOUCHERS}/user/${userId}/redeem/${templateId}`);
            return response.data;
        } catch (error) {
            console.error('Error redeeming voucher template:', error);
            throw error;
        }
    },

    useVoucher: async (voucherCode) => {
        try {
            const response = await apiClient.post(`${API_ENDPOINTS.LOYALTY}/vouchers/${voucherCode}/use`);
            return response.data;
        } catch (error) {
            console.error('Error using voucher:', error);
            throw error;
        }
    },

    // Get all memberships (admin function)
    getAllMemberships: async () => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.MEMBERSHIPS);
            return response.data;
        } catch (error) {
            console.error('Error fetching all memberships:', error);
            throw error;
        }
    },

    // Get voucher templates  
    getVoucherTemplates: async () => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.VOUCHER_TEMPLATES);
            // Handle paginated response structure from OpenAPI spec
            return response.data?.voucherTemplates || response.data || [];
        } catch (error) {
            console.error('Error fetching voucher templates:', error);
            throw error;
        }
    }
};

export default loyaltyService;