import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  UserCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createBooking, getUserVouchers, getAvailableSeatsCount, checkSeatAvailability } from '../../services/BookingService';
import { getUserProfile } from '../../services/UserService';
import axiosInstance from '../../utils/axios';
import SeatMap from '../../components/SeatMap/SeatMap';
import styles from './Booking.module.css';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

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

  // Step management - Simplified to 3 steps
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    { id: 1, name: 'Seat Selection', icon: MapPin },
    { id: 2, name: 'Passenger Info', icon: User },
    { id: 3, name: 'Payment', icon: CreditCard }
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
  const [paymentMethod, setPaymentMethod] = useState('VNPAY');
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
    // Check every passenger's details
    for (const passenger of passengers) {
      if (!passenger.firstName?.trim() || !passenger.lastName?.trim() || !passenger.dateOfBirth) {
        return false; // A required field is missing
      }
      // Check if the entered DOB matches the expected passenger type
      const expectedType = determinePassengerType(passenger.dateOfBirth);
      if (passenger.passengerType !== expectedType) {
        return false; // Age does not match the passenger category (e.g., adult, child)
      }
    }

    // Check the main contact information
    if (!contactInfo.email?.trim() || !contactInfo.phone?.trim()) {
      return false; // Contact info is missing
    }

    // If all checks pass, the information is valid
    return true;
  }, [passengers, contactInfo]);

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

        // Step 2: For each flight, fetch its specific seat sections (layout)
        const sectionPromises = flightDetailsArray.map(flight => {
          if (!flight.aircraft?.id) {
            // If a flight is missing aircraft info, return it as-is to avoid a crash
            console.warn(`Flight ${flight.flightId} is missing aircraft ID.`);
            return Promise.resolve(flight);
          }
          return axiosInstance.get(`/flight-service/api/v1/fs/aircraft/${flight.aircraft.id}/seat-sections`);
        });

        const sectionResponses = await Promise.all(sectionPromises);

        // Step 3: Merge the seat sections back into each flight object
        const enrichedFlightDetails = flightDetailsArray.map((flight, index) => {
          const sectionsData = sectionResponses[index]?.data?.seatSections;
          if (sectionsData) {
            return {
              ...flight,
              aircraft: {
                ...flight.aircraft,
                seatSections: sectionsData,
              },
            };
          }
          return flight; // Return original flight if sections couldn't be fetched
        });

        console.log('Enriched flight details with seat sections:', enrichedFlightDetails);

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
      // Try to get total available seats across all fare classes
      const seatResponse = await axiosInstance.get(
        `/flight-service/api/v1/fs/aircraft/${flightDetails.aircraft?.id}/seat-sections`
      );

      if (seatResponse.data?.seatSections) {
        const sections = seatResponse.data.seatSections;
        console.log('Seat sections loaded:', sections);

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

  // Helper function to get seat class from seat code for a specific flight
  const getSeatClassForFlight = (seatCode, flight) => {
    // Early check for missing inputs
    if (!seatCode || !flight) {
      console.warn('getSeatClassForFlight called with missing parameters:', { seatCode, flight });
      return 'ECONOMY';
    }

    console.log('getSeatClassForFlight called with:', seatCode, 'for flight:', flight?.flightNumber || flight?.flightId);

    // Check if flight has seat sections data
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
          console.log(`Seat ${seatCode} found in standard class ${section}`);
          return section;
        }
      }

      // If not found in standard sections, check all other sections
      for (const [sectionClass, seats] of Object.entries(normalizedSections)) {
        // Skip if we already checked this section
        if (standardSections.includes(sectionClass)) continue;

        if (Array.isArray(seats) && seats.includes(seatCode)) {
          console.log(`Seat ${seatCode} found in class ${sectionClass}`);
          return sectionClass;
        }
      }
    }

    console.log('Using seat code pattern matching fallback for seat:', seatCode);
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

    console.log(`Could not determine class for seat ${seatCode}, defaulting to ECONOMY`);
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
          if (p.requiresDocument && !p.idNumber?.trim() && !p.passportNumber?.trim()) {
            toast.error(`Passenger ${i + 1} requires an ID or Passport Number.`);
            return false;
          }
        }
        if (!contactInfo.email?.trim() || !contactInfo.phone?.trim()) {
          toast.error('Please provide complete contact information.');
          return false;
        }
        return true;

      case 3: // Payment
        return paymentMethod !== null;

      default:
        return true;
    }
  };

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

  // Enhanced booking submission
  const handleBookingSubmission = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setProcessing(true);
    setBookingProgress(10);

    try {
      // Check seat availability before booking
      setBookingProgress(20);
      
      // For multi-flight bookings, check availability for each flight with its selected seats
      if (hasConnectingFlights()) {
        // Process each flight separately
        for (let flightIndex = 0; flightIndex < allFlightDetails.length; flightIndex++) {
          const flight = allFlightDetails[flightIndex];
          const seatsForThisFlight = selectedSeatsByFlight[flightIndex] || [];
          
          // Skip if no seats selected for this flight (shouldn't happen)
          if (!seatsForThisFlight.length) continue;
          
          console.log(`Checking availability for flight ${flight.flightId}, seats: ${seatsForThisFlight.join(', ')}`);
          
          const seatAvailability = await checkSeatAvailability(flight.flightId, seatsForThisFlight);
          console.log(`Seat availability response for flight ${flightIndex}:`, seatAvailability);
          
          // Check response format - backend might return different formats
          if (!seatAvailability.success) {
            toast.error(`Failed to check seat availability for flight ${flightIndex + 1}.`);
            setProcessing(false);
            return;
          }
          
          // Handle response format with allRequestedSeatsAvailable
          if (seatAvailability.allRequestedSeatsAvailable === false) {
            toast.error(`Some seats on Flight ${flightIndex + 1} are no longer available. Please select new seats.`);
            setProcessing(false);
            return;
          }
          
          // Handle response format with seatStatuses array
          if (seatAvailability.seatStatuses && Array.isArray(seatAvailability.seatStatuses)) {
            const unavailableSeats = seatAvailability.seatStatuses
              .filter(status => !status.available)
              .map(status => status.seatCode);
              
            if (unavailableSeats.length > 0) {
              toast.error(`Seats ${unavailableSeats.join(', ')} are no longer available on Flight ${flightIndex + 1}. Please select new seats.`);
              setProcessing(false);
              return;
            }
          }
          
          // Handle older response format with data.availableSeats
          if (seatAvailability.data) {
            if (seatAvailability.data.allAvailable === false) {
              let unavailableSeats = [];
              
              if (seatAvailability.data.availableSeats) {
                // If availableSeats is provided, use it to determine which seats are unavailable
                unavailableSeats = seatsForThisFlight.filter(
                  (seat) => !seatAvailability.data.availableSeats.includes(seat)
                );
              }
              
              toast.error(`Seats ${unavailableSeats.length > 0 ? unavailableSeats.join(', ') : 'selected'} are no longer available on Flight ${flightIndex + 1}. Please select new seats.`);
              setProcessing(false);
              return;
            }
          }
        }
      } else {
        // Single flight - use updated handling logic
        const seatAvailability = await checkSeatAvailability(flightDetails.flightId, selectedSeats);
        console.log(`Seat availability response for single flight:`, seatAvailability);
        
        // Check response format - backend might return different formats
        if (!seatAvailability.success) {
          toast.error(`Failed to check seat availability.`);
          setProcessing(false);
          return;
        }
        
        // Handle response format with allRequestedSeatsAvailable at top level
        if (seatAvailability.allRequestedSeatsAvailable === false) {
          toast.error(`Some seats are no longer available. Please select new seats.`);
          setProcessing(false);
          return;
        }
        
        // Handle response format with seatStatuses array
        if (seatAvailability.seatStatuses && Array.isArray(seatAvailability.seatStatuses)) {
          const unavailableSeats = seatAvailability.seatStatuses
            .filter(status => !status.available)
            .map(status => status.seatCode);
            
          if (unavailableSeats.length > 0) {
            toast.error(`Seats ${unavailableSeats.join(', ')} are no longer available. Please select new seats.`);
            setProcessing(false);
            return;
          }
        }
        
        // Handle older response format with data.availableSeats
        if (seatAvailability.data) {
          if (seatAvailability.data.allAvailable === false) {
            let unavailableSeats = [];
            
            if (seatAvailability.data.availableSeats) {
              // If availableSeats is provided, use it to determine which seats are unavailable
              unavailableSeats = selectedSeats.filter(
                (seat) => !seatAvailability.data.availableSeats.includes(seat)
              );
            }
            
            toast.error(`Seats ${unavailableSeats.length > 0 ? unavailableSeats.join(', ') : 'selected'} are no longer available. Please select new seats.`);
            setProcessing(false);
            return;
          }
        }
      }

      setBookingProgress(40);

      // Prepare booking data
      const bookingData = prepareBookingDataForMultipleFlights();

      setBookingProgress(60);

      // Submit booking
      const booking = await createBooking(bookingData);

      setBookingProgress(80);

      // Handle payment if VNPay is selected
      if (paymentMethod === 'VNPAY') {
        // Redirect to VNPay or handle payment
        setBookingProgress(90);
        // Add VNPay integration here
      }

      setBookingProgress(100);

      // Redirect to success page
      navigate(`/booking/success/${booking.bookingReference}`, {
        state: { booking, flightDetails }
      });

    } catch (error) {
      console.error('Booking submission error:', error);
      toast.error(error.message || 'Failed to create booking. Please try again.');
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

    // Step 4: Return the result. Use the found price, or 0 if no matching fare exists.
    // Ensure we're getting the actual price from the matching fare
    // Log the found price for debugging
    console.log(`Seat ${seatCode} is in class ${determinedSeatClass}, matched fare:`, matchingFare);

    return {
      farePrice: matchingFare?.price || 0,
      className: displayClassName,
      seatClass: determinedSeatClass,
    };
  };


  // HÀM TÍNH TOÁN GIÁ MỚI - THAY THẾ HOÀN TOÀN HÀM CŨ
  // Sử dụng useMemo để tối ưu, chỉ tính lại khi cần thiết.
  const priceBreakdown = useMemo(() => {
    let subtotal = 0;
    const groupedSeats = {};

    // Lặp qua từng chặng bay
    allFlightDetails.forEach((flight, flightIndex) => {
      const seatsForThisFlight = selectedSeatsByFlight[flightIndex] || [];

      // Lặp qua các ghế đã chọn chỉ cho chặng bay đó
      seatsForThisFlight.forEach(seat => {
        // Sử dụng helper mới để lấy giá và loại ghế chính xác
        const { farePrice, className, seatClass } = getPriceAndClassForSeat(seat, flight);

        // Log để debug giá vé
        console.log(`Flight ${flightIndex} - Seat ${seat}: Class=${seatClass}, DisplayName=${className}, Price=${farePrice}`);

        // Chỉ cộng giá 1 lần cho 1 ghế trên 1 chuyến bay
        subtotal += farePrice;

        // Nhóm ghế để hiển thị trong summary
        const key = allFlightDetails.length > 1 ? `Chặng ${flightIndex + 1} - ${className}` : className;
        if (!groupedSeats[key]) {
          groupedSeats[key] = { count: 0, totalPrice: 0, seats: [] };
        }
        groupedSeats[key].count++;
        groupedSeats[key].totalPrice += farePrice;
        groupedSeats[key].seats.push(seat);
      });
    });

    const infantTotal = (infantCount > 0 && allFlightDetails.length > 0) ? (100000 * infantCount * allFlightDetails.length) : 0;
    const totalBeforeTaxes = subtotal + infantTotal;
    const taxesAndFees = Math.round(totalBeforeTaxes * 0.1);
    const totalWithTaxes = totalBeforeTaxes + taxesAndFees;

    let discount = 0;
    if (selectedVoucher && totalWithTaxes >= (selectedVoucher.minimumPurchaseAmount || 0)) {
      discount = Math.min(
        totalWithTaxes * (selectedVoucher.discountPercentage / 100),
        selectedVoucher.maximumDiscountAmount || Infinity
      );
    }

    const total = Math.max(0, totalWithTaxes - discount);

    return {
      subtotal,
      infantTotal,
      taxesAndFees,
      discount,
      total,
      groupedSeats
    };
  }, [selectedSeatsByFlight, infantCount, allFlightDetails, selectedVoucher]); // Dependencies

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

    const origins = allFlightDetails.map(flight => flight.departureAirport).join(' → ');
    const destinations = allFlightDetails.map(flight => flight.arrivalAirport);
    return `${origins} → ${destinations[destinations.length - 1]}`;
  };

  // Enhanced booking data preparation for multiple flights
  const prepareBookingDataForMultipleFlights = () => {
    const flightDetailsArray = getAllFlightDetailsForDisplay();

    // Calculate seat pricing for each flight - taking into account multi-flight scenario
    let seatPricingByFlight = [];
    
    // For multi-flight bookings, use the selectedSeatsByFlight mapping
    if (hasConnectingFlights()) {
      // Process each flight and its seats separately
      flightDetailsArray.forEach((flight, flightIndex) => {
        const seatsForThisFlight = selectedSeatsByFlight[flightIndex] || [];
        
        // Create a pricing entry for each seat on this flight
        const seatPricingsForThisFlight = [];
        
        // For each seat in this flight
        seatsForThisFlight.forEach(seat => {
          // Get proper seat class and fare info for this specific seat in this specific flight
          const { seatClass, farePrice } = getPriceAndClassForSeat(seat, flight);
          
          console.log(`Flight ${flightIndex}: Adding seat ${seat}, class ${seatClass}, price ${farePrice}`);
          
          // Add to the pricing data for this flight - match the backend expected format
          const matchingFare = flight.availableFares.find(
            f => f.fareType === seatClass || f.name?.toUpperCase().includes(seatClass)
          );
          
          seatPricingsForThisFlight.push({
            flightId: flight.flightId,
            seatCode: seat, 
            seatClass,
            farePrice,
            fareId: matchingFare?.id // Include fare ID which might be needed by backend
          });
        });
        
        // Add this flight's seat pricing to the overall array
        if (seatPricingsForThisFlight.length > 0) {
          seatPricingByFlight.push(seatPricingsForThisFlight);
        }
      });
    } else {
      // Single flight - make sure we have the right structure
      selectedSeats.forEach(seat => {
        const { seatClass, farePrice } = getPriceAndClassForSeat(seat, flightDetails);
        
        // Include fare ID for the backend
        const matchingFare = flightDetails.availableFares.find(
          f => f.fareType === seatClass || f.name?.toUpperCase().includes(seatClass)
        );
        
        console.log(`Single flight: Adding seat ${seat}, class ${seatClass}, price ${farePrice}, fare:`, matchingFare);
        
        seatPricingByFlight.push([{
          flightId: flightDetails.flightId,
          seatCode: seat,
          seatClass,
          farePrice,
          fareId: matchingFare?.id // Include fare ID which might be needed by backend
        }]);
      });
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
          passengerType: p.passengerType
        };
      } else {
        // Single flight - simpler format
        return {
          ...p,
          seatNumber: selectedSeats[index] || null,
          passengerType: p.passengerType,
          fareClass: selectedSeats[index] ? getSeatClass(selectedSeats[index]) : 'ECONOMY'
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

    console.log('Determined selectedFareName:', selectedFareName);

    return {
      flightIds: flightIds,
      passengers: passengerData,
      contactInfo,
      selectedSeats: hasConnectingFlights() ? selectedSeatsByFlight : selectedSeats,
      selectedFareName: selectedFareName, // Add the required field
      paymentMethod,
      voucherCode: selectedVoucher?.code || null,
      totalAmount: calculateTotal(),
      seatPricingByFlight,
      passengerBreakdown: {
        adults: adultCount,
        children: childCount,
        infants: infantCount
      },
      isConnectingFlight: hasConnectingFlights(),
      flightSegments: allFlightDetails.map(flight => ({
        flightId: flight.flightId,
        flightNumber: flight.flightNumber || flight.flightCode,
        origin: flight.departureAirport || flight.originAirport?.code,
        destination: flight.arrivalAirport || flight.destinationAirport?.code,
        departureTime: flight.departureDateTime || flight.departureTime,
        arrivalTime: flight.arrivalDateTime || flight.estimatedArrivalTime
      })),
      priceBreakdown: priceBreakdown
    };
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
      <div className={styles.summaryItem}>
        <span>Flight{hasConnectingFlights() ? 's' : ''}:</span>
        <span>
          {hasConnectingFlights() ?
            `${flightIds.length} segments (${formatMultiFlightRoute() || 'Multi-city'})` :
            flightDetails?.flightNumber || 'Loading...'
          }
        </span>
      </div>
      <div className={styles.summaryItem}>
        <span>Passengers:</span>
        <span>
          {adultCount > 0 && `${adultCount} Adult${adultCount > 1 ? 's' : ''}`}
          {childCount > 0 && `${adultCount > 0 ? ', ' : ''}${childCount} Child${childCount > 1 ? 'ren' : ''}`}
          {infantCount > 0 && `${(adultCount + childCount) > 0 ? ', ' : ''}${infantCount} Infant${infantCount > 1 ? 's' : ''}`}
        </span>
      </div>
      {selectedSeats.length > 0 && (
        <div className={styles.summaryItem}>
          <span>Seats:</span>
          <span>{selectedSeats.join(', ')}</span>
        </div>
      )}
      <div className={styles.summaryItem}>
        <span>Total:</span>
        <span className={styles.summaryPrice}>{formatVND(calculateTotal())}</span>
      </div>
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
                  {selectedSeats[index] && ` - Seat ${selectedSeats[index]}`}
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
                  <option value="VN">Vietnam</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="JP">Japan</option>
                  <option value="KR">South Korea</option>
                  <option value="CN">China</option>
                  <option value="SG">Singapore</option>
                  <option value="MY">Malaysia</option>
                  <option value="TH">Thailand</option>
                  <option value="AU">Australia</option>
                  <option value="OTHER">Other</option>
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

              {/* Always show passport number field, but make it optional */}
              <div className={styles.inputGroup}>
                <label>Passport Number {passenger.nationality !== 'VN' ? '*' : ''}</label>
                <input
                  type="text"
                  value={passenger.passportNumber}
                  onChange={(e) => handlePassengerChange(index, 'passportNumber', e.target.value)}
                  className={styles.input}
                  placeholder="Enter passport number"
                  required={passenger.nationality !== 'VN'}
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
    <div className={styles.paymentContainer}>
      <div className={styles.paymentHeader}>
        <CreditCard size={24} />
        <span>Payment Information</span>
      </div>

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
          {loadingVouchers ? (
            <div className={styles.loadingVouchers}>
              <div className={styles.loadingSpinner}></div>
              Loading your vouchers...
            </div>
          ) : availableVouchers.length > 0 ? (
            <div className={styles.availableVouchers}>
              <h4>Your Available Vouchers:</h4>
              <div className={styles.voucherList}>
                {availableVouchers.map((voucher) => (
                  <div
                    key={voucher.code}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <div className={styles.noVouchersMessage}>
                <Info size={16} />
                No vouchers available at this time
             </div>
          )}
        </div>
      </div>

      <h3 className={styles.paymentSectionTitle}>Payment Method</h3>
      <div className={styles.paymentMethods}>
        {/* Payment method options can remain as they are */}
      </div>

      <div className={styles.orderSummary}>
        <div className={styles.orderSummaryHeader}>
          <CheckCircle size={16} />
          <span>Booking Summary</span>
        </div>
        
        {/* CORRECTED: Using priceBreakdown object directly */}
        <div className={styles.orderDetail}>
          <div className={styles.orderDetailLabel}>Base Fare (Seats + Infants)</div>
          <div className={styles.orderDetailValue}>{formatVND(priceBreakdown.subtotal + priceBreakdown.infantTotal)}</div>
        </div>
        <div className={styles.orderDetail}>
          <div className={styles.orderDetailLabel}>Taxes & Fees</div>
          <div className={styles.orderDetailValue}>{formatVND(priceBreakdown.taxesAndFees)}</div>
        </div>
        {selectedVoucher && priceBreakdown.discount > 0 && (
          <div className={styles.orderDetail}>
            <div className={styles.orderDetailLabel} style={{color: 'var(--success-dark)'}}>Voucher Discount</div>
            <div className={styles.orderDetailValue} style={{color: 'var(--success-dark)'}}>-{formatVND(priceBreakdown.discount)}</div>
          </div>
        )}
        <div className={styles.orderTotal}>
          <div className={styles.orderTotalLabel}>Total</div>
          <div className={styles.orderTotalValue}>{formatVND(priceBreakdown.total)}</div>
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
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderSeatSelection();
      case 2:
        return renderPassengerInfo();
      case 3:
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

                  <div className={styles.priceDivider}></div>

                  {/* Subtotal */}
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel}>Subtotal</span>
                    <span className={styles.priceValue}>{formatVND(priceBreakdown.subtotal + priceBreakdown.infantTotal)}</span>
                  </div>

                  {/* Taxes and fees */}
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel}>Taxes & Fees (10%)</span>
                    <span className={styles.priceValue}>{formatVND(priceBreakdown.taxesAndFees)}</span>
                  </div>

                  {/* Discount */}
                  {selectedVoucher && priceBreakdown.discount > 0 && (
                    <div className={styles.priceItem} style={{ color: 'var(--success-dark)' }}>
                      <span className={styles.priceLabel}>
                        Discount ({selectedVoucher.discountPercentage}%)
                      </span>
                      <span className={styles.priceValue}>-{formatVND(priceBreakdown.discount)}</span>
                    </div>
                  )}
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