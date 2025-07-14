// Utility functions for loyalty service validation and error handling

export const validateVoucherCode = (code) => {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Voucher code is required' };
  }

  if (code.length < 3) {
    return { isValid: false, error: 'Voucher code must be at least 3 characters' };
  }

  if (code.length > 20) {
    return { isValid: false, error: 'Voucher code cannot exceed 20 characters' };
  }

  // Basic format validation (alphanumeric with dashes)
  const codeRegex = /^[A-Z0-9-]+$/;
  if (!codeRegex.test(code.toUpperCase())) {
    return { isValid: false, error: 'Voucher code can only contain letters, numbers, and dashes' };
  }

  return { isValid: true, error: null };
};

export const validateBookingAmount = (amount) => {
  if (!amount || isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Invalid booking amount' };
  }

  if (amount > 100000000) { // 100M VND limit
    return { isValid: false, error: 'Booking amount exceeds maximum limit' };
  }

  return { isValid: true, error: null };
};

export const formatVoucherError = (error) => {
  if (!error) return 'An unknown error occurred';

  // Handle different error response formats
  if (typeof error === 'string') {
    return error;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  // Common API error codes
  if (error.response?.status === 404) {
    return 'Voucher not found or expired';
  }

  if (error.response?.status === 400) {
    return 'Invalid voucher code or booking details';
  }

  if (error.response?.status === 409) {
    return 'Voucher has already been used';
  }

  if (error.response?.status === 403) {
    return 'You are not authorized to use this voucher';
  }

  if (error.response?.status >= 500) {
    return 'Service temporarily unavailable. Please try again later.';
  }

  return 'Failed to process voucher. Please try again.';
};

export const calculateVoucherSavings = (voucher, bookingAmount) => {
  if (!voucher || !bookingAmount) return 0;

  if (bookingAmount < (voucher.minimumPurchase || 0)) {
    return 0;
  }

  let savings = 0;

  if (voucher.discountType === 'PERCENTAGE') {
    savings = (bookingAmount * voucher.discountValue) / 100;
    if (voucher.maxDiscount) {
      savings = Math.min(savings, voucher.maxDiscount);
    }
  } else if (voucher.discountType === 'FIXED') {
    savings = Math.min(voucher.discountValue, bookingAmount);
  }

  return Math.round(savings);
};

export const isVoucherExpired = (expiryDate) => {
  if (!expiryDate) return true;
  return new Date(expiryDate) <= new Date();
};

export const isVoucherApplicable = (voucher, bookingAmount) => {
  if (!voucher) return false;

  // Check if voucher is expired
  if (isVoucherExpired(voucher.expiryDate)) {
    return false;
  }

  // Check if voucher is active
  if (voucher.status !== 'ACTIVE') {
    return false;
  }

  // Check minimum purchase requirement
  if (bookingAmount < (voucher.minimumPurchase || 0)) {
    return false;
  }

  return true;
};

export const getMembershipTierInfo = (tier) => {
  const tiers = {
    SILVER: {
      name: 'Silver',
      color: '#C0C0C0',
      bgColor: 'bg-gray-400',
      textColor: 'text-gray-600',
      benefits: ['Priority check-in', 'Extra baggage allowance', '24/7 customer support'],
      pointsMultiplier: 1.25,
      nextTier: 'GOLD',
      requiredPoints: 0
    },
    GOLD: {
      name: 'Gold',
      color: '#FFD700',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      benefits: ['Premium check-in', 'Lounge access', 'Free seat selection', 'Priority boarding'],
      pointsMultiplier: 1.5,
      nextTier: 'PLATINUM',
      requiredPoints: 200000 // ~20M VND at 1% earning rate
    },
    PLATINUM: {
      name: 'Platinum',
      color: '#E5E4E2',
      bgColor: 'bg-purple-600',
      textColor: 'text-purple-600',
      benefits: ['VIP check-in', 'Premium lounge access', 'Free upgrades', 'Dedicated concierge'],
      pointsMultiplier: 2,
      nextTier: null,
      requiredPoints: 1400000 // ~100M VND total spending
    }
  };

  return tiers[tier] || tiers.SILVER;
};

export const formatLoyaltyDate = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

export const formatLoyaltyPoints = (points) => {
  if (!points || isNaN(points)) return '0';

  return new Intl.NumberFormat('en-US').format(points);
};

export const formatCurrency = (amount) => {
  if (!amount || isNaN(amount) || amount === 0) return '0 VNĐ';

  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' VNĐ';
};

export const getPointsToNextTier = (currentPoints, currentTier) => {
  const tierInfo = getMembershipTierInfo(currentTier);
  if (!tierInfo.nextTier) return 0;

  const nextTierInfo = getMembershipTierInfo(tierInfo.nextTier);
  return Math.max(0, nextTierInfo.requiredPoints - currentPoints);
};