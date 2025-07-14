import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getData } from 'country-list';
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
  ArrowRight,
  ChevronRight,
  User,
  Mail,
  Phone,
  Gift,
  Info,
  UserCheck,
  Package
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createBooking, getUserVouchers, getAvailableSeatsCount, checkSeatAvailability } from '../../services/BookingService';
import { getUserProfile } from '../../services/UserService';
import axiosInstance from '../../utils/axios';
import SeatMap from '../../components/SeatMap/SeatMap';
import BaggageSelection from '../../components/BaggageSelection/BaggageSelection';
import VoucherSelection from '../../components/VoucherSelection/VoucherSelection';
import { useAuth } from '../../context/AuthContext';
import styles from './Booking.module.css';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Debug authentication status
  useEffect(() => {
    console.log('🔐 Booking page authentication status:');
    console.log('- User:', user);
    console.log('- Token exists:', !!localStorage.getItem('token'));
    console.log('- Current user data:', localStorage.getItem('currentUser'));
  }, [user]);

  const countries = useMemo(() => getData(), []);

  // Get flight IDs and passenger details from URL parameters
  const flightIdsParam = searchParams.get('flights');
  const noPassengersParam = searchParams.get('noPassengers');
  const adultsParam = searchParams.get('adults');
  const childrenParam = searchParams.get('children');
  const infantsParam = searchParams.get('infants');

  // Parse flight IDs
  const flightIds = flightIdsParam ? flightIdsParam.split(',') : [];

  // Parse passenger counts from URL with proper fallbacks
  const urlAdults = parseInt(adultsParam || '0');
  const urlChildren = parseInt(childrenParam || '0');
  const urlInfants = parseInt(infantsParam || '0');
  const urlTotalFromParams = urlAdults + urlChildren + urlInfants;

  // Use URL passenger breakdown if available, otherwise fallback to noPassengers
  const initialAdultCount = urlTotalFromParams > 0 ? urlAdults : parseInt(noPassengersParam || '1');
  const initialChildCount = urlTotalFromParams > 0 ? urlChildren : 0;
  const initialInfantCount = urlTotalFromParams > 0 ? urlInfants : 0;
  const initialPassengerCount = initialAdultCount + initialChildCount + initialInfantCount;

  // Legacy support - get search criteria from navigation state if available
  const searchCriteria = location.state?.searchCriteria || {};

  // Passenger count management (fixed from URL parameters, no adjustment allowed)
  const [passengerCount, setPassengerCount] = useState(initialPassengerCount);

  // State for different passenger types - set from URL parameters
  const [adultCount, setAdultCount] = useState(initialAdultCount);
  const [childCount, setChildCount] = useState(initialChildCount);
  const [infantCount, setInfantCount] = useState(initialInfantCount);

  // Step management - Updated to 4 steps with baggage
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    { id: 1, name: 'Seat Selection', icon: MapPin },
    { id: 2, name: 'Passenger Info', icon: User },
    { id: 3, name: 'Baggage Add-ons', icon: Package },
    { id: 4, name: 'Payment', icon: CreditCard }
  ];

  // Flight and fare data - updated to handle multiple flights
  const [flightDetails, setFlightDetails] = useState(null);
  const [allFlightDetails, setAllFlightDetails] = useState([]); // For multiple flights
  const [availableFares, setAvailableFares] = useState([]);
  const [selectedFare, setSelectedFare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Seat selection
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [availableSeatsCount, setAvailableSeatsCount] = useState(null);
  const [loadingAvailableSeats, setLoadingAvailableSeats] = useState(false);

  // Multi-flight seat selection management
  const [currentFlightTab, setCurrentFlightTab] = useState(0);
  const [selectedSeatsByFlight, setSelectedSeatsByFlight] = useState({});
  const [seatClassesByFlight, setSeatClassesByFlight] = useState({});

  // Voucher
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  // User profile for auto-fill
  const [userProfile, setUserProfile] = useState(null);
  const [hasUsedAutoFill, setHasUsedAutoFill] = useState(false);

  // Baggage add-ons
  const [baggageSelections, setBaggageSelections] = useState({});
  const [showBaggageSelection, setShowBaggageSelection] = useState(false);

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
          passportExpiryDate: '',
          passengerType: 'ADULT', // Default as ADULT - can be ADULT, CHILD, INFANT
          requiresDocument: true // Default true, will be evaluated based on age
        };
      });
      return newPassengers;
    });

    // Reset auto-fill state when passenger count changes
    setHasUsedAutoFill(false);
  }, [passengerCount]);



  const isSeatSelectionComplete = useMemo(() => {
    const requiredSeatsPerFlight = adultCount + childCount;

    // If there are no seats to select, consider it complete to not block the process.
    if (requiredSeatsPerFlight === 0) {
      return true;
    }

    // For connecting flights, every flight segment must have the required number of seats.
    if (allFlightDetails.length > 1) {
      return allFlightDetails.every((flight, index) => {
        const selectedForFlight = selectedSeatsByFlight[index] || [];
        return selectedForFlight.length === requiredSeatsPerFlight;
      });
    }

    // For a single flight.
    const totalSelected = Object.values(selectedSeatsByFlight).flat();
    return totalSelected.length === requiredSeatsPerFlight;

  }, [selectedSeatsByFlight, adultCount, childCount, allFlightDetails]);

  // Function to update passenger count and types
  const updatePassengerTypes = () => {
    const totalCount = adultCount + childCount + infantCount;
    setPassengerCount(totalCount);

    setPassengers(prev => {
      // Create an array with the right number of each passenger type
      const adults = Array.from({ length: adultCount }, (_, i) => ({
        ...(prev[i] || {}),
        id: i,
        title: prev[i]?.title || 'MR',
        firstName: prev[i]?.firstName || '',
        lastName: prev[i]?.lastName || '',
        dateOfBirth: prev[i]?.dateOfBirth || '',
        gender: prev[i]?.gender || 'MALE',
        nationality: prev[i]?.nationality || 'VN',
        idNumber: prev[i]?.idNumber || '',
        passportNumber: prev[i]?.passportNumber || '',
        countryOfIssue: prev[i]?.countryOfIssue || '',
        passportExpiryDate: prev[i]?.passportExpiryDate || '',
        passengerType: 'ADULT',
        requiresDocument: true
      }));

      const children = Array.from({ length: childCount }, (_, i) => {
        const index = adultCount + i;
        return {
          ...(prev[index] || {}),
          id: index,
          title: prev[index]?.title || 'MISS',
          firstName: prev[index]?.firstName || '',
          lastName: prev[index]?.lastName || '',
          dateOfBirth: prev[index]?.dateOfBirth || '',
          gender: prev[index]?.gender || 'MALE',
          nationality: prev[index]?.nationality || 'VN',
          idNumber: prev[index]?.idNumber || '',
          passportNumber: prev[index]?.passportNumber || '',
          countryOfIssue: prev[index]?.countryOfIssue || '',
          passportExpiryDate: prev[index]?.passportExpiryDate || '',
          passengerType: 'CHILD',
          requiresDocument: false
        };
      });

      const infants = Array.from({ length: infantCount }, (_, i) => {
        const index = adultCount + childCount + i;
        return {
          ...(prev[index] || {}),
          id: index,
          title: prev[index]?.title || 'MISS',
          firstName: prev[index]?.firstName || '',
          lastName: prev[index]?.lastName || '',
          dateOfBirth: prev[index]?.dateOfBirth || '',
          gender: prev[index]?.gender || 'MALE',
          nationality: prev[index]?.nationality || 'VN',
          idNumber: prev[index]?.idNumber || '',
          passportNumber: prev[index]?.passportNumber || '',
          countryOfIssue: prev[index]?.countryOfIssue || '',
          passportExpiryDate: prev[index]?.passportExpiryDate || '',
          passengerType: 'INFANT',
          requiresDocument: false
        };
      });

      return [...adults, ...children, ...infants];
    });
  };

  // Contact and payment
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('VNPAY_BANKTRANSFER');
  const [processing, setProcessing] = useState(false);
  // Add booking progress state
  const [bookingProgress, setBookingProgress] = useState(0);

  // Constants
  const MAX_PASSENGERS = 10;

  // Helper functions for passenger types
  const determinePassengerType = (dateOfBirth) => {
    if (!dateOfBirth) return 'ADULT';

    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 2) return 'INFANT';     // Infant: Under 2 years
    if (age < 12) return 'CHILD';     // Child: 2-11 years
    return 'ADULT';                   // Adult: 12 years and older
  };

  const requiresIdentityDocument = (dateOfBirth) => {
    if (!dateOfBirth) return true;

    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 14; // Requires ID for 14 years and above
  };

  const isPassengerInfoValid = useMemo(() => {
    for (const [index, passenger] of passengers.entries()) {
      if (!passenger.firstName?.trim() || !passenger.lastName?.trim() || !passenger.dateOfBirth) {
        return false;
      }
      let designatedType;
      if (index < adultCount) {
        designatedType = 'ADULT';
      } else if (index < adultCount + childCount) {
        designatedType = 'CHILD';
      } else {
        designatedType = 'INFANT';
      }

      const actualTypeFromDob = determinePassengerType(passenger.dateOfBirth);
      if (actualTypeFromDob !== designatedType) {
        return false;
      }
    }

    if (!contactInfo.email?.trim() || !contactInfo.phone?.trim()) {
      return false;
    }

    return true;
  }, [passengers, contactInfo, adultCount, childCount]);

  // Validate URL parameters
  useEffect(() => {
    if (!flightIds.length) {
      setError('No flight IDs provided. Please select flights from the search page.');
      setLoading(false);
      return;
    }

    // Validate flight IDs format (should be UUIDs)
    const invalidFlightIds = flightIds.filter(id => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return !uuidRegex.test(id);
    });

    if (invalidFlightIds.length > 0) {
      setError(`Invalid flight ID format: ${invalidFlightIds.join(', ')}. Please return to the search page.`);
      setLoading(false);
      return;
    }

    if (isNaN(initialPassengerCount) || initialPassengerCount < 1) {
      setError('Invalid passenger count. Please return to the search page.');
      setLoading(false);
      return;
    }

    if (flightIds.length > 5) {
      setError('Maximum 5 flight segments allowed per booking. Please contact customer service for complex itineraries.');
      setLoading(false);
      return;
    }
    if (initialInfantCount > initialAdultCount) {
      setError(
        'The number of infants cannot exceed the number of adults. Each infant must be accompanied by an adult. Please return to the flight search page to adjust your selection.'
      );
      setLoading(false); // Stop the loading spinner
      return; // Stop further execution of this hook
    }
  }, [flightIds.join(','), initialAdultCount, initialChildCount, initialInfantCount]); // Update dependencies

  // Initialize flight data and fares
  useEffect(() => {
    const fetchFlightData = async () => {
      if (!flightIds.length) return;

      setLoading(true);
      setError(null);
      try {
        // Step 1: Fetch basic details for all flights in parallel
        const flightPromises = flightIds.map(id =>
          axiosInstance.get(`/flight-service/api/v1/fs/flights/${id}/details`)
        );
        const flightResponses = await Promise.all(flightPromises);
        let flightDetailsArray = flightResponses.map(res => res.data);

        if (flightDetailsArray.some(flight => !flight)) {
          throw new Error('Failed to load details for one or more flights.');
        }

        // Step 2: For each flight, fetch its detailed information including seat layout
        const detailPromises = flightDetailsArray.map(flight => {
          if (!flight.flightId) {
            // If a flight is missing flight ID, return it as-is to avoid a crash
            console.warn(`Flight is missing flight ID.`);
            return Promise.resolve(flight);
          }
          return axiosInstance.get(`/flight-service/api/v1/fs/flights/${flight.flightId}/details`);
        });

        const detailResponses = await Promise.all(detailPromises);

        // Step 3: Merge the detailed flight data including seat information
        const enrichedFlightDetails = flightDetailsArray.map((flight, index) => {
          const detailedFlightData = detailResponses[index]?.data;
          if (detailedFlightData) {
            // Transform the fare data to include seat sections for backward compatibility
            const seatSections = {};
            if (detailedFlightData.availableFares) {
              detailedFlightData.availableFares.forEach(fare => {
                if (fare.seats && fare.seats.length > 0) {
                  seatSections[fare.fareType] = fare.seats;
                }
              });
            }
            
            return {
              ...flight,
              ...detailedFlightData,
              aircraft: {
                ...flight.aircraft,
                ...detailedFlightData.aircraft,
                seatSections: seatSections,
              },
            };
          }
          return flight; // Return original flight if details couldn't be fetched
        });

        // Step 4: Set the final, complete state
        setAllFlightDetails(enrichedFlightDetails);
        setFlightDetails(enrichedFlightDetails[0]); // for legacy single-flight display
        setAvailableFares(enrichedFlightDetails[0].availableFares);

      } catch (err) {
        console.error('Error fetching comprehensive flight data:', err);
        setError(err.message || 'Failed to load complete flight information.');
      } finally {
        setLoading(false);
      }
    };

    fetchFlightData();
  }, [flightIds.join(',')]);

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

  // Update passenger types when counts change
  useEffect(() => {
    updatePassengerTypes();
  }, [adultCount, childCount, infantCount]);

  // Fetch available seats count across all fare classes
  const fetchAvailableSeatsCount = async () => {
    if (!flightDetails?.flightId) return;

    setLoadingAvailableSeats(true);
    try {
      // Get detailed flight information which includes seat data
      const flightDetailsResponse = await axiosInstance.get(
        `/flight-service/api/v1/fs/flights/${flightDetails.flightId}/details`
      );

      if (flightDetailsResponse.data?.availableFares) {
        const fares = flightDetailsResponse.data.availableFares;
        
        // Transform fare data to seat sections format for backward compatibility
        const sections = {};
        fares.forEach(fare => {
          if (fare.seats && fare.seats.length > 0) {
            sections[fare.fareType] = fare.seats;
          }
        });

        // Save seat sections data to flightDetails for use in price calculations
        setFlightDetails(prev => ({
          ...prev,
          aircraft: {
            ...prev.aircraft,
            seatSections: sections
          }
        }));

        // Count total available seats across all fare classes
        let totalAvailable = 0;
        Object.values(sections).forEach(seatArray => {
          if (Array.isArray(seatArray)) {
            totalAvailable += seatArray.length;
          }
        });
        setAvailableSeatsCount(totalAvailable);
      } else {
        // Fallback: try economy fare specifically
        try {
          const economySeats = await getAvailableSeatsCount(flightDetails.flightId, 'ECONOMY');
          setAvailableSeatsCount(economySeats || null);
        } catch (economyError) {
          console.warn('Could not fetch seat availability:', economyError);
          setAvailableSeatsCount(null);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch available seats count:', error);
      setAvailableSeatsCount(null);

      // Show toast notification about seat availability issue
      toast.warning('Unable to fetch real-time seat availability. Please contact support if you encounter issues.');
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

  // Calculate total cost including all fees, taxes, and discounts for multi-flight booking


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

  const formatFlightDuration = (durationMinutes) => {
    if (!durationMinutes) return 'N/A';
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.floor(durationMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  // Helper function to calculate age from date of birth
  const getAgeFromDateOfBirth = (dateOfBirth) => {
    if (!dateOfBirth) return null;

    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  // Seat selection functions
  const handleSeatSelect = (seats) => {
    setSelectedSeats(seats);

    // For single flight bookings, update our tracking of seat classes
    if (seats.length > 0) {
      // Get the current flight (for single flight bookings there is only one flight)
      const flight = flightDetails;

      // Determine seat classes for each seat
      const seatClasses = {};
      seats.forEach(seat => {
        const seatClass = getSeatClassForFlight(seat, flight);
        seatClasses[seat] = seatClass;
      });

      // Update seat classes for this flight (assuming flight index 0 for single flights)
      setSeatClassesByFlight(prev => ({
        ...prev,
        0: seatClasses
      }));

      // Also update the seat selection for the first flight
      setSelectedSeatsByFlight(prev => ({
        ...prev,
        0: seats
      }));

      // Update selected fare based on seat selection if we have mixed classes
      const hasBusinessSeats = seats.some(seat => isSeatInClass(seat, 'BUSINESS'));
      const hasFirstSeats = seats.some(seat => isSeatInClass(seat, 'FIRST_CLASS'));

      if (hasFirstSeats && !selectedFare?.name?.includes('FIRST')) {
        const firstFare = availableFares.find(f => f.name.toUpperCase().includes('FIRST'));
        if (firstFare) setSelectedFare(firstFare);
      } else if (hasBusinessSeats && !selectedFare?.name?.includes('BUSINESS') && !hasFirstSeats) {
        const businessFare = availableFares.find(f => f.name.toUpperCase().includes('BUSINESS'));
        if (businessFare) setSelectedFare(businessFare);
      }
    }
  };

  // Multi-flight seat selection handler
  const handleMultiFlightSeatSelect = (flightIndex, seats) => {
    // Update selected seats for this specific flight
    setSelectedSeatsByFlight(prev => ({
      ...prev,
      [flightIndex]: seats
    }));

    // Get the current flight
    const flight = allFlightDetails[flightIndex];

    // Determine seat classes for each seat in this flight
    const seatClasses = {};
    seats.forEach(seat => {
      // Get the seat class for this specific seat in this flight
      const seatClass = getSeatClassForFlight(seat, flight);
      seatClasses[seat] = seatClass;
    });

    // Update seat classes for this flight
    setSeatClassesByFlight(prev => ({
      ...prev,
      [flightIndex]: seatClasses
    }));

    // Update overall selected seats for backward compatibility
    const allSeats = Object.values({
      ...selectedSeatsByFlight,
      [flightIndex]: seats
    }).flat();
    setSelectedSeats(allSeats);
  };

  // Helper function to check if seat is in a specific class
  const isSeatInClass = (seatCode, fareClass) => {
    if (!flightDetails?.aircraft?.seatSections) return false;

    const sections = flightDetails.aircraft.seatSections;
    const seatArray = sections[fareClass];

    return Array.isArray(seatArray) && seatArray.includes(seatCode);
  };

  const handlePassengerChange = (index, field, value) => {
    const updatedPassengers = [...passengers];

    const passenger = { ...updatedPassengers[index], [field]: value };

    if (field === 'dateOfBirth') {
      passenger.passengerType = determinePassengerType(value);
      passenger.requiresDocument = requiresIdentityDocument(value);
    }

    updatedPassengers[index] = passenger;

    setPassengers(updatedPassengers);
  };

  // Helper function to get seat class from seat code for a specific flight
  const getSeatClassForFlight = (seatCode, flight) => {
    // Early check for missing inputs
    if (!seatCode || !flight) {
      console.warn('getSeatClassForFlight called with missing parameters:', { seatCode, flight });
      return 'ECONOMY';
    }
    if (flight?.aircraft?.seatSections) {
      const sections = flight.aircraft.seatSections;

      // Normalize keys to uppercase for consistent comparison
      const normalizedSections = {};
      Object.entries(sections).forEach(([key, value]) => {
        normalizedSections[key.toUpperCase()] = value;
      });

      // Check standard section names first
      const standardSections = ['FIRST_CLASS', 'BUSINESS', 'ECONOMY'];
      for (const section of standardSections) {
        if (normalizedSections[section] &&
          Array.isArray(normalizedSections[section]) &&
          normalizedSections[section].includes(seatCode)) {
          return section;
        }
      }

      // If not found in standard sections, check all other sections
      for (const [sectionClass, seats] of Object.entries(normalizedSections)) {
        // Skip if we already checked this section
        if (standardSections.includes(sectionClass)) continue;

        if (Array.isArray(seats) && seats.includes(seatCode)) {
          return sectionClass;
        }
      }
    }

    const match = seatCode.match(/(\d+)([A-Z])/);
    if (match) {
      const rowNum = parseInt(match[1]);
      const seatLetter = match[2];

      // First class is typically in the front rows (1-5) and seats A, B, J, K
      if (rowNum <= 5 && ['A', 'B', 'J', 'K'].includes(seatLetter)) {
        return 'FIRST_CLASS';
      }

      // Business class is typically in the front/middle rows (1-15) and center seats
      if (rowNum <= 15 && ['C', 'D', 'E', 'F', 'G', 'H'].includes(seatLetter)) {
        return 'BUSINESS';
      }

      // Economy is everything else
      return 'ECONOMY';
    }

    return 'ECONOMY';
  };

  // Add a simple wrapper around getSeatClassForFlight to provide a getSeatClass function
  const getSeatClass = (seatCode) => {
    if (!seatCode) return 'ECONOMY';

    // Use the detailed function if we have flight details
    if (flightDetails?.aircraft?.seatSections) {
      return getSeatClassForFlight(seatCode, flightDetails);
    }

    // Fallback to pattern matching
    const match = seatCode.match(/(\d+)([A-Z])/);
    if (match) {
      const rowNum = parseInt(match[1]);
      const seatLetter = match[2];

      // First class is typically in the front rows (1-5) and seats A, B, J, K
      if (rowNum <= 5 && ['A', 'B', 'J', 'K'].includes(seatLetter)) {
        return 'FIRST_CLASS';
      }

      // Business class is typically in the front/middle rows (1-15) and center seats
      if (rowNum <= 15 && ['C', 'D', 'E', 'F', 'G', 'H'].includes(seatLetter)) {
        return 'BUSINESS';
      }
    }

    // Default to economy
    return 'ECONOMY';
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

  // New voucher handlers for VoucherSelection component
  const handleVoucherApplied = (voucherData) => {
    setSelectedVoucher(voucherData);
    setVoucherDiscount(voucherData.discountAmount || 0);
    setVoucherCode(voucherData.code);
  };

  const handleVoucherRemoved = () => {
    setSelectedVoucher(null);
    setVoucherDiscount(0);
    setVoucherCode('');
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

    const dob = userProfile.dateOfBirth || '';
    const passengerType = determinePassengerType(dob);
    const requiresDoc = requiresIdentityDocument(dob);

    const updatedPassengers = [...passengers];
    updatedPassengers[0] = {
      ...updatedPassengers[0],
      firstName: userProfile.firstName || '',
      lastName: userProfile.lastName || '',
      dateOfBirth: dob,
      gender: userProfile.gender || 'MALE',
      nationality: userProfile.nationality || 'VN',
      idNumber: userProfile.idNumber || '',
      passportNumber: userProfile.passportNumber || '',
      countryOfIssue: userProfile.countryOfIssue || '',
      passportExpiryDate: userProfile.passportExpiryDate || '',
      passengerType: passengerType,
      requiresDocument: requiresDoc
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

  // Validation function for booking steps
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Seat Selection
        if (infantCount > adultCount) {
          toast.error('Error: The number of infants cannot exceed the number of adults.');
          return false;
        }

        if (!isSeatSelectionComplete) {
          const requiredSeats = adultCount + childCount;
          toast.error(`Please select ${requiredSeats} seat(s) for each flight segment to continue.`);
          return false;
        }
        return true;

      case 2: // Passenger Information
        for (let i = 0; i < passengers.length; i++) {
          const p = passengers[i];
          if (!p.firstName?.trim() || !p.lastName?.trim()) {
            toast.error(`Please enter a full name for Passenger ${i + 1}.`);
            return false;
          }
          if (!p.dateOfBirth) {
            toast.error(`Please enter a date of birth for Passenger ${i + 1}.`);
            return false;
          }
          const expectedType = determinePassengerType(p.dateOfBirth);
          if (p.passengerType !== expectedType) {
            toast.error(`Passenger ${i + 1}'s date of birth does not match the expected age for a ${p.passengerType.toLowerCase()}.`);
            return false;
          }
        }
        if (!contactInfo.email?.trim() || !contactInfo.phone?.trim()) {
          toast.error('Please provide complete contact information.');
          return false;
        }
        return true;

      case 3: // Baggage Add-ons (optional step, always valid)
        return true;

      case 4: // Payment
        return paymentMethod !== null;

      default:
        return true;
    }
  };

  // Baggage selection handler
  const handleBaggageChange = useCallback((newBaggageSelections) => {
    setBaggageSelections(newBaggageSelections);
  }, []);

  // Navigation handlers
  const handleNextStep = () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToNextFlight = () => {
    const nextFlightIndex = currentFlightTab + 1;
    if (nextFlightIndex < allFlightDetails.length) {
      setCurrentFlightTab(nextFlightIndex);
    }
  };

  // Enhanced booking submission with better seat availability checking
  const handleBookingSubmission = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setProcessing(true);
    setBookingProgress(10);

    try {
      // Step 1: Final seat availability check before booking
      setBookingProgress(20);

      let allSeatsAvailable = true;
      const unavailableSeatsDetails = [];

      if (hasConnectingFlights()) {
        // Process each flight separately for multi-flight bookings
        for (let flightIndex = 0; flightIndex < allFlightDetails.length; flightIndex++) {
          const flight = allFlightDetails[flightIndex];
          const seatsForThisFlight = selectedSeatsByFlight[flightIndex] || [];

          if (!seatsForThisFlight.length) continue;

          try {
            const seatAvailability = await checkSeatAvailability(flight.flightId, seatsForThisFlight);

            if (!seatAvailability.allRequestedSeatsAvailable) {
              allSeatsAvailable = false;
              const flightUnavailable = seatAvailability.unavailableSeats || seatsForThisFlight;
              unavailableSeatsDetails.push({
                flightIndex,
                flightNumber: flight.flightNumber || flight.flightCode,
                unavailableSeats: flightUnavailable
              });
            }
          } catch (error) {
            console.error(`[Booking] Failed to check seats for flight ${flightIndex + 1}:`, error);
            toast.error(`Unable to verify seat availability for Flight ${flightIndex + 1}. Please try again.`);
            setProcessing(false);
            return;
          }
        }
      } else {
        try {
          const seatAvailability = await checkSeatAvailability(flightDetails.flightId, selectedSeats);

          if (!seatAvailability.allRequestedSeatsAvailable) {
            allSeatsAvailable = false;
            unavailableSeatsDetails.push({
              flightIndex: 0,
              flightNumber: flightDetails.flightNumber || flightDetails.flightCode,
              unavailableSeats: seatAvailability.unavailableSeats || selectedSeats
            });
          }
        } catch (error) {
          console.error('[Booking] Failed to check seats for single flight:', error);
          toast.error('Unable to verify seat availability. Please try again.');
          setProcessing(false);
          return;
        }
      }

      // Handle unavailable seats
      if (!allSeatsAvailable) {
        const errorMessages = unavailableSeatsDetails.map(detail =>
          `Flight ${detail.flightNumber}: Seats ${detail.unavailableSeats.join(', ')} are no longer available`
        );

        toast.error(
          `Some seats are no longer available:\n${errorMessages.join('\n')}\n\nPlease select different seats and try again.`,
          { autoClose: 10000 }
        );

        // Navigate back to seat selection step
        setCurrentStep(1);
        setProcessing(false);
        return;
      }

      setBookingProgress(40);

      // Step 2: Prepare booking data
      const bookingData = prepareBookingDataForMultipleFlights();

      setBookingProgress(60);

      // Step 3: Submit booking
      const booking = await createBooking(bookingData);

      setBookingProgress(80);
      console.log('[BOOKING] Booking response received:', booking);
      console.log('[BOOKING] Full response object keys:', Object.keys(booking));
      console.log('[BOOKING] vnpayPaymentUrl value:', booking.vnpayPaymentUrl);
      console.log('[BOOKING] vnpayPaymentUrl type:', typeof booking.vnpayPaymentUrl);
      console.log('[BOOKING] Is vnpayPaymentUrl truthy?:', !!booking.vnpayPaymentUrl);

      // Step 4: Handle successful booking
      setBookingProgress(90);

      toast.success('Booking created successfully! Redirecting to payment...');
      setBookingProgress(100);

      // Check if we have a payment URL and redirect to payment
      if (booking.vnpayPaymentUrl && booking.vnpayPaymentUrl.trim() !== '') {
        console.log('[BOOKING] Redirecting to VNPay payment URL:', booking.vnpayPaymentUrl);
        // Redirect to VNPay payment page
        window.location.href = booking.vnpayPaymentUrl;
      } else {
        console.warn('[BOOKING] No payment URL received or URL is empty');
        console.warn('[BOOKING] booking.vnpayPaymentUrl:', JSON.stringify(booking.vnpayPaymentUrl));
        console.warn('[BOOKING] Full booking object:', JSON.stringify(booking, null, 2));
        console.warn('[BOOKING] Redirecting to booking details page');
        // Fallback: Navigate to booking details page
        navigate(`/booking-details/${booking.bookingReference}`, {
          state: { booking, flightDetails: getAllFlightDetailsForDisplay() }
        });
      }

    } catch (error) {
      console.error('[Booking] Booking submission error:', error);

      // Enhanced error handling
      if (error.message?.includes('seat') || error.message?.includes('availability')) {
        toast.error('Seat availability has changed. Please reselect your seats and try again.');
        setCurrentStep(1); // Go back to seat selection
      } else if (error.message?.includes('payment')) {
        toast.error('Payment processing failed. Your booking was not completed. Please try again.');
      } else if (error.message?.includes('timeout')) {
        toast.error('The booking process timed out. Please check your booking status and try again if needed.');
      } else {
        toast.error(error.message || 'Failed to create booking. Please try again.');
      }
    } finally {
      setProcessing(false);
      setBookingProgress(0);
    }
  };

  const getPriceAndClassForSeat = (seatCode, flight) => {
    // Return a default, safe value if essential data is missing.
    if (!seatCode || !flight?.aircraft?.seatSections || !flight?.availableFares) {
      const economyFare = flight?.availableFares?.find(f => f.name?.toUpperCase().includes('ECONOMY')) || { price: 0 };
      return { farePrice: economyFare.price, className: 'Economy', seatClass: 'ECONOMY' };
    }

    const sections = flight.aircraft.seatSections;
    let determinedSeatClass = 'ECONOMY'; // Default to Economy

    // Step 1: Correctly determine the seat's actual class from the aircraft layout data.
    // This loop finds which section (e.g., 'BUSINESS', 'FIRST_CLASS') the seatCode belongs to.
    for (const [className, seats] of Object.entries(sections)) {
      if (Array.isArray(seats) && seats.includes(seatCode)) {
        determinedSeatClass = className;
        break;
      }
    }

    // Step 2: Find the matching fare object in the availableFares array using the determined class.
    // This is more reliable because it matches the class type directly.
    const matchingFare = flight.availableFares.find(
      f => f.fareType === determinedSeatClass || f.name?.toUpperCase().includes(determinedSeatClass)
    );

    // Step 3: Determine the user-friendly display name for the summary.
    let displayClassName = 'Economy';
    if (determinedSeatClass === 'FIRST_CLASS') {
      displayClassName = 'First Class';
    } else if (determinedSeatClass === 'BUSINESS') {
      displayClassName = 'Business';
    }

    return {
      farePrice: matchingFare?.price || 0,
      className: displayClassName,
      seatClass: determinedSeatClass,
    };
  };

  const priceBreakdown = useMemo(() => {
    let subtotal = 0;
    const groupedSeats = {};

    allFlightDetails.forEach((flight, flightIndex) => {
      const seatsForThisFlight = selectedSeatsByFlight[flightIndex] || [];

      seatsForThisFlight.forEach(seat => {
        const { farePrice, className, seatClass } = getPriceAndClassForSeat(seat, flight);

        subtotal += farePrice;

        const key = allFlightDetails.length > 1 ? `Segment  ${flightIndex + 1} - ${className}` : className;
        if (!groupedSeats[key]) {
          groupedSeats[key] = { count: 0, totalPrice: 0, seats: [] };
        }
        groupedSeats[key].count++;
        groupedSeats[key].totalPrice += farePrice;
        groupedSeats[key].seats.push(seat);
      });
    });

    // Calculate baggage costs
    let baggageTotal = 0;
    Object.values(baggageSelections).forEach(passengerBaggage => {
      Object.values(passengerBaggage).forEach(baggage => {
        // Each baggage selection is for one item (no quantity field needed)
        baggageTotal += baggage.price || 0;
      });
    });

    const infantTotal = (infantCount > 0 && allFlightDetails.length > 0) ? (100000 * infantCount * allFlightDetails.length) : 0;
    const totalBeforeTaxes = subtotal + infantTotal + baggageTotal;
    
    // Calculate tax for display purposes (10%)
    const taxesAndFees = Math.round(totalBeforeTaxes * 0.1);
    const totalWithTaxes = totalBeforeTaxes + taxesAndFees;

    let discount = 0;
    if (selectedVoucher) {
      if (selectedVoucher.discountAmount !== undefined) {
        // Use the calculated discount from the voucher service
        discount = selectedVoucher.discountAmount;
      } else if (selectedVoucher.discountPercentage && totalWithTaxes >= (selectedVoucher.minimumPurchaseAmount || 0)) {
        // Fallback to legacy calculation
        discount = Math.min(
          totalWithTaxes * (selectedVoucher.discountPercentage / 100),
          selectedVoucher.maximumDiscountAmount || Infinity
        );
      }
    }

    const total = Math.max(0, totalWithTaxes - discount);

    return {
      subtotal,
      infantTotal,
      baggageTotal,
      totalBeforeTaxes,
      taxesAndFees,
      totalWithTaxes,
      discount,
      total,
      groupedSeats
    };
  }, [selectedSeatsByFlight, infantCount, allFlightDetails, selectedVoucher, baggageSelections, voucherDiscount]); 

  // HÀM TÍNH TỔNG TIỀN MỚI - THAY THẾ HÀM CŨ
  const calculateTotal = () => {
    return priceBreakdown.total;
  };

  const getAllFlightDetailsForDisplay = () => {
    return allFlightDetails.length > 0 ? allFlightDetails : [flightDetails].filter(Boolean);
  };

  // Helper function to check if this is a connecting flight booking
  const hasConnectingFlights = () => {
    return flightIds.length > 1;
  };

  // Helper function to format flight route for multi-segment flights
  const formatMultiFlightRoute = () => {
    if (allFlightDetails.length <= 1) return null;

    // Get all unique airports in the journey
    const airports = [];
    allFlightDetails.forEach(flight => {
      if (airports.length === 0) {
        airports.push(flight.departureAirport);
      }
      airports.push(flight.arrivalAirport);
    });

    return airports.join(' → ');
  };

  // Enhanced booking data preparation for multiple flights
  // Prepare baggage add-ons for booking submission
  const prepareBaggageAddons = () => {
    const baggageList = [];
    
    Object.values(baggageSelections).forEach(passengerBaggage => {
      Object.values(passengerBaggage).forEach(baggage => {
        // Each baggage selection represents one item (no quantity needed)
        baggageList.push({
          passengerIndex: baggage.passengerIndex,
          flightId: baggage.flightId, // Should be a string UUID or null
          weight: baggage.weight,
          type: baggage.type,
          price: baggage.price
        });
      });
    });
    
    return baggageList;
  };

  const prepareBookingDataForMultipleFlights = () => {
    const flightDetailsArray = getAllFlightDetailsForDisplay();

    // Build seat selections in the format backend expects
    let seatSelections = {};
    let seatPricingByFlight = [];

    // For multi-flight bookings, use the selectedSeatsByFlight mapping
    if (hasConnectingFlights()) {
      // Process each flight and its seats separately
      flightDetailsArray.forEach((flight, flightIndex) => {
        const seatsForThisFlight = selectedSeatsByFlight[flightIndex] || [];

        // Add seats for this flight to selections - using flightId as key (not index)
        if (seatsForThisFlight.length > 0) {
          // Ensure we're using the actual UUID string as the key, not the array index
          const flightUuid = flight.flightId.toString();
          seatSelections[flightUuid] = seatsForThisFlight;
          console.log(`[BOOKING] Mapping flight ${flightIndex} (UUID: ${flightUuid}) with ${seatsForThisFlight.length} seats`);
        }

        // Create pricing entries for each passenger on this flight
        const seatPricingsForThisFlight = [];

        // Ensure we have pricing data for each passenger
        for (let passengerIndex = 0; passengerIndex < passengers.length; passengerIndex++) {
          const seat = seatsForThisFlight[passengerIndex]; // Get seat for this passenger
          
          if (seat) {
            const { seatClass, farePrice } = getPriceAndClassForSeat(seat, flight);

            const matchingFare = flight.availableFares.find(
              f => f.fareType === seatClass || f.name?.toUpperCase().includes(seatClass)
            );

            seatPricingsForThisFlight.push({
              flightId: flight.flightId,
              seatCode: seat,
              seatClass,
              farePrice,
              fareId: matchingFare?.id
            });
          } else {
            // No seat selected for this passenger (e.g., infant) - still need pricing entry
            seatPricingsForThisFlight.push({
              flightId: flight.flightId,
              seatCode: null,
              seatClass: 'ECONOMY',
              farePrice: 0, // Infants typically don't pay for seats
              fareId: null
            });
          }
        }

        if (seatPricingsForThisFlight.length > 0) {
          seatPricingByFlight.push(seatPricingsForThisFlight);
        }
      });
    } else {
      // Single flight - simpler structure
      if (selectedSeats.length > 0) {
        seatSelections[flightDetails.flightId] = selectedSeats;
      }

      // Create pricing entries for each passenger
      const seatPricingsForSingleFlight = [];
      
      for (let passengerIndex = 0; passengerIndex < passengers.length; passengerIndex++) {
        const seat = selectedSeats[passengerIndex]; // Get seat for this passenger
        
        if (seat) {
          const { seatClass, farePrice } = getPriceAndClassForSeat(seat, flightDetails);

          const matchingFare = flightDetails.availableFares.find(
            f => f.fareType === seatClass || f.name?.toUpperCase().includes(seatClass)
          );

          seatPricingsForSingleFlight.push({
            flightId: flightDetails.flightId,
            seatCode: seat,
            seatClass,
            farePrice,
            fareId: matchingFare?.id
          });
        } else {
          // No seat selected for this passenger (e.g., infant) - still need pricing entry
          seatPricingsForSingleFlight.push({
            flightId: flightDetails.flightId,
            seatCode: null,
            seatClass: 'ECONOMY',
            farePrice: 0, // Infants typically don't pay for seats
            fareId: null
          });
        }
      }
      
      if (seatPricingsForSingleFlight.length > 0) {
        seatPricingByFlight.push(seatPricingsForSingleFlight);
      }
    }

    // Prepare passenger data correctly based on seat assignments per flight
    const passengerData = passengers.map((p, index) => {
      // For multi-flight, we need to create an object with specific seat assignments per flight
      if (hasConnectingFlights()) {
        // Create mapping of seats by flight for this passenger
        const seatsByFlight = {};

        // Assign seats for each flight to this passenger (if available)
        flightDetailsArray.forEach((flight, flightIndex) => {
          const seatsForThisFlight = selectedSeatsByFlight[flightIndex] || [];

          // Assign a seat to this passenger if one exists at their index
          if (index < seatsForThisFlight.length) {
            const seatForPassenger = seatsForThisFlight[index];
            if (seatForPassenger) {
              seatsByFlight[flight.flightId] = {
                seatCode: seatForPassenger,
                fareClass: getSeatClassForFlight(seatForPassenger, flight)
              };
            }
          }
        });

        return {
          ...p,
          seatsByFlight,
          passengerType: p.passengerType,
          // Add contact info to the first passenger
          ...(index === 0 && {
            email: contactInfo.email,
            phone: contactInfo.phone
          })
        };
      } else {
        // Single flight - simpler format
        return {
          ...p,
          seatNumber: selectedSeats[index] || null,
          passengerType: p.passengerType,
          fareClass: selectedSeats[index] ? getSeatClass(selectedSeats[index]) : 'ECONOMY',
          // Add contact info to the first passenger
          ...(index === 0 && {
            email: contactInfo.email,
            phone: contactInfo.phone
          })
        };
      }
    });

    // Determine the primary fare class for the booking (for backend validation)
    let selectedFareName = 'ECONOMY'; // Default

    if (hasConnectingFlights()) {
      // For multi-segment, find the highest fare class across all selected seats
      const allSeatClasses = [];
      flightDetailsArray.forEach((flight, flightIndex) => {
        const seatsForThisFlight = selectedSeatsByFlight[flightIndex] || [];
        seatsForThisFlight.forEach(seat => {
          const { seatClass } = getPriceAndClassForSeat(seat, flight);
          allSeatClasses.push(seatClass);
        });
      });

      // Determine the highest fare class
      if (allSeatClasses.includes('FIRST') || allSeatClasses.includes('FIRST_CLASS')) {
        selectedFareName = 'FIRST_CLASS';
      } else if (allSeatClasses.includes('BUSINESS') || allSeatClasses.includes('BUSINESS_CLASS')) {
        selectedFareName = 'BUSINESS_CLASS';
      } else {
        selectedFareName = 'ECONOMY';
      }
    } else {
      // For single segment, determine from selected seats
      if (selectedSeats.length > 0) {
        const { seatClass } = getPriceAndClassForSeat(selectedSeats[0], flightDetails);
        if (seatClass === 'FIRST' || seatClass === 'FIRST_CLASS') {
          selectedFareName = 'FIRST_CLASS';
        } else if (seatClass === 'BUSINESS' || seatClass === 'BUSINESS_CLASS') {
          selectedFareName = 'BUSINESS_CLASS';
        } else {
          selectedFareName = 'ECONOMY';
        }
      }
    }

    // Log seat selection data for debugging
    console.log('[BOOKING] Prepared seat selections:', seatSelections);
    
    // If we have connecting flights, ensure all seat data is properly formatted
    if (hasConnectingFlights()) {
      console.log('[BOOKING] Multi-segment booking with seat selections:', Object.keys(seatSelections).length);
      // Validate that we have the correct flight IDs as keys and seat arrays as values
      Object.entries(seatSelections).forEach(([flightId, seats]) => {
        console.log(`[BOOKING] Flight ${flightId} has ${seats?.length || 0} seat codes:`, seats);
      });
    } else {
      console.log('[BOOKING] Single-segment booking with seat selections:', 
        flightIds[0], selectedSeats.length > 0 ? selectedSeats : 'NO SEATS');
    }
    
    // Prepare standard seat selections structure for backend compatibility
    let seatSelectionsArray = [];
    if (hasConnectingFlights()) {
      // For multi-segment, convert the seat selections to the formal DTO structure if needed
      Object.entries(seatSelections).forEach(([flightId, seats]) => {
        if (seats && Array.isArray(seats)) {
          seats.forEach((seat, passengerIndex) => {
            if (seat) {
              seatSelectionsArray.push({
                seatCode: seat,
                passengerIndex,
                selectedFareName: selectedFareName
              });
            }
          });
        }
      });
    } else {
      // For single segment
      selectedSeats.forEach((seat, passengerIndex) => {
        if (seat) {
          seatSelectionsArray.push({
            seatCode: seat,
            passengerIndex,
            selectedFareName: selectedFareName
          });
        }
      });
    }
    
    console.log('[BOOKING] Prepared seat selections array:', seatSelectionsArray);
    
    const bookingDataToSend = {
      flightIds: flightIds,
      // For single-segment bookings, also include flightId for backend compatibility
      ...(flightIds.length === 1 && { flightId: flightIds[0] }),
      passengers: passengerData,
      // Include both formats to ensure backend compatibility
      selectedSeatsByFlight: seatSelections, // Map of flightId to seat codes array
      seatSelections: seatSelectionsArray, // Array of SeatSelectionDTO compatible objects
      selectedFareName: selectedFareName,
      paymentMethod,
      voucherCode: selectedVoucher?.code || null,
      voucherDiscount: selectedVoucher ? priceBreakdown.discount : 0,
      totalAmount: priceBreakdown.total, // Send final total including taxes and discounts
      seatPricingByFlight,
      passengerBreakdown: {
        adults: adultCount,
        children: childCount,
        infants: infantCount
      },
      isConnectingFlight: hasConnectingFlights(),
      // Change booking type to match backend enum
      bookingType: hasConnectingFlights() ? 'MULTI_SEGMENT' : 'STANDARD',
      flightSegments: allFlightDetails.map(flight => ({
        flightId: flight.flightId,
        flightNumber: flight.flightNumber || flight.flightCode,
        origin: flight.departureAirport || flight.originAirport?.code,
        destination: flight.arrivalAirport || flight.destinationAirport?.code,
        departureTime: flight.departureDateTime || flight.departureTime,
        arrivalTime: flight.arrivalDateTime || flight.estimatedArrivalTime
      })),
      priceBreakdown: priceBreakdown,
      baggageAddons: prepareBaggageAddons()
    };

    return bookingDataToSend;
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

  // Quick summary component for all steps
  const renderQuickSummary = () => (
    <div className={styles.quickSummary}>
      {(Object.values(selectedSeatsByFlight).flat().length > 0 || selectedSeats.length > 0) && (
        <div className={styles.summaryItem}>
          <span>Seats:</span>
          <span>
            {hasConnectingFlights()
              ? Object.entries(selectedSeatsByFlight)
                .filter(([flightIndex, seats]) => seats.length > 0)
                .map(([flightIndex, seats]) => {
                  return `Flight ${parseInt(flightIndex) + 1}: ${seats.join(', ')}`;
                })
                .join(' | ')
              : selectedSeats.join(', ')
            }
          </span>
        </div>
      )}
    </div>
  );

  // Enhanced seat selection for multi-flight support
  const renderSeatSelection = () => {
    const flightDetailsArray = getAllFlightDetailsForDisplay();
    const isMultiFlight = flightDetailsArray.length > 1;

    if (isMultiFlight) {
      // Multi-flight tab-based seat selection
      return (
        <div className={styles.stepContent}>
          <div className={styles.seatSelection}>
            <h3>Select Your Seats</h3>
            <p className={styles.seatInfo}>
              Choose {adultCount + childCount} seat{adultCount + childCount > 1 ? 's' : ''} for each flight.
              {infantCount > 0 && ` (Infants don't require seats)`}
            </p>

            {/* Flight Tabs */}
            <div className={styles.flightTabs}>
              {flightDetailsArray.map((flight, index) => (
                <button
                  key={flight.flightId || index}
                  className={`${styles.flightTab} ${currentFlightTab === index ? styles.active : ''}`}
                  onClick={() => setCurrentFlightTab(index)}
                >
                  <div className={styles.tabHeader}>
                    <Plane size={16} />
                    <span>Flight {index + 1}</span>
                  </div>
                  <div className={styles.tabRoute}>
                    {flight.originAirport?.code || flight.departureAirport} → {flight.destinationAirport?.code || flight.arrivalAirport}
                  </div>
                  <div className={styles.tabFlightCode}>
                    {flight.flightCode || flight.flightNumber}
                  </div>
                  {selectedSeatsByFlight[index] && selectedSeatsByFlight[index].length > 0 && (
                    <div className={styles.tabSeatsSelected}>
                      {selectedSeatsByFlight[index].length} seat{selectedSeatsByFlight[index].length > 1 ? 's' : ''} selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Current Flight Seat Selection */}
            <div className={styles.tabContent}>

              <div className={styles.seatPriceContainer}>
                <div className={styles.seatPriceHeader}>
                  <Plane size={18} />
                  <span>Seat Prices</span>
                </div>
                <div className={styles.seatPriceGrid}>
                  {/* Get the correct fares for the current flight */}
                  {(() => {
                    // Get the fares for the current flight tab
                    const currentFlight = flightDetailsArray[currentFlightTab];
                    const currentFlightFares = currentFlight?.availableFares || availableFares;

                    const economyFare = currentFlightFares.find(f =>
                      f.name?.toUpperCase().includes('ECONOMY') || f.fareType === 'ECONOMY'
                    );

                    const businessFare = currentFlightFares.find(f =>
                      f.name?.toUpperCase().includes('BUSINESS') || f.fareType === 'BUSINESS'
                    );

                    const firstClassFare = currentFlightFares.find(f =>
                      f.name?.toUpperCase().includes('FIRST') || f.fareType === 'FIRST_CLASS'
                    );

                    return (
                      <>
                        {/* Only show Economy card if fare exists and has a price */}
                        {economyFare && economyFare.price > 0 && (
                          <div className={styles.seatPriceCard}>
                            <div className={styles.seatClassLabel}>
                              <div className={styles.seatClassIcon} data-class="economy"></div>
                              <span>Economy</span>
                            </div>
                            <div className={styles.seatPrice}>{formatVND(economyFare.price)}</div>
                            <div className={styles.seatFeatures}>
                              <div className={styles.seatFeatureItem}>
                                <CheckCircle size={14} />
                                <span>Standard legroom</span>
                              </div>
                              <div className={styles.seatFeatureItem}>
                                <CheckCircle size={14} />
                                <span>Complimentary snacks</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Only show Business card if fare exists and has a price */}
                        {businessFare && businessFare.price > 0 && (
                          <div className={styles.seatPriceCard}>
                            <div className={styles.seatClassLabel}>
                              <div className={styles.seatClassIcon} data-class="business"></div>
                              <span>Business</span>
                            </div>
                            <div className={styles.seatPrice}>{formatVND(businessFare.price)}</div>
                            <div className={styles.seatFeatures}>
                              <div className={styles.seatFeatureItem}>
                                <CheckCircle size={14} />
                                <span>Extra legroom</span>
                              </div>
                              <div className={styles.seatFeatureItem}>
                                <CheckCircle size={14} />
                                <span>Premium meals</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Only show First Class card if fare exists and has a price */}
                        {firstClassFare && firstClassFare.price > 0 && (
                          <div className={styles.seatPriceCard}>
                            <div className={styles.seatClassLabel}>
                              <div className={styles.seatClassIcon} data-class="first"></div>
                              <span>First Class</span>
                            </div>
                            <div className={styles.seatPrice}>{formatVND(firstClassFare.price)}</div>
                            <div className={styles.seatFeatures}>
                              <div className={styles.seatFeatureItem}>
                                <CheckCircle size={14} />
                                <span>Lie-flat seats</span>
                              </div>
                              <div className={styles.seatFeatureItem}>
                                <CheckCircle size={14} />
                                <span>Private suite</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>


                <p className={styles.seatSelectionNote}>
                  <Info size={16} />
                  <span>Select seats for this flight segment. Your fare will be calculated based on the seat class you choose.</span>
                </p>
              </div>
              <div className={styles.flightNavigation}>
                {(selectedSeatsByFlight[currentFlightTab] || []).length >= (adultCount + childCount) && currentFlightTab < flightDetailsArray.length - 1 && (
                  <button onClick={handleGoToNextFlight} className={styles.continueButton}>
                    Select Seats for Next Flight <ArrowRight size={18} />
                  </button>
                )}
              </div>

              {flightDetailsArray[currentFlightTab] && (
                <SeatMap
                  flightId={flightDetailsArray[currentFlightTab].flightId}
                  aircraftId={flightDetailsArray[currentFlightTab].aircraft?.id || 'default-aircraft'}
                  passengerCount={adultCount + childCount}
                  selectedSeats={selectedSeatsByFlight[currentFlightTab] || []}
                  onSeatSelect={(seats) => handleMultiFlightSeatSelect(currentFlightTab, seats)}
                  selectedFareClass="all"
                  disabled={false}
                  allowFlexibleSelection={true}
                  enableRealTimeUpdates={true}
                  flightDetails={{
                    ...flightDetailsArray[currentFlightTab],
                    availableFares: flightDetailsArray[currentFlightTab].availableFares || availableFares
                  }}
                />
              )}

              {selectedSeatsByFlight[currentFlightTab] && selectedSeatsByFlight[currentFlightTab].length > 0 && (
                <div className={styles.selectedSeats}>
                  <h4>Selected Seats for Flight {currentFlightTab + 1}:</h4>
                  <div className={styles.seatTags}>
                    {selectedSeatsByFlight[currentFlightTab].map((seat, index) => (
                      <span key={seat} className={styles.seatTag}>{seat}</span>
                    ))}
                  </div>
                  {selectedSeatsByFlight[currentFlightTab].length < adultCount + childCount && (
                    <p className={styles.seatsRemaining}>
                      Please select {adultCount + childCount - selectedSeatsByFlight[currentFlightTab].length} more seat{adultCount + childCount - selectedSeatsByFlight[currentFlightTab].length > 1 ? 's' : ''} for this flight
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Overall Progress Summary */}
            <div className={styles.multiFlightProgress}>
              <h4>Seat Selection Progress</h4>
              <div className={styles.progressGrid}>
                {flightDetailsArray.map((flight, index) => {
                  const flightSeats = selectedSeatsByFlight[index] || [];
                  const requiredSeats = adultCount + childCount;
                  const isComplete = flightSeats.length >= requiredSeats;

                  return (
                    <div key={flight.flightId || index} className={`${styles.progressItem} ${isComplete ? styles.complete : ''}`}>
                      <div className={styles.progressHeader}>
                        <span className={styles.flightNumber}>Flight {index + 1}</span>
                        {isComplete && <CheckCircle size={16} className={styles.completeIcon} />}
                      </div>
                      <div className={styles.progressRoute}>
                        {flight.originAirport?.code || flight.departureAirport} → {flight.destinationAirport?.code || flight.arrivalAirport}
                      </div>
                      <div className={styles.progressSeats}>
                        {flightSeats.length}/{requiredSeats} seats selected
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Single flight seat selection (existing logic)
      return (
        <div className={styles.stepContent}>
          <div className={styles.seatSelection}>
            <h3>Select Your Seats</h3>
            <p className={styles.seatInfo}>
              Choose {adultCount + childCount} seat{adultCount + childCount > 1 ? 's' : ''} for your flight.
              {infantCount > 0 && ` (Infants don't require seats)`}
            </p>

            <div className={styles.seatPriceContainer}>
              <div className={styles.seatPriceHeader}>
                <Plane size={18} />
                <span>Seat Prices</span>
              </div>
              <div className={styles.seatPriceGrid}>
                {/* Using available fares from flight details */}
                {(() => {
                  const economyFare = availableFares.find(f =>
                    f.name?.toUpperCase().includes('ECONOMY') ||
                    f.fareType === 'ECONOMY'
                  );

                  const businessFare = availableFares.find(f =>
                    f.name?.toUpperCase().includes('BUSINESS') ||
                    f.fareType === 'BUSINESS'
                  );

                  const firstClassFare = availableFares.find(f =>
                    f.name?.toUpperCase().includes('FIRST') ||
                    f.fareType === 'FIRST_CLASS'
                  );

                  return (
                    <>
                      {/* Only show Economy card if fare exists and has a price */}
                      {economyFare && economyFare.price > 0 && (
                        <div className={styles.seatPriceCard}>
                          <div className={styles.seatClassLabel}>
                            <div className={styles.seatClassIcon} data-class="economy"></div>
                            <span>Economy</span>
                          </div>
                          <div className={styles.seatPrice}>{formatVND(economyFare.price)}</div>
                          <div className={styles.seatFeatures}>
                            <div className={styles.seatFeatureItem}>
                              <CheckCircle size={14} />
                              <span>Standard legroom</span>
                            </div>
                            <div className={styles.seatFeatureItem}>
                              <CheckCircle size={14} />
                              <span>Complimentary snacks</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Only show Business card if fare exists and has a price */}
                      {businessFare && businessFare.price > 0 && (
                        <div className={styles.seatPriceCard}>
                          <div className={styles.seatClassLabel}>
                            <div className={styles.seatClassIcon} data-class="business"></div>
                            <span>Business</span>
                          </div>
                          <div className={styles.seatPrice}>{formatVND(businessFare.price)}</div>
                          <div className={styles.seatFeatures}>
                            <div className={styles.seatFeatureItem}>
                              <CheckCircle size={14} />
                              <span>Extra legroom</span>
                            </div>
                            <div className={styles.seatFeatureItem}>
                              <CheckCircle size={14} />
                              <span>Premium meals</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Only show First Class card if fare exists and has a price */}
                      {firstClassFare && firstClassFare.price > 0 && (
                        <div className={styles.seatPriceCard}>
                          <div className={styles.seatClassLabel}>
                            <div className={styles.seatClassIcon} data-class="first"></div>
                            <span>First Class</span>
                          </div>
                          <div className={styles.seatPrice}>{formatVND(firstClassFare.price)}</div>
                          <div className={styles.seatFeatures}>
                            <div className={styles.seatFeatureItem}>
                              <CheckCircle size={14} />
                              <span>Lie-flat seats</span>
                            </div>
                            <div className={styles.seatFeatureItem}>
                              <CheckCircle size={14} />
                              <span>Private suite</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <p className={styles.seatSelectionNote}>
                <Info size={16} />
                <span>Select seats for this flight. Your fare will be calculated based on the seat class you choose.</span>
              </p>
            </div>

            {flightDetails && (
              <SeatMap
                flightId={flightDetails.flightId}
                aircraftId={flightDetails.aircraft?.id || 'default-aircraft'}
                passengerCount={adultCount + childCount}
                selectedSeats={selectedSeats}
                onSeatSelect={handleSeatSelect}
                selectedFareClass="all"
                disabled={false}
                allowFlexibleSelection={true}
                enableRealTimeUpdates={true}
                flightDetails={{
                  ...flightDetails,
                  availableFares: flightDetails.availableFares || availableFares
                }}
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
                {selectedSeats.length < adultCount + childCount && (
                  <p className={styles.seatsRemaining}>
                    Please select {adultCount + childCount - selectedSeats.length} more seat{adultCount + childCount - selectedSeats.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  // Step 4: Passenger Information
  const renderPassengerInfo = () => (
    <div className={styles.stepContent}>
      <div className={styles.passengerInfoContainer}>
        <div className={styles.passengerInfoHeader}>
          <div className={styles.passengerInfoTitle}>
            <Users size={24} />
            <span>Passenger Information</span>
          </div>
          <div className={styles.passengerCount}>
            {adultCount > 0 && <span className={styles.passengerTypeBadge} data-type="adult">{adultCount} Adult{adultCount > 1 ? 's' : ''}</span>}
            {childCount > 0 && <span className={styles.passengerTypeBadge} data-type="child">{childCount} Child{childCount > 1 ? 'ren' : ''}</span>}
            {infantCount > 0 && <span className={styles.passengerTypeBadge} data-type="infant">{infantCount} Infant{infantCount > 1 ? 's' : ''}</span>}
          </div>
        </div>

        <div className={styles.importantNotice}>
          <AlertCircle size={18} />
          <div>
            <strong>Important:</strong> Names must match 100% with identification documents. Incorrect information may result in denied boarding.
          </div>
        </div>

        {userProfile && !hasUsedAutoFill && (
          <div className={styles.autoFillHint}>
            <UserCheck size={16} />
            <span>You can use "Use My Info" button for the first passenger to quickly fill your details</span>
          </div>
        )}

        {passengers.map((passenger, index) => (
          <div key={index} className={styles.passengerForm}>
            <div className={styles.passengerHeader}>
              <div className={styles.passengerHeaderInfo}>
                <h4>
                  <User size={20} />
                  Passenger {index + 1}
                </h4>
                <div className={styles.passengerTypeBadge} data-type={passenger.passengerType.toLowerCase()}>
                  {passenger.passengerType === 'ADULT' ? 'Adult (12+ years)' :
                    passenger.passengerType === 'CHILD' ? 'Child (2-11 years)' :
                      'Infant (Under 2 years)'}
                </div>
              </div>

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
              {/* Title - Only for Adults and Children, not Infants */}
              {passenger.passengerType !== 'INFANT' && (
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
              )}

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
                  max={new Date().toISOString().split('T')[0]} // Prevent future dates
                />
                {passenger.dateOfBirth && (
                  <div className={styles.ageInfo}>
                    <Info size={14} />
                    <span>
                      Age: {getAgeFromDateOfBirth(passenger.dateOfBirth)} years old
                      {(() => {
                        const actualType = determinePassengerType(passenger.dateOfBirth);
                        if (actualType !== passenger.passengerType) {
                          return (
                            <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '8px' }}>
                              (Expected: {actualType})
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </span>
                  </div>
                )}
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
                  <option value="OTHER">Other</option>
                               </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Nationality *</label>
                <select
                  value={passenger.nationality}
                  onChange={(e) => handlePassengerChange(index, 'nationality', e.target.value)}
                  className={styles.select}
                >
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ID Number - Only required and shown for adults and children 14+ */}
              {passenger.requiresDocument && (
                <div className={styles.inputGroup}>
                  <label>ID Number</label>
                  <input
                    type="text"
                    value={passenger.idNumber}
                    onChange={(e) => handlePassengerChange(index, 'idNumber', e.target.value)}
                    className={styles.input}
                    placeholder="Enter ID number (if applicable)"
                  />
                </div>
              )}

              {/* Document notification for passengers under 14 */}
              {!passenger.requiresDocument && (
                <div className={styles.documentNotice}>
                  <AlertCircle size={16} />
                  <p>
                    {passenger.passengerType === 'INFANT' ?
                      'Infants must have a birth certificate or passport at check-in' :
                      'Children under 14 must have a birth certificate or passport at check-in'}
                  </p>
                </div>
              )}

              {/* Passport Number - Only for Adults and Children, not required for Infants */}
              {passenger.passengerType !== 'INFANT' && (
                <div className={styles.inputGroup}>
                  <label>Passport Number</label>
                  <input
                    type="text"
                    value={passenger.passportNumber}
                    onChange={(e) => handlePassengerChange(index, 'passportNumber', e.target.value)}
                    className={styles.input}
                    placeholder="Enter passport number"
                  />
                </div>
              )}
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

  // Step 3: Baggage Selection
  const renderBaggageSelection = () => (
    <div className={styles.stepContent}>
      <BaggageSelection
        passengers={passengers}
        flightDetails={hasConnectingFlights() ? allFlightDetails : flightDetails}
        isMultiSegment={hasConnectingFlights()}
        onBaggageChange={handleBaggageChange}
        initialBaggageSelections={baggageSelections}
      />
    </div>
  );

  // Step 4: Payment
  const renderPayment = () => (
    <div className={styles.stepContent}>
      <div className={styles.paymentContainer}>
        <div className={styles.paymentHeader}>
          <CreditCard size={24} />
          <span>Payment Information</span>
        </div>

        {/* === VOUCHER SECTION === */}
        <div className={styles.paymentSection}>
          <VoucherSelection
            userId={user?.id}
            bookingAmount={priceBreakdown.totalWithTaxes}
            onVoucherApplied={handleVoucherApplied}
            onVoucherRemoved={handleVoucherRemoved}
            selectedVoucher={selectedVoucher}
            disabled={false}
          />
        </div>

        {/* === PAYMENT METHOD SECTION === */}
        <div className={styles.paymentSection}>
          <div className={styles.paymentSectionHeader}>
            <CreditCard size={20} />
            <span>Payment Method</span>
          </div>
          <div className={styles.paymentSectionContent}>
            <div className={styles.paymentMethods}>
              <label htmlFor="vnpay" className={`${styles.paymentMethodOption} ${styles.active}`}>
                <input
                  type="radio"
                  id="vnpay"
                  name="paymentMethod"
                  value="VNPAY_BANKTRANSFER"
                  checked={true}
                  readOnly
                />
                <div className={styles.paymentMethodDetails}>
                  <span className={styles.paymentMethodName}>VNPay Bank Transfer</span>
                  <p className={styles.paymentNote}>
                    You will be redirected to complete payment after booking confirmation.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* === BOOKING SUMMARY SECTION === */}
        <div className={styles.paymentSection}>
          <div className={styles.paymentSectionHeader}>
            <CheckCircle size={20} />
            <span>Booking Summary</span>
          </div>
          <div className={styles.paymentSectionContent}>
            <div className={styles.orderDetail}>
              <div className={styles.orderDetailLabel}>Base Fare (Seats + Infants)</div>
              <div className={styles.orderDetailValue}>{formatVND(priceBreakdown.subtotal + priceBreakdown.infantTotal)}</div>
            </div>
            {priceBreakdown.baggageTotal > 0 && (
              <div className={styles.orderDetail}>
                <div className={styles.orderDetailLabel}>Baggage Add-ons</div>
                <div className={styles.orderDetailValue}>{formatVND(priceBreakdown.baggageTotal)}</div>
              </div>
            )}
            {selectedVoucher && priceBreakdown.discount > 0 && (
              <div className={`${styles.orderDetail} ${styles.discount}`}>
                <div className={styles.orderDetailLabel}>Voucher Discount</div>
                <div className={styles.orderDetailValue}>-{formatVND(priceBreakdown.discount)}</div>
              </div>
            )}
            <div className={styles.orderDetail}>
              <div className={styles.orderDetailLabel}>Taxes & Fees (10%)</div>
              <div className={styles.orderDetailValue}>{formatVND(priceBreakdown.taxesAndFees)}</div>
            </div>
            <div className={styles.orderTotal}>
              <div className={styles.orderTotalLabel}>Total</div>
              <div className={styles.orderTotalValue}>{formatVND(priceBreakdown.total)}</div>
            </div>
          </div>
        </div>

        <div className={styles.securityBadge}>
          <Shield size={16} />
          <span>All payments are secure and encrypted.</span>
        </div>
      </div>
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderSeatSelection();
      case 2:
        return renderPassengerInfo();
      case 3:
        return renderBaggageSelection();
      case 4:
        return renderPayment();
      default:
        return renderSeatSelection();
    }
  };

  return (
    <div className={styles.bookingPage}>
      {/* Progress Bar */}
      {processing && bookingProgress > 0 && (
        <div className={styles.bookingProgressBar}>
          <div
            className={styles.bookingProgressFill}
            style={{ width: `${bookingProgress}%` }}
          ></div>
        </div>
      )}

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
              {allFlightDetails.length > 1 ? (
                `${allFlightDetails.length} flights • ${allFlightDetails[0].originAirport.city} to ${allFlightDetails[allFlightDetails.length - 1].destinationAirport.city}`
              ) : (

                `Flight ${flightDetails.flightCode} • ${flightDetails.originAirport.city} to ${flightDetails.destinationAirport.city}`
              )}
            </p>
          </div>
        </div>

        {/* Enhanced Flight Summary */}
        <div className={styles.flightSummary}>
          <div className={styles.flightSummaryHeader}>
            <div className={styles.journeyBadge}>
              {hasConnectingFlights() ? (
                <>
                  <Plane size={20} />
                  Your Journey - {flightIds.length} Flights
                </>
              ) : (
                <>
                  <Plane size={20} />
                  Your Flight
                </>
              )}
            </div>
            {flightDetails && (
              <div className={styles.flightDate}>
                <Calendar size={16} />
                {formatDate(flightDetails.departureTime)}
              </div>
            )}
          </div>

          {hasConnectingFlights() ? (
            // Multi-flight journey display
            <div className={styles.multiFlightJourney}>
              {allFlightDetails.map((flight, index) => (
                <React.Fragment key={flight.flightId || index}>
                  <div className={styles.flightSegment}>
                    <div className={styles.segmentHeader}>
                      <span className={styles.segmentNumber}>Flight {index + 1}</span>
                      <span className={styles.flightCode}>{flight.flightCode || flight.flightNumber}</span>
                    </div>

                    <div className={styles.flightRoute}>
                      <div className={styles.routePoint}>
                        <div className={styles.routeTime}>{formatTime(flight.departureTime)}</div>
                        <div className={styles.routeLocation}>
                          <div className={styles.airportCode}>{flight.originAirport?.code || flight.departureAirport}</div>
                          <div className={styles.cityName}>{flight.originAirport?.city || 'Departure'}</div>
                        </div>
                      </div>

                      <div className={styles.routeConnector}>
                        <div className={styles.routeLine}></div>
                        <div className={styles.routePlane}>
                          <Plane size={18} />
                        </div>
                        <div className={styles.routeDuration}>
                          {formatFlightDuration(flight.flightDurationMinutes) ||
                            calculateDuration(flight.departureTime, flight.estimatedArrivalTime)}
                        </div>
                      </div>

                      <div className={styles.routePoint}>
                        <div className={styles.routeTime}>{formatTime(flight.estimatedArrivalTime)}</div>
                        <div className={styles.routeLocation}>
                          <div className={styles.airportCode}>{flight.destinationAirport?.code || flight.arrivalAirport}</div>
                          <div className={styles.cityName}>{flight.destinationAirport?.city || 'Arrival'}</div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.flightMeta}>
                      <div className={styles.metaItem}>
                        <Clock size={16} />
                        <span>Duration: {formatFlightDuration(flight.flightDurationMinutes) ||
                          calculateDuration(flight.departureTime, flight.estimatedArrivalTime)}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <Users size={16} />
                        <span>Aircraft: {flight.aircraft?.model || 'Boeing 737'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Connection info between segments */}
                  {index < allFlightDetails.length - 1 && (
                    <div className={styles.connectionInfo}>
                      <div className={styles.connectionIcon}>
                        <ArrowRight size={20} />
                      </div>
                      <div className={styles.connectionDetails}>
                        <span className={styles.connectionText}>Connection at {flight.destinationAirport?.code || flight.arrivalAirport}</span>
                        <span className={styles.connectionTime}>
                          {(() => {
                            const nextFlight = allFlightDetails[index + 1];
                            const arrivalTime = new Date(flight.estimatedArrivalTime);
                            const nextDepartureTime = new Date(nextFlight.departureTime);
                            const layoverMinutes = Math.floor((nextDepartureTime - arrivalTime) / (1000 * 60));
                            const hours = Math.floor(layoverMinutes / 60);
                            const minutes = layoverMinutes % 60;
                            return `${hours}h ${minutes}m layover`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {/* Total journey summary */}
              <div className={styles.journeyTotalSummary}>
                <div className={styles.totalJourneyTime}>
                  <Clock size={18} />
                  <span className={styles.totalLabel}>Total Journey Time:</span>
                  <span className={styles.totalTime}>
                    {(() => {
                      const firstFlight = allFlightDetails[0];
                      const lastFlight = allFlightDetails[allFlightDetails.length - 1];
                      return calculateDuration(firstFlight.departureTime, lastFlight.estimatedArrivalTime);
                    })()}
                  </span>
                </div>
                <div className={styles.connectionsSummary}>
                  <MapPin size={16} />
                  <span>{allFlightDetails.length - 1} Connection{allFlightDetails.length > 2 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          ) : (
            // Single flight display
            <div className={styles.singleFlightJourney}>
              <div className={styles.flightNumber}>
                <Plane size={20} />
                {flightDetails?.flightNumber || flightDetails?.flightCode}
              </div>

              <div className={styles.flightRoute}>
                <div className={styles.routePoint}>
                  <div className={styles.routeTime}>{formatTime(flightDetails?.departureTime)}</div>
                  <div className={styles.routeLocation}>
                    <div className={styles.airportCode}>{flightDetails?.originAirport?.code || flightDetails?.departureAirport}</div>
                    <div className={styles.cityName}>{flightDetails?.originAirport?.city || 'Departure'}</div>
                  </div>
                </div>

                <div className={styles.routeConnector}>
                  <div className={styles.routeLine}></div>
                  <div className={styles.routePlane}>
                    <Plane size={20} />
                  </div>
                  <div className={styles.routeDuration}>
                    {formatFlightDuration(flightDetails?.flightDurationMinutes) ||
                      calculateDuration(flightDetails?.departureTime, flightDetails?.estimatedArrivalTime)}
                  </div>
                </div>

                <div className={styles.routePoint}>
                  <div className={styles.routeTime}>{formatTime(flightDetails?.estimatedArrivalTime)}</div>
                  <div className={styles.routeLocation}>
                    <div className={styles.airportCode}>{flightDetails?.destinationAirport?.code || flightDetails?.arrivalAirport}</div>
                    <div className={styles.cityName}>{flightDetails?.destinationAirport?.city || 'Arrival'}</div>
                  </div>
                </div>
              </div>

              <div className={styles.flightMeta}>
                <div className={styles.metaItem}>
                  <Clock size={16} />
                  <span>Duration: {formatFlightDuration(flightDetails?.flightDurationMinutes) ||
                    calculateDuration(flightDetails?.departureTime, flightDetails?.estimatedArrivalTime)}</span>
                </div>
                <div className={styles.metaItem}>
                  <Users size={16} />
                  <span>Aircraft: {flightDetails?.aircraft?.model || 'Boeing 737'}</span>
                </div>
                <div className={styles.metaItem}>
                  <MapPin size={16} />
                  <span>Gate: {flightDetails?.gate || 'TBA'}</span>
                </div>
              </div>
            </div>
          )}
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
            {/* Quick Summary */}
            {currentStep > 1 && renderQuickSummary()}

            {renderStepContent()}
          </div>

          {/* Booking Summary */}
          {/* Booking Summary */}
          <div className={styles.bookingSummary}>
            <div className={styles.summaryHeader}>
              <h3>Booking Summary</h3>
              <div className={styles.summaryBadge}>
                {allFlightDetails.length > 1 ? `${allFlightDetails.length} Flights` : 'Single Flight'}
              </div>
            </div>

            {/* Passenger Information */}
            <div className={styles.summarySection}>
              <h4>Travelers</h4>
              <div className={styles.passengerSummary}>
                {adultCount > 0 && (
                  <div className={styles.passengerType}>
                    <span><Users size={16} /> Adults</span>
                    <span>{adultCount}</span>
                  </div>
                )}
                {childCount > 0 && (
                  <div className={styles.passengerType}>
                    <span><User size={16} /> Children</span>
                    <span>{childCount}</span>
                  </div>
                )}
                {infantCount > 0 && (
                  <div className={styles.passengerType}>
                    <span><Gift size={16} /> Infants</span>
                    <span>{infantCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Summary - Renders only when there's a calculated total */}
            {priceBreakdown.total > 0 && (
              <div className={styles.summarySection}>
                <h4>Price Summary</h4>
                <div className={styles.priceBreakdown}>

                  {/* Seat pricing by class and flight from the correct source */}
                  {Object.entries(priceBreakdown.groupedSeats).map(([key, { count, totalPrice }]) => (
                    <div key={key} className={styles.priceItem}>
                      <span className={styles.priceLabel}>{key} ({count}x)</span>
                      <span className={styles.priceValue}>{formatVND(totalPrice)}</span>
                    </div>
                  ))}

                  {/* Infant pricing */}
                  {infantCount > 0 && (
                    <div className={styles.priceItem}>
                      <span className={styles.priceLabel}>
                        Infants ({infantCount}x)
                        {allFlightDetails.length > 1 && ` x ${allFlightDetails.length} flights`}
                      </span>
                      <span className={styles.priceValue}>{formatVND(priceBreakdown.infantTotal)}</span>
                    </div>
                  )}

                  {/* Baggage add-ons */}
                  {priceBreakdown.baggageTotal > 0 && (
                    <div className={styles.priceItem}>
                      <span className={styles.priceLabel}>Baggage Add-ons</span>
                      <span className={styles.priceValue}>{formatVND(priceBreakdown.baggageTotal)}</span>
                    </div>
                  )}

                  <div className={styles.priceDivider}></div>

                  {/* Subtotal */}
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel}>Subtotal</span>
                    <span className={styles.priceValue}>{formatVND(priceBreakdown.subtotal + priceBreakdown.infantTotal + (priceBreakdown.baggageTotal || 0))}</span>
                  </div>

                  {/* Discount */}
                  {selectedVoucher && priceBreakdown.discount > 0 && (
                    <div className={styles.priceItem} style={{ color: 'var(--success-dark)' }}>
                      <span className={styles.priceLabel}>
                        Voucher Discount ({selectedVoucher.code})
                      </span>
                      <span className={styles.priceValue}>-{formatVND(priceBreakdown.discount)}</span>
                    </div>
                  )}

                  {/* Taxes & Fees */}
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel}>Taxes & Fees (10%)</span>
                    <span className={styles.priceValue}>{formatVND(priceBreakdown.taxesAndFees)}</span>
                  </div>
                </div>

                <div className={styles.totalPrice}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>{formatVND(priceBreakdown.total)}</span>
                </div>

                {allFlightDetails.length > 1 && (
                  <div className={styles.pricingNote}>
                    <Info size={14} />
                    <span>Prices are calculated per seat, per flight segment.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className={styles.continueButtonContainer}>
          <div className={styles.stepSummary}>
            <div className={styles.stepName}>Current Step: {steps[currentStep - 1].name}</div>
            <div className={styles.stepTotal}>Total: {formatVND(calculateTotal())}</div>
          </div>

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
                className={styles.continueButton}
                disabled={
                  (currentStep === 1 && !isSeatSelectionComplete) ||
                  (currentStep === 2 && !isPassengerInfoValid)
                }
              >
                Continue <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleBookingSubmission}
                disabled={processing || selectedSeats.length === 0}
                className={styles.continueButton}
              >
                {processing ? (
                  <>
                    <div className={styles.btnSpinner}></div>
                    Processing...
                  </>
                ) : selectedSeats.length > 0 ? (
                  <>Confirm Booking <CheckCircle size={18} /></>
                ) : (
                  'Select Seats to Continue'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;