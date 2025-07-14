const API_BASE_URL = import.meta.env.VITE_API_GATEWAY || 'http://localhost:8080';

const accessToken = localStorage.getItem('token');

export const createVNPayPaymentUrl = async (paymentData, bankCode = null) => {
  try {
    console.log('[VNPAY] Creating payment URL with data:', paymentData);
    
    // Ensure payment method is always set
    if (!paymentData.paymentMethod) {
      console.warn('[VNPAY] Payment method not provided, defaulting to VNPAY_BANKTRANSFER');
      paymentData.paymentMethod = 'VNPAY_BANKTRANSFER';
    }
    
    // Verify the payment method is valid for VNPay
    if (paymentData.paymentMethod !== 'VNPAY_BANKTRANSFER' && 
        paymentData.paymentMethod !== 'VNPAY_QR' && 
        paymentData.paymentMethod !== 'VNPAY_CREDITCARD') {
      console.warn('[VNPAY] Invalid payment method provided:', paymentData.paymentMethod);
      console.warn('[VNPAY] Switching to VNPAY_BANKTRANSFER');
      paymentData.paymentMethod = 'VNPAY_BANKTRANSFER';
    }
    
    // Add required fields if missing
    const requestBody = {
      bookingReference: paymentData.bookingReference,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      clientIpAddress: paymentData.clientIpAddress || '127.0.0.1',
      orderDescription: `Thanh toan don hang ${paymentData.bookingReference}`,
      ...(bankCode && { bankCode })
    };

    console.log('[VNPAY] Sending request to create payment URL:', requestBody);

    // Add timeout to prevent long waiting
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${API_BASE_URL}/booking-service/api/v1/payment/vnpay/create-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': accessToken ? `Bearer ${accessToken}` : ''
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    console.log('[VNPAY] Received response:', response.status, response.statusText);
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check for common HTTP errors first
    if (response.status === 401) {
      console.error('[VNPAY] Authentication error (401)');
      throw new Error('Authentication required. Please log in and try again.');
    }
    
    if (response.status === 403) {
      console.error('[VNPAY] Authorization error (403)');
      throw new Error('You do not have permission to process this payment.');
    }
    
    if (response.status === 404) {
      console.error('[VNPAY] Resource not found (404)');
      throw new Error('Payment service endpoint not found. Please contact support.');
    }
    
    // Read the response body
    const responseText = await response.text();
    console.log('[VNPAY] Response body:', responseText);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[VNPAY] Failed to parse response as JSON:', e);
      
      // If the response is empty, it could be a network issue
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response received from the server. Please check your network connection.');
      }
      
      // If there's a non-JSON response, something might be wrong with the API
      throw new Error('Invalid response format from server. Please try again later.');
    }

    if (!response.ok) {
      console.error('[VNPAY] Error response:', data);
      
      // Handle specific error messages
      if (data.error && data.error.includes('ownership')) {
        throw new Error('You are not authorized to make payments for this booking.');
      }
      
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }
    
    if (data.paymentUrl) {
      console.log('[VNPAY] Successfully received payment URL');
      return data.paymentUrl;
    } else {
      console.error('[VNPAY] No payment URL in response:', data);
      throw new Error('Payment URL not received from server. Please check if the booking is still valid.');
    }
  } catch (error) {
    // Handle abort controller timeout
    if (error.name === 'AbortError') {
      console.error('[VNPAY] Request timed out');
      throw new Error('Payment request timed out. Please try again later.');
    }
    
    console.error('[VNPAY] Payment URL creation failed:', error);
    throw new Error(`Failed to create payment URL: ${error.message}`);
  }
};

export const processVNPayPayment = async (paymentData, bankCode = null) => {
  try {
    console.log('[VNPAY] Processing payment with data:', paymentData);
    
    // Verify we have a valid access token
    if (!accessToken) {
      console.error('[VNPAY] No access token available');
      throw new Error('Authentication required. Please login and try again.');
    }
    
    // Validate the payment data again to ensure it has everything needed
    validatePaymentData(paymentData);
    
    // Additional validation for debugging purposes
    if (!paymentData.bookingReference || paymentData.bookingReference.trim() === '') {
      console.error('[VNPAY] Missing booking reference');
      throw new Error('Booking reference is required for payment processing');
    }
    
    if (!paymentData.amount || isNaN(paymentData.amount) || paymentData.amount <= 0) {
      console.error('[VNPAY] Invalid payment amount:', paymentData.amount);
      throw new Error('Valid payment amount is required');
    }
    
    const paymentUrl = await createVNPayPaymentUrl(paymentData, bankCode);
    
    if (!paymentUrl) {
      console.error('[VNPAY] Received empty payment URL');
      throw new Error('Empty payment URL received from server');
    }
    
    console.log('[VNPAY] Successfully obtained payment URL, redirecting user...');
    // Save current state before redirecting (optional)
    sessionStorage.setItem('lastPaymentAttempt', JSON.stringify({
      bookingReference: paymentData.bookingReference,
      timestamp: new Date().toISOString()
    }));
    
    // Redirect to payment page
    window.location.href = paymentUrl;
    
    return paymentUrl; // Return for testing purposes, though redirection will happen
  } catch (error) {
    console.error('[VNPAY] Payment processing failed:', error);
    throw error;
  }
};

export const handleVNPayReturn = (params) => {
  const result = {
    success: false,
    transactionId: params.get('vnp_TxnRef'),
    amount: params.get('vnp_Amount'),
    responseCode: params.get('vnp_ResponseCode'),
    message: params.get('vnp_OrderInfo'),
    bankCode: params.get('vnp_BankCode'),
    payDate: params.get('vnp_PayDate')
  };
  if (result.responseCode === '00') {
    result.success = true;
    result.message = 'Payment completed successfully';
  } else {
    result.message = getVNPayErrorMessage(result.responseCode);
  }

  return result;
};

const getVNPayErrorMessage = (responseCode) => {
  const errorMessages = {
    '01': 'Transaction is being processed',
    '02': 'Transaction failed',
    '04': 'Transaction reversed',
    '05': 'Transaction was rejected by bank',
    '06': 'Transaction failed due to error',
    '07': 'Transaction is suspected of fraud',
    '09': 'Customer cancelled transaction',
    '10': 'Customer entered wrong information more than 3 times',
    '11': 'Payment timeout',
    '12': 'Card/Account is locked',
    '13': 'Wrong OTP',
    '24': 'Transaction cancelled',
    '51': 'Insufficient account balance',
    '65': 'Daily transaction limit exceeded',
    '75': 'Bank is under maintenance',
    '79': 'Wrong payment password more than allowed times'
  };

  return errorMessages[responseCode] || 'Payment failed with unknown error';
};

export const validatePaymentData = (paymentData) => {
  // Check if payment data exists
  if (!paymentData) {
    throw new Error('Payment data is required');
  }

  // Validate booking reference
  if (!paymentData.bookingReference) {
    throw new Error('Booking reference is required');
  }
  
  if (typeof paymentData.bookingReference !== 'string' || paymentData.bookingReference.trim() === '') {
    throw new Error('Invalid booking reference format');
  }

  // Validate payment amount
  if (paymentData.amount === undefined || paymentData.amount === null) {
    throw new Error('Payment amount is required');
  }

  if (typeof paymentData.amount !== 'number') {
    // Try to convert to number if it's a numeric string
    const parsedAmount = parseFloat(paymentData.amount);
    if (isNaN(parsedAmount)) {
      throw new Error('Payment amount must be a number');
    }
    console.warn('[VNPAY] Converting payment amount to number:', parsedAmount);
    paymentData.amount = parsedAmount;
  }
  
  if (paymentData.amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }
  
  // Validate payment method
  if (!paymentData.paymentMethod) {
    console.warn('[VNPAY] Payment method is missing, adding default VNPAY_BANKTRANSFER');
    paymentData.paymentMethod = 'VNPAY_BANKTRANSFER';
  } else if (!['VNPAY_BANKTRANSFER', 'VNPAY_QR', 'VNPAY_CREDITCARD'].includes(paymentData.paymentMethod)) {
    console.warn('[VNPAY] Payment method is not supported:', paymentData.paymentMethod);
    console.warn('[VNPAY] Defaulting to VNPAY_BANKTRANSFER');
    paymentData.paymentMethod = 'VNPAY_BANKTRANSFER';
  }

  return true;
};

export default {
  createVNPayPaymentUrl,
  processVNPayPayment,
  handleVNPayReturn,
  validatePaymentData
};