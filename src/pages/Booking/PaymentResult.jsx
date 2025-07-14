import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Download, 
  Calendar, 
  Home, 
  Loader2, 
  RefreshCw, 
  CreditCard, 
  AlertTriangle, 
  ArrowLeft, 
  HelpCircle 
} from 'lucide-react';
import { api } from '../../utils/axios';

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const bookingReference = searchParams.get('booking');
  const errorMessage = searchParams.get('message');
  
  // Determine if this is success or failure based on the URL path
  const isSuccess = location.pathname.includes('/success');
  const isFailure = location.pathname.includes('/failed');
  
  useEffect(() => {
    // Simulate loading delay for better UX
    const timer = setTimeout(() => {
      setLoading(false);
      
      // If this is a success page and we have a booking reference,
      // verify payment status and trigger saga completion if needed
      if (isSuccess && bookingReference) {
        verifyPaymentCompletion();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isSuccess, bookingReference]);

  const verifyPaymentCompletion = async () => {
    try {
      setVerifying(true);
      console.log('[PAYMENT_VERIFY] Verifying payment completion for booking:', bookingReference);
      
      const response = await api.post(`/booking-service/api/v1/payment/verify-and-complete?bookingReference=${bookingReference}`);
      
      if (response.data) {
        console.log('[PAYMENT_VERIFY] Verification response:', response.data);
      }
    } catch (error) {
      console.error('[PAYMENT_VERIFY] Error verifying payment completion:', error);
      // Don't show error to user as this is a background verification
    } finally {
      setVerifying(false);
    }
  };

  const handleViewBooking = () => {
    navigate(`/booking-details/${bookingReference}`);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleMyBookings = () => {
    navigate('/booking-overview');
  };

  const handleRetryPayment = async () => {
    if (!bookingReference) {
      navigate('/booking-overview');
      return;
    }

    setRetryLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
      setRetryLoading(false);
      navigate(`/booking-details/${bookingReference}`);
    }, 1000);
  };

  const handleContactSupport = () => {
    window.open('mailto:support@airline.com?subject=Payment Issue - ' + bookingReference, '_blank');
  };

  const getErrorDetails = (message) => {
    const errorMap = {
      'Payment failed with code: 01': { title: 'Transaction Processing', desc: 'Your payment is still being processed. Please wait a moment.' },
      'Payment failed with code: 02': { title: 'Transaction Failed', desc: 'The payment could not be completed. Please try again.' },
      'Payment failed with code: 09': { title: 'Payment Cancelled', desc: 'You cancelled the payment process.' },
      'Payment failed with code: 10': { title: 'Too Many Attempts', desc: 'Wrong information entered multiple times. Please try again later.' },
      'Payment failed with code: 11': { title: 'Payment Timeout', desc: 'The payment session has expired. Please try again.' },
      'Payment failed with code: 51': { title: 'Insufficient Funds', desc: 'Your account does not have enough balance.' },
      'Payment failed with code: 65': { title: 'Daily Limit Exceeded', desc: 'You have exceeded your daily transaction limit.' },
    };

    return errorMap[message] || { 
      title: 'Payment Failed', 
      desc: message || 'An unexpected error occurred during payment processing.' 
    };
  };

  const errorDetails = getErrorDetails(errorMessage);

  if (loading) {
    return (
      <div className={`min-h-screen ${isSuccess ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50' : 'bg-gradient-to-br from-red-50 via-pink-50 to-orange-50'} flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className={`w-16 h-16 ${isSuccess ? 'text-green-600' : 'text-red-600'} mx-auto mb-4 animate-spin`} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isSuccess ? 'Processing your payment...' : 'Processing payment result...'}
          </h3>
          <p className="text-gray-600">
            {isSuccess ? 'Please wait while we confirm your transaction.' : 'Please wait while we check your payment status.'}
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Success Animation Container */}
          <div className="text-center mb-8">
            <div className="relative mx-auto w-32 h-32 mb-6">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-green-500 rounded-full w-32 h-32 flex items-center justify-center shadow-2xl">
                <CheckCircle className="w-16 h-16 text-white animate-bounce" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h1>
            
            {/* Verification Status */}
            {verifying && (
              <div className="mb-4 flex items-center justify-center space-x-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Verifying booking completion...</span>
              </div>
            )}
            
            <p className="text-xl text-gray-600 mb-2">
              Your booking has been confirmed and payment processed successfully.
            </p>
            {bookingReference && (
              <p className="text-lg text-gray-500">
                Booking Reference: <span className="font-mono font-semibold text-green-600">{bookingReference}</span>
              </p>
            )}
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-green-100 overflow-hidden mb-8">
            <div className="px-8 py-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <h2 className="text-2xl font-bold mb-2">Transaction Complete</h2>
              <p className="text-green-100">Your flight booking is now confirmed and ready!</p>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 bg-green-50 rounded-2xl">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Payment Confirmed</h3>
                  <p className="text-sm text-gray-600">VNPay transaction completed</p>
                </div>
                
                <div className="text-center p-6 bg-blue-50 rounded-2xl">
                  <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Booking Active</h3>
                  <p className="text-sm text-gray-600">Ready for check-in</p>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-2xl">
                  <Download className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Tickets Ready</h3>
                  <p className="text-sm text-gray-600">Download available</p>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Check your email</p>
                      <p className="text-sm text-gray-600">Confirmation details sent to your registered email</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Download your tickets</p>
                      <p className="text-sm text-gray-600">Access e-tickets from your booking details</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Online check-in</p>
                      <p className="text-sm text-gray-600">Available 24 hours before departure</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                {bookingReference && (
                  <button
                    onClick={handleViewBooking}
                    className="flex-1 bg-green-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <span>View Booking Details</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
                
                <button
                  onClick={handleMyBookings}
                  className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <Calendar className="w-5 h-5" />
                  <span>My Bookings</span>
                </button>
                
                <button
                  onClick={handleGoHome}
                  className="flex-1 bg-white text-gray-700 px-6 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2 border border-gray-200 shadow-md hover:shadow-lg"
                >
                  <Home className="w-5 h-5" />
                  <span>Back to Home</span>
                </button>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center text-gray-500 text-sm">
            <p>Need help? Contact our customer support at support@airline.com</p>
          </div>
        </div>
      </div>
    );
  }

  // Failure UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Error Animation Container */}
        <div className="text-center mb-8">
          <div className="relative mx-auto w-32 h-32 mb-6">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse opacity-75"></div>
            <div className="relative bg-red-500 rounded-full w-32 h-32 flex items-center justify-center shadow-2xl">
              <XCircle className="w-16 h-16 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Failed
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            We couldn't process your payment at this time.
          </p>
          {bookingReference && (
            <p className="text-lg text-gray-500">
              Booking Reference: <span className="font-mono font-semibold text-red-600">{bookingReference}</span>
            </p>
          )}
        </div>

        {/* Error Details Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden mb-8">
          <div className="px-8 py-6 bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <h2 className="text-2xl font-bold mb-2">{errorDetails.title}</h2>
            <p className="text-red-100">{errorDetails.desc}</p>
          </div>
          
          <div className="p-8">
            {/* Error Message */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Error Details</h3>
                  <p className="text-red-700">{errorMessage}</p>
                </div>
              </div>
            </div>

            {/* Common Solutions */}
            <div className="bg-blue-50 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-blue-600" />
                Common Solutions
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">Check your internet connection and try again</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">Verify your card details and account balance</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">Try using a different payment method</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">Contact your bank if the issue persists</p>
                </li>
              </ul>
            </div>

            {/* Booking Status */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Your Booking Status</h3>
                  <p className="text-yellow-700">
                    Don't worry! Your flight selection is still reserved. You can retry payment or 
                    complete it later from your booking details.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {bookingReference && (
                <button
                  onClick={handleRetryPayment}
                  disabled={retryLoading}
                  className="flex-1 bg-green-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {retryLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Retry Payment</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={handleMyBookings}
                className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>My Bookings</span>
              </button>
              
              <button
                onClick={handleContactSupport}
                className="flex-1 bg-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <HelpCircle className="w-5 h-5" />
                <span>Get Help</span>
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleGoHome}
                className="w-full bg-white text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2 border border-gray-200"
              >
                <Home className="w-5 h-5" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>

        {/* Support Info */}
        <div className="text-center text-gray-500 text-sm">
          <p>Still having trouble? Email us at <a href="mailto:support@airline.com" className="text-blue-600 hover:underline">support@airline.com</a></p>
          <p className="mt-1">or call our 24/7 hotline: +84 (0) 123 456 789</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;