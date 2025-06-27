import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plane, 
  Users, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Gift,
  Info,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createBooking, getUserVouchers, getAvailableSeatsCount } from '../../services/BookingService';
import { getUserProfile } from '../../services/UserService';
import axiosInstance from '../../utils/axios';
import SeatMap from '../../components/SeatMap/SeatMap';
import styles from './Booking.module.css';

const BookingNew = () => {
  const { flightId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get search criteria from navigation state
  const searchCriteria = location.state?.searchCriteria || {};
  const initialPassengerCount = Math.min(parseInt(searchCriteria.passengers?.split(' ')[0] || '1'), 10);
  
  // Passenger count management (can be adjusted in booking flow)
  const [passengerCount, setPassengerCount] = useState(initialPassengerCount);

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    { id: 1, name: 'Flight Details', icon: Plane },
    { id: 2, name: 'Passengers', icon: Users },
    { id: 3, name: 'Seat Selection', icon: MapPin },
    { id: 4, name: 'Passenger Info', icon: User },
    { id: 5, name: 'Payment', icon: CreditCard }
  ];

  // Flight and fare data
  const [flightDetails, setFlightDetails] = useState(null);
  const [availableFares, setAvailableFares] = useState([]);
  const [selectedFare, setSelectedFare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Seat selection
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [availableSeatsCount, setAvailableSeatsCount] = useState(null);
  const [loadingAvailableSeats, setLoadingAvailableSeats] = useState(false);

  // Voucher
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  // User profile for auto-fill
  const [userProfile, setUserProfile] = useState(null);
  const [hasUsedAutoFill, setHasUsedAutoFill] = useState(false);

  // Passenger data - update when passenger count changes
  const [passengers, setPassengers] = useState([]);
  
  // Update passengers array when count changes
  useEffect(() => {
    setPassengers(prev => {
      const newPassengers = Array.from({ length: passengerCount }, (_, i) => {
        // Keep existing data if passenger already exists
        if (prev[i]) {
          return prev[i];
        }
        // Create new passenger with default values
        return {
          id: i,
          title: 'MR',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: 'MALE',
          nationality: 'VN',
          idNumber: '',
          passportNumber: '',
          countryOfIssue: '',
          passportExpiryDate: ''
        };
      });
      return newPassengers;
    });
    
    // Reset auto-fill state when passenger count changes
    setHasUsedAutoFill(false);
  }, [passengerCount]);
  
  // Contact and payment
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('VNPAY');
  const [processing, setProcessing] = useState(false);

  // Constants
  const MAX_PASSENGERS = 10;

  // Initialize flight data and fares
  useEffect(() => {
    const fetchFlightData = async () => {
      setLoading(true);
      try {
        console.log('Fetching flight details for:', flightId);
        
        // Get flight details with available fares
        const response = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
        const details = response.data;
        
        console.log('Flight details received:', details);
        
        if (!details || !details.availableFares) {
          throw new Error('Flight details or fares not available');
        }
        
        setFlightDetails(details);
        setAvailableFares(details.availableFares);
        
        // Auto-select fare based on search criteria
        const searchClass = (searchCriteria.class || 'economy').toLowerCase();
        const defaultFare = details.availableFares.find(f => 
          f.name.toLowerCase() === searchClass
        ) || details.availableFares[0];
        
        setSelectedFare(defaultFare);
        
      } catch (err) {
        console.error('Error fetching flight data:', err);
        setError(err.message || 'Failed to load flight information');
      } finally {
        setLoading(false);
      }
    };

    if (flightId) {
      fetchFlightData();
    }
  }, [flightId, searchCriteria]);

  // Load available vouchers
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        setLoadingVouchers(true);
        const vouchers = await getUserVouchers();
        setAvailableVouchers(vouchers);
        
        if (vouchers.length === 0) {
          console.info('No vouchers available for this user');
        } else {
          console.info(`Loaded ${vouchers.length} vouchers`);
        }
      } catch (err) {
        console.warn('Failed to load vouchers:', err.message);
        setAvailableVouchers([]);
      } finally {
        setLoadingVouchers(false);
      }
    };

    fetchVouchers();
  }, []);

  // Load user profile for auto-fill
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getUserProfile();
        setUserProfile(profile);
      } catch (err) {
        console.warn('Failed to load user profile:', err.message);
      }
    };

    fetchUserProfile();
  }, []);

  // Load seat map when fare is selected
  useEffect(() => {
    if (selectedFare) {
      setLoadingSeats(false);
      fetchAvailableSeatsCount();
    }
  }, [selectedFare, flightDetails]);

  // Fetch available seats count for the selected fare
  const fetchAvailableSeatsCount = async () => {
    if (!flightDetails?.flightId || !selectedFare) return;
    
    setLoadingAvailableSeats(true);
    try {
      const availableSeats = await getAvailableSeatsCount(flightDetails.flightId, selectedFare.name);
      setAvailableSeatsCount(availableSeats);
    } catch (error) {
      console.warn('Failed to fetch available seats count:', error);
      
      // Fallback: try to get seat sections and count available seats
      try {
        const seatResponse = await axiosInstance.get(
          `/flight-service/api/v1/fs/aircraft/${flightDetails.aircraft?.id}/seat-sections`
        );
        
        if (seatResponse.data?.seatSections) {
          const sections = seatResponse.data.seatSections;
          const fareClassName = selectedFare.name.toLowerCase();
          const availableSeats = sections[fareClassName] ? sections[fareClassName].length : 0;
          setAvailableSeatsCount(availableSeats);
        } else {
          setAvailableSeatsCount(null);
        }
      } catch (fallbackError) {
        console.warn('Fallback seat count also failed:', fallbackError);
        setAvailableSeatsCount(null);
        
        // Show toast notification about seat availability issue
        toast.warning('Unable to fetch real-time seat availability. Please contact support if you encounter issues.');
      }
    } finally {
      setLoadingAvailableSeats(false);
    }
  };

  // Check if passenger count exceeds limit
  useEffect(() => {
    const originalPassengerCount = parseInt(searchCriteria.passengers?.split(' ')[0] || '1');
    if (originalPassengerCount > MAX_PASSENGERS) {
      toast.warning(`Maximum ${MAX_PASSENGERS} passengers allowed per booking. Reduced to ${MAX_PASSENGERS} passengers.`);
    }
  }, [searchCriteria.passengers]);

  // Helper functions
  const formatVND = (amount) => {
    if (!amount || isNaN(amount)) return '0 VND';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  const calculateDuration = (departure, arrival) => {
    try {
      const durationMinutes = flightDetails?.flightDurationMinutes;
      if (durationMinutes) {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = Math.floor(durationMinutes % 60);
        return `${hours}h ${minutes}m`;
      }
      
      const departureDate = new Date(departure);
      const arrivalDate = new Date(arrival);
      const diffMs = arrivalDate - departureDate;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHrs}h ${diffMins}m`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Seat selection functions
  const handleSeatSelect = (seats) => {
    console.log('Seats selected:', seats);
    setSelectedSeats(seats);
    if (seats.length > 0) {
      toast.success(`${seats.length} seat(s) selected`);
    }
  };

  // Voucher functions
  const handleVoucherSelect = (voucher) => {
    setSelectedVoucher(voucher);
    setVoucherCode(voucher.code);
  };

  const handleVoucherCodeChange = (code) => {
    setVoucherCode(code);
    if (code === '') {
      setSelectedVoucher(null);
    } else {
      // Check if code matches any available voucher
      const matchingVoucher = availableVouchers.find(v => v.code === code);
      if (matchingVoucher) {
        setSelectedVoucher(matchingVoucher);
      }
    }
  };

  // Auto-fill passenger info with current user (only for first passenger, one-time use)
  const handleAutoFillFirstPassenger = () => {
    if (!userProfile) {
      toast.error('User profile not available');
      return;
    }

    if (hasUsedAutoFill) {
      toast.error('Auto-fill has already been used');
      return;
    }

    const updatedPassengers = [...passengers];
    updatedPassengers[0] = {
      ...updatedPassengers[0],
      firstName: userProfile.firstName || '',
      lastName: userProfile.lastName || '',
      dateOfBirth: userProfile.dateOfBirth || '',
      gender: userProfile.gender || 'MALE',
      nationality: userProfile.nationality || 'VN',
      idNumber: userProfile.idNumber || '',
      passportNumber: userProfile.passportNumber || '',
      countryOfIssue: userProfile.countryOfIssue || '',
      passportExpiryDate: userProfile.passportExpiryDate || ''
    };
    
    setPassengers(updatedPassengers);
    setHasUsedAutoFill(true); // Mark as used
    
    // Fill contact info if not already filled
    if (!contactInfo.email && userProfile.email) {
      setContactInfo(prev => ({
        ...prev,
        email: userProfile.email
      }));
    }
    
    if (!contactInfo.phone && userProfile.phone) {
      setContactInfo(prev => ({
        ...prev,
        phone: userProfile.phone
      }));
    }
    
    toast.success('Your information has been filled for the first passenger');
  };

  // Validation functions
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!selectedFare) {
          toast.error('Please select a fare');
          return false;
        }
        return true;
      case 2:
        if (passengerCount < 1 || passengerCount > MAX_PASSENGERS) {
          toast.error(`Please select between 1 and ${MAX_PASSENGERS} passengers`);
          return false;
        }
        if (availableSeatsCount !== null && passengerCount > availableSeatsCount) {
          toast.error(`Only ${availableSeatsCount} seats available for ${selectedFare?.name || 'selected'} class. Please reduce passenger count.`);
          return false;
        }
        return true;
      case 3:
        if (selectedSeats.length !== passengerCount) {
          toast.error(`Please select ${passengerCount} seats`);
          return false;
        }
        return true;
      case 4:
        // Validate passenger info
        for (let i = 0; i < passengers.length; i++) {
          const passenger = passengers[i];
          if (!passenger.firstName || !passenger.lastName || !passenger.dateOfBirth || !passenger.idNumber) {
            toast.error(`Please fill all required information for passenger ${i + 1}`);
            return false;
          }
        }
        
        // Validate contact info
        if (!contactInfo.email || !contactInfo.phone) {
          toast.error('Please provide contact information');
          return false;
        }
        if (!contactInfo.email.includes('@')) {
          toast.error('Please enter a valid email address');
          return false;
        }
        if (contactInfo.phone.length < 10) {
          toast.error('Please enter a valid phone number');
          return false;
        }
        
        return true;
      default:
        return true;
    }
  };

  // Navigation functions
  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Passenger change handler
  const handlePassengerChange = (passengerIndex, field, value) => {
    setPassengers(prev => prev.map((passenger, index) => 
      index === passengerIndex ? { ...passenger, [field]: value } : passenger
    ));
  };

  // Calculate total price
  const calculateTotal = () => {
    if (!selectedFare) return 0;
    
    const fareTotal = selectedFare.price * passengerCount;
    const taxes = Math.round(fareTotal * 0.1); // 10% tax
    
    return fareTotal + taxes;
  };

  // Booking submission
  const handleBookingSubmit = async () => {
    if (!validateCurrentStep()) return;

    // Additional validation for passenger limit
    if (passengers.length > MAX_PASSENGERS) {
      toast.error(`Maximum ${MAX_PASSENGERS} passengers allowed per booking`);
      return;
    }

    setProcessing(true);
    try {
      const bookingData = {
        flightId: flightDetails.flightId,
        selectedFareName: selectedFare.name.toUpperCase(),
        // Passengers can be anyone, not necessarily the booking user
        passengers: passengers.map(p => ({
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          nationality: p.nationality,
          title: p.title,
          idNumber: p.idNumber,
          passportNumber: p.passportNumber || null,
          countryOfIssue: p.countryOfIssue || null,
          passportExpiryDate: p.passportExpiryDate || null
        })),
        seatSelections: selectedSeats.map((seat, index) => ({
          seatCode: seat,
          passengerIndex: index,
          selectedFareName: selectedFare.name.toUpperCase()
        })),
        voucherCode: voucherCode.trim() || null,
        paymentMethod: paymentMethod
      };

      console.log('Submitting booking:', bookingData);
      const result = await createBooking(bookingData);
      
      toast.success('Booking created successfully!');
      navigate(`/booking-details/${result.bookingReference}`, {
        state: { bookingData: result }
      });
      
    } catch (err) {
      console.error('Booking error:', err);
      
      // Extract the actual error message from backend
      let errorMessage = 'Failed to create booking';
      
      // Check for specific error patterns from backend
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('not enough seats')) {
        // Refresh available seats count after booking failure
        fetchAvailableSeatsCount();
      }
      
      // Log the full error for debugging
      console.error('Full error details:', {
        response: err.response?.data,
        message: err.message,
        status: err.response?.status
      });
      
      // Show the exact error message in toast
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.bookingPage}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading flight information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !flightDetails) {
    return (
      <div className={styles.bookingPage}>
        <div className={styles.errorContainer}>
          <AlertCircle className={styles.errorIcon} />
          <h2>Flight Not Available</h2>
          <p>{error || 'Unable to load flight information'}</p>
          <button onClick={() => navigate('/flights')} className={styles.primaryBtn}>
            Back to Flights
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Flight Details and Fares
  const renderFlightDetailsAndFares = () => (
    <div className={styles.stepContent}>
      <div className={styles.fareSelection}>
        <h3>Select Your Fare</h3>
        <div className={styles.fareOptions}>
          {availableFares.map((fare, index) => (
            <div
              key={index}
              className={`${styles.fareOption} ${selectedFare?.name === fare.name ? styles.selected : ''}`}
              onClick={() => setSelectedFare(fare)}
            >
              <div className={styles.fareHeader}>
                <h4>{fare.name}</h4>
                <div className={styles.farePrice}>{formatVND(fare.price)}</div>
              </div>
              <div className={styles.fareFeatures}>
                <div className={styles.fareFeature}>
                  <CheckCircle size={16} />
                  <span>Carry-on bag included</span>
                </div>
                <div className={styles.fareFeature}>
                  <CheckCircle size={16} />
                  <span>Seat selection included</span>
                </div>
                {fare.name.toLowerCase() !== 'economy' && (
                  <div className={styles.fareFeature}>
                    <CheckCircle size={16} />
                    <span>Priority boarding</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Step 2: Passenger Count Selection
  const renderPassengerSelection = () => (
    <div className={styles.stepContent}>
      <div className={styles.passengerSelection}>
        <h3>Select Number of Passengers</h3>
        <p className={styles.selectionInfo}>
          Choose how many passengers you want to book for this flight
        </p>
        
        {/* Available seats info */}
        {loadingAvailableSeats ? (
          <div className={styles.availabilityLoading}>
            <div className={styles.loadingSpinner}></div>
            <span>Checking available seats...</span>
          </div>
        ) : availableSeatsCount !== null ? (
          <div className={`${styles.availabilityInfo} ${availableSeatsCount < passengerCount ? styles.warning : ''}`}>
            <Info size={16} />
            <span>
              Available seats for {selectedFare?.name || 'selected'} class: <strong>{availableSeatsCount}</strong>
              {availableSeatsCount < passengerCount && (
                <span className={styles.warningText}> - Please reduce to {availableSeatsCount} or fewer passengers</span>
              )}
            </span>
            <button 
              type="button" 
              onClick={fetchAvailableSeatsCount} 
              className={styles.refreshBtn}
              title="Refresh seat availability"
            >
              ↻
            </button>
          </div>
        ) : (
          <div className={styles.availabilityWarning}>
            <AlertCircle size={16} />
            <span>Unable to check seat availability. Please proceed with caution.</span>
            <button 
              type="button" 
              onClick={fetchAvailableSeatsCount} 
              className={styles.refreshBtn}
              title="Try to check availability again"
            >
              ↻ Retry
            </button>
          </div>
        )}
        
        <div className={styles.passengerCounter}>
          <div className={styles.counterGroup}>
            <div className={styles.counterInfo}>
              <h4>Number of Passengers</h4>
              <p>Maximum {availableSeatsCount !== null ? Math.min(MAX_PASSENGERS, availableSeatsCount) : MAX_PASSENGERS} passengers{availableSeatsCount !== null ? ` (limited by available seats)` : ` per booking`}</p>
            </div>
            <div className={styles.counterControls}>
              <button
                type="button"
                onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                disabled={passengerCount <= 1}
                className={styles.counterBtn}
              >
                -
              </button>
              <span className={styles.counterValue}>{passengerCount}</span>
              <button
                type="button"
                onClick={() => setPassengerCount(Math.min(
                  availableSeatsCount !== null ? Math.min(MAX_PASSENGERS, availableSeatsCount) : MAX_PASSENGERS, 
                  passengerCount + 1
                ))}
                disabled={passengerCount >= (availableSeatsCount !== null ? Math.min(MAX_PASSENGERS, availableSeatsCount) : MAX_PASSENGERS)}
                className={styles.counterBtn}
              >
                +
              </button>
            </div>
          </div>
        </div>
        
        <div className={styles.passengerSummary}>
          <div className={styles.summaryItem}>
            <span>{passengerCount} passenger{passengerCount > 1 ? 's' : ''}</span>
            <span>{formatVND(selectedFare?.price * passengerCount || 0)}</span>
          </div>
          {availableSeatsCount !== null && passengerCount > availableSeatsCount && (
            <div className={styles.summaryWarning}>
              <AlertCircle size={16} />
              <span>Warning: Not enough seats available for {passengerCount} passengers</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Step 3: Seat Selection
  const renderSeatSelection = () => (
    <div className={styles.stepContent}>
      <div className={styles.seatSelection}>
        <h3>Select Your Seats</h3>
        <p className={styles.seatInfo}>
          Choose {passengerCount} seat{passengerCount > 1 ? 's' : ''} for your flight
        </p>
        
        {selectedFare && (
          <SeatMap
            flightId={flightDetails.flightId}
            aircraftId={flightDetails.aircraft?.id || 'default-aircraft'}
            passengerCount={passengerCount}
            selectedSeats={selectedSeats}
            onSeatSelect={handleSeatSelect}
            selectedFareClass={selectedFare.name?.toLowerCase()}
            disabled={false}
          />
        )}
        
        {selectedSeats.length > 0 && (
          <div className={styles.selectedSeats}>
            <h4>Selected Seats:</h4>
            <div className={styles.seatTags}>
              {selectedSeats.map((seat, index) => (
                <span key={seat} className={styles.seatTag}>{seat}</span>
              ))}
            </div>
            <p className={styles.seatIncluded}>✓ Seat selection included in fare</p>
          </div>
        )}
      </div>
    </div>
  );

  // Step 4: Passenger Information
  const renderPassengerInfo = () => (
    <div className={styles.stepContent}>
      <div className={styles.passengerForms}>
        <div className={styles.passengerFormHeader}>
          <h3>Passenger Information</h3>
          <p className={styles.passengerLimit}>
            <Info size={16} />
            Enter information for {passengerCount} passenger{passengerCount > 1 ? 's' : ''}
          </p>
          {userProfile && !hasUsedAutoFill && (
            <div className={styles.autoFillHint}>
              <UserCheck size={14} />
              <span>You can use "Use My Info" button for the first passenger to quickly fill your details</span>
            </div>
          )}
        </div>
        
        {passengers.map((passenger, index) => (
          <div key={index} className={styles.passengerForm}>
            <div className={styles.passengerHeader}>
              <h4>
                <User size={20} />
                Passenger {index + 1}
                {selectedSeats[index] && ` - Seat ${selectedSeats[index]}`}
              </h4>
              
              {/* Auto-fill button only for first passenger and only if not used yet */}
              {index === 0 && userProfile && !hasUsedAutoFill && (
                <button
                  type="button"
                  onClick={handleAutoFillFirstPassenger}
                  className={styles.autoFillBtn}
                  title="Fill with your profile information (one-time use)"
                >
                  <UserCheck size={16} />
                  Use My Info
                </button>
              )}
              
              {/* Show used indicator for first passenger if auto-fill was used */}
              {index === 0 && hasUsedAutoFill && (
                <div className={styles.autoFillUsed}>
                  <CheckCircle size={16} />
                  <span>Auto-filled</span>
                </div>
              )}
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Title *</label>
                <select
                  value={passenger.title}
                  onChange={(e) => handlePassengerChange(index, 'title', e.target.value)}
                  className={styles.select}
                >
                  <option value="MR">Mr</option>
                  <option value="MS">Ms</option>
                  <option value="MRS">Mrs</option>
                  <option value="MISS">Miss</option>
                  <option value="MST">Master</option>
                </select>
              </div>
              
              <div className={styles.inputGroup}>
                <label>First Name *</label>
                <input
                  type="text"
                  value={passenger.firstName}
                  onChange={(e) => handlePassengerChange(index, 'firstName', e.target.value)}
                  className={styles.input}
                  placeholder="Enter first name"
                  required
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Last Name *</label>
                <input
                  type="text"
                  value={passenger.lastName}
                  onChange={(e) => handlePassengerChange(index, 'lastName', e.target.value)}
                  className={styles.input}
                  placeholder="Enter last name"
                  required
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Date of Birth *</label>
                <input
                  type="date"
                  value={passenger.dateOfBirth}
                  onChange={(e) => handlePassengerChange(index, 'dateOfBirth', e.target.value)}
                  className={styles.input}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Gender *</label>
                <select
                  value={passenger.gender}
                  onChange={(e) => handlePassengerChange(index, 'gender', e.target.value)}
                  className={styles.select}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              
              <div className={styles.inputGroup}>
                <label>Nationality *</label>
                <select
                  value={passenger.nationality}
                  onChange={(e) => handlePassengerChange(index, 'nationality', e.target.value)}
                  className={styles.select}
                >
                  <option value="VN">Vietnam</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="FR">France</option>
                  <option value="DE">Germany</option>
                  <option value="JP">Japan</option>
                  <option value="KR">South Korea</option>
                  <option value="CN">China</option>
                  <option value="SG">Singapore</option>
                  <option value="TH">Thailand</option>
                  <option value="MY">Malaysia</option>
                </select>
              </div>
              
              <div className={styles.inputGroup}>
                <label>ID Number *</label>
                <input
                  type="text"
                  value={passenger.idNumber}
                  onChange={(e) => handlePassengerChange(index, 'idNumber', e.target.value)}
                  className={styles.input}
                  placeholder="National ID / Driver's License"
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Passport Number</label>
                <input
                  type="text"
                  value={passenger.passportNumber}
                  onChange={(e) => handlePassengerChange(index, 'passportNumber', e.target.value)}
                  className={styles.input}
                  placeholder="For international flights"
                />
              </div>
            </div>
          </div>
        ))}
        
        <div className={styles.contactInfo}>
          <h4>
            <Mail size={20} />
            Contact Information
          </h4>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Email *</label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                className={styles.input}
                placeholder="your@email.com"
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label>Phone *</label>
              <input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                className={styles.input}
                placeholder="+84 123 456 789"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 4: Payment
  const renderPayment = () => (
    <div className={styles.stepContent}>
      <div className={styles.paymentSection}>
        {/* Voucher Section */}
        <div className={styles.voucherSection}>
          <h3>
            <Gift size={20} />
            Discount Voucher (Optional)
          </h3>
          
          <div className={styles.voucherContainer}>
            <div className={styles.voucherInput}>
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => handleVoucherCodeChange(e.target.value)}
                className={styles.input}
                placeholder="Enter voucher code"
              />
              {selectedVoucher && (
                <div className={styles.voucherApplied}>
                  <CheckCircle size={16} color="green" />
                  <span>{selectedVoucher.name} applied!</span>
                </div>
              )}
            </div>
            
            {loadingVouchers && (
              <div className={styles.loadingVouchers}>
                <div className={styles.loadingSpinner}></div>
                Loading your vouchers...
              </div>
            )}
            
            {!loadingVouchers && availableVouchers.length > 0 && (
              <div className={styles.availableVouchers}>
                <h4>Your Available Vouchers:</h4>
                <div className={styles.voucherList}>
                  {availableVouchers.map((voucher, index) => (
                    <div 
                      key={index}
                      className={`${styles.voucherCard} ${selectedVoucher?.code === voucher.code ? styles.selected : ''}`}
                      onClick={() => handleVoucherSelect(voucher)}
                    >
                      <div className={styles.voucherInfo}>
                        <div className={styles.voucherCode}>{voucher.code}</div>
                        <div className={styles.voucherName}>{voucher.name}</div>
                        <div className={styles.voucherDiscount}>
                          {voucher.discountPercentage}% off
                          {voucher.maximumDiscountAmount && (
                            <span> (max {formatVND(voucher.maximumDiscountAmount)})</span>
                          )}
                        </div>
                        {voucher.minimumPurchaseAmount && (
                          <div className={styles.voucherMin}>
                            Min purchase: {formatVND(voucher.minimumPurchaseAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!loadingVouchers && availableVouchers.length === 0 && (
              <div className={styles.noVouchersMessage}>
                <Info size={16} />
                No vouchers available at this time
              </div>
            )}
          </div>
        </div>

        <div className={styles.paymentMethods}>
          <h3>Payment Method</h3>
          
          <div className={styles.paymentOptions}>
            <label className={`${styles.paymentOption} ${paymentMethod === 'VNPAY' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="VNPAY"
                checked={paymentMethod === 'VNPAY'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div className={styles.paymentContent}>
                <CreditCard className={styles.paymentIcon} />
                <div>
                  <div className={styles.paymentName}>VNPay</div>
                  <div className={styles.paymentDesc}>Credit/Debit Card, Internet Banking</div>
                </div>
              </div>
            </label>
            
            <label className={`${styles.paymentOption} ${paymentMethod === 'CASH' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="CASH"
                checked={paymentMethod === 'CASH'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div className={styles.paymentContent}>
                <Users className={styles.paymentIcon} />
                <div>
                  <div className={styles.paymentName}>Pay Later</div>
                  <div className={styles.paymentDesc}>Pay at airport counter</div>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderFlightDetailsAndFares();
      case 2:
        return renderPassengerSelection();
      case 3:
        return renderSeatSelection();
      case 4:
        return renderPassengerInfo();
      case 5:
        return renderPayment();
      default:
        return renderFlightDetailsAndFares();
    }
  };

  return (
    <div className={styles.bookingPage}>
      <div className={styles.bookingContainer}>
        {/* Header */}
        <div className={styles.bookingHeader}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <ArrowLeft size={20} />
            Back to Flights
          </button>
          <div className={styles.headerContent}>
            <h1>Complete Your Booking</h1>
            <p>
              Flight {flightDetails.flightCode} • {flightDetails.originAirport.city} to {flightDetails.destinationAirport.city}
            </p>
          </div>
        </div>

        {/* Flight Summary */}
        <div className={styles.flightSummary}>
          <div className={styles.flightRoute}>
            <div className={styles.routePoint}>
              <div className={styles.routeTime}>{formatTime(flightDetails.departureTime)}</div>
              <div className={styles.routeLocation}>
                <MapPin size={16} />
                {flightDetails.originAirport.code} - {flightDetails.originAirport.city}
              </div>
            </div>
            
            <div className={styles.routeConnector}>
              <div className={styles.routeLine}></div>
              <Plane className={styles.routePlane} />
              <div className={styles.routeDuration}>
                {calculateDuration(flightDetails.departureTime, flightDetails.estimatedArrivalTime)}
              </div>
            </div>
            
            <div className={styles.routePoint}>
              <div className={styles.routeTime}>{formatTime(flightDetails.estimatedArrivalTime)}</div>
              <div className={styles.routeLocation}>
                <MapPin size={16} />
                {flightDetails.destinationAirport.code} - {flightDetails.destinationAirport.city}
              </div>
            </div>
          </div>

          <div className={styles.flightMeta}>
            <div className={styles.metaItem}>
              <Calendar size={16} />
              <span>{formatDate(flightDetails.departureTime)}</span>
            </div>
            <div className={styles.metaItem}>
              <Users size={16} />
              <span>{passengerCount} passenger{passengerCount > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className={styles.progressSteps}>
          {steps.map((step, index) => (
            <div key={step.id} className={styles.stepContainer}>
              <div className={`${styles.step} ${currentStep === step.id ? styles.active : ''} ${currentStep > step.id ? styles.completed : ''}`}>
                <div className={styles.stepIcon}>
                  {currentStep > step.id ? <CheckCircle size={20} /> : <step.icon size={20} />}
                </div>
                <span className={styles.stepName}>{step.name}</span>
              </div>
              {index < steps.length - 1 && <div className={styles.stepConnector}></div>}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.contentArea}>
            {renderStepContent()}
          </div>

          {/* Booking Summary */}
          <div className={styles.bookingSummary}>
            <h3>Booking Summary</h3>
            
            <div className={styles.summarySection}>
              <h4>Flight Details</h4>
              <div className={styles.summaryItem}>
                <span>Flight {flightDetails.flightCode}</span>
                <span>{flightDetails.originAirport.code} → {flightDetails.destinationAirport.code}</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Date</span>
                <span>{formatDate(flightDetails.departureTime)}</span>
              </div>
            </div>

            {selectedFare && (
              <div className={styles.summarySection}>
                <h4>Fare & Passengers</h4>
                <div className={styles.summaryItem}>
                  <span>{selectedFare.name} fare ({passengerCount} × {formatVND(selectedFare.price)})</span>
                  <span>{formatVND(selectedFare.price * passengerCount)}</span>
                </div>
              </div>
            )}

            {selectedSeats.length > 0 && (
              <div className={styles.summarySection}>
                <h4>Selected Seats</h4>
                <div className={styles.summaryItem}>
                  <span>Seats: {selectedSeats.join(', ')}</span>
                  <span>Included</span>
                </div>
              </div>
            )}

            <div className={styles.summarySection}>
              <h4>Price Breakdown</h4>
              <div className={styles.summaryItem}>
                <span>Subtotal</span>
                <span>{formatVND(selectedFare ? selectedFare.price * passengerCount : 0)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Taxes & Fees</span>
                <span>{formatVND(selectedFare ? Math.round(selectedFare.price * passengerCount * 0.1) : 0)}</span>
              </div>
              <div className={`${styles.summaryItem} ${styles.total}`}>
                <span>Total</span>
                <span>{formatVND(calculateTotal())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className={styles.navigationBar}>
          <div className={styles.navButtons}>
            {currentStep > 1 && (
              <button onClick={handlePrevStep} className={styles.secondaryBtn}>
                <ArrowLeft size={16} />
                Previous
              </button>
            )}
            
            {currentStep < steps.length ? (
              <button 
                onClick={handleNextStep}
                className={styles.primaryBtn}
              >
                Continue
              </button>
            ) : (
              <button 
                onClick={handleBookingSubmit}
                disabled={processing}
                className={styles.primaryBtn}
              >
                {processing ? (
                  <>
                    <div className={styles.btnSpinner}></div>
                    Processing...
                  </>
                ) : (
                  `Confirm Booking - ${formatVND(calculateTotal())}`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingNew;
