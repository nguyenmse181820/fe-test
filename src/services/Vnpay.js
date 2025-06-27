const API_BASE_URL = import.meta.env.VITE_API_GATEWAY || 'http://localhost:8080';

const accessToken = localStorage.getItem('token');

export const createVNPayPaymentUrl = async (paymentData, bankCode = null) => {
  try {
    const requestBody = {
      bookingReference: paymentData.bookingReference,
      amount: paymentData.amount,
      ...(bankCode && { bankCode })
    };

    const response = await fetch(`${API_BASE_URL}/booking-service/api/v1/payment/vnpay/create-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': accessToken ? `Bearer ${accessToken}` : ''
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.paymentUrl) {
      return data.paymentUrl;
    } else {
      throw new Error('Payment URL not received from server');
    }
  } catch (error) {
    console.error('VNPay payment URL creation failed:', error);
    throw new Error(`Failed to create payment URL: ${error.message}`);
  }
};

export const processVNPayPayment = async (paymentData, bankCode = null) => {
  try {
    const paymentUrl = await createVNPayPaymentUrl(paymentData, bankCode);
    window.location.href = paymentUrl;
  } catch (error) {
    console.error('VNPay payment processing failed:', error);
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
  if (!paymentData) {
    throw new Error('Payment data is required');
  }

  if (!paymentData.bookingReference) {
    throw new Error('Booking reference is required');
  }

  if (!paymentData.amount || paymentData.amount <= 0) {
    throw new Error('Valid payment amount is required');
  }

  if (typeof paymentData.amount !== 'number') {
    throw new Error('Payment amount must be a number');
  }

  return true;
};

export default {
  createVNPayPaymentUrl,
  processVNPayPayment,
  handleVNPayReturn,
  validatePaymentData
};