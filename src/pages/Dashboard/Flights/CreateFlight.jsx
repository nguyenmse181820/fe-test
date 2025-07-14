import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import axios from 'axios';
import { AlertCircle, CheckCircle, Clock, Loader2, Plane, X, Plus, Globe, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { convertAdminTimeToUTC, getMultiTimezoneDisplay, getUserTimezone, formatTimeWithTimezone } from '../../../utils/timezone';

// Import styles
import styles from './CreateFlight.module.css';

// Shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

// Aircraft service base URL
const AIRCRAFT_SERVICE_URL = `${import.meta.env.VITE_API_GATEWAY || 'http://localhost:8080'}/air-craft/api/v1/public`;

// Predefined color palette for fares (up to 15)
const FARE_COLORS = [
  '#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ff8a65', '#a1887f', '#90a4ae', '#f06292',
  '#7986cb', '#aed581', '#fff176', '#9575cd', '#4fc3f7'
];

// Predefined fare types that match the backend enum
const FARE_TYPES = {
  ECONOMY: 'ECONOMY',
  BUSINESS: 'BUSINESS',
  FIRST_CLASS: 'FIRST_CLASS'
};

// Map seat class names to fare types (with various possible formats)
const SEAT_CLASS_TO_FARE_TYPE = {
  // Standard mappings
  economy: FARE_TYPES.ECONOMY,
  premiumeconomy: FARE_TYPES.ECONOMY,  // Map to ECONOMY as PREMIUM_ECONOMY is not supported
  premium_economy: FARE_TYPES.ECONOMY, // Map to ECONOMY as PREMIUM_ECONOMY is not supported
  premium: FARE_TYPES.ECONOMY,         // Map to ECONOMY as PREMIUM_ECONOMY is not supported
  business: FARE_TYPES.BUSINESS,
  first: FARE_TYPES.FIRST_CLASS,
  
  // Handle camelCase variations
  premiumEconomy: FARE_TYPES.ECONOMY   // Map to ECONOMY as PREMIUM_ECONOMY is not supported
};

const CreateFlight = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [detailedError, setDetailedError] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [airports, setAirports] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [selectedAircraftType, setSelectedAircraftType] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    aircraftId: '',
    originId: '',
    destinationId: '',
    departureTime: '',
    seatClassFares: [] // Changed from 'fares' to 'seatClassFares'
  });
  const [aircraftSeatSections, setAircraftSeatSections] = useState({}); // Store seat sections from aircraft

  const [benefitSearch, setBenefitSearch] = useState('');
  const [benefitSearchResults, setBenefitSearchResults] = useState([]);
  const [activeBenefitSearchIndex, setActiveBenefitSearchIndex] = useState(null);
  const [originSearch, setOriginSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [selectedOriginAirport, setSelectedOriginAirport] = useState(null);
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState(null);
  const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
  const [destinationDropdownOpen, setDestinationDropdownOpen] = useState(false);
  const originInputRef = useRef(null);
  const destinationInputRef = useRef(null);
  const originDropdownRef = useRef(null);
  const destinationDropdownRef = useRef(null);
  const benefitDropdownRef = useRef(null);
  const [benefitDropdownOpen, setBenefitDropdownOpen] = useState(false);

  // Route duration state
  const [routeDuration, setRouteDuration] = useState(null);
  const [durationLoading, setDurationLoading] = useState(false);
  const [routeId, setRouteId] = useState(null); // Add state for route ID

  // Fetch route details including ID and duration between airports
  const fetchRouteDetails = async (originId, destinationId) => {
    if (!originId || !destinationId) {
      setRouteDuration(null);
      setRouteId(null);
      return;
    }

    try {
      setDurationLoading(true);
      setError(null);
      
      // Fetch all routes without parameters
      const routesResponse = await axiosInstance.get(`/flight-service/api/v1/fs/routes`);
      
      // Get all routes from the response
      const routesData = routesResponse.data?.data?.content;
      // Filter the routes client-side to find one that matches our origin and destination
      if (routesData && routesData.length > 0) {
        // Find the route that matches our origin and destination
        const matchingRoute = routesData.find(
          route => route.origin.id === originId && route.destination.id === destinationId
        );
        
        if (matchingRoute) {
          setRouteId(matchingRoute.id);
          setRouteDuration(matchingRoute.estimatedDurationMinutes);
        } else {
          console.warn(`No route found between airports with IDs: ${originId} and ${destinationId}`);
          setRouteId(null);
          setRouteDuration(null);
          setError('No route exists between these airports. Please select airports with an existing route.');
        }
      } else {
        console.warn('No routes returned from the API');
        setRouteId(null);
        setRouteDuration(null);
        setError('No routes available in the system.');
      }
    } catch (err) {
      console.error('Error fetching route details:', err);
      setRouteId(null);
      setRouteDuration(null);
      setError('Failed to fetch route details');
    } finally {
      setDurationLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let hasError = false;

      try {
        // Fetch airports without pagination
        const airportsResponse = await axiosInstance.get('/flight-service/api/v1/airports');
        setAirports(airportsResponse.data.data.content);
      } catch (err) {
        console.error('Error fetching airports:', err);
        hasError = true;
        setAirports([]);
      }

      try {
        // Fetch benefits without pagination
        const benefitsResponse = await axiosInstance.get('/flight-service/api/v1/benefits');
        setBenefits(benefitsResponse.data.data.content);
      } catch (err) {
        console.error('Error fetching benefits:', err);
        hasError = true;
        setBenefits([]);
      }

      try {
        // Fetch aircraft without pagination - using the external aircraft service
        const aircraftResponse = await axios.get(`${AIRCRAFT_SERVICE_URL}/aircraft-active`);
        if (aircraftResponse.data && aircraftResponse.data.data) {
          setAircraft(aircraftResponse.data.data);
        } else {
          console.error('Unexpected aircraft response structure:', aircraftResponse.data);
          setAircraft([]);
          hasError = true;
        }
      } catch (err) {
        console.error('Error fetching aircraft:', err);
        hasError = true;
        setAircraft([]);
      }

      if (hasError) {
        setError('Some data could not be loaded. You may continue, but some options might be limited.');
      }
    } catch (err) {
      console.error('Error in fetchInitialData:', err);
      setError('Failed to fetch initial data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOriginAirport && selectedDestinationAirport) {
      fetchRouteDetails(selectedOriginAirport.id, selectedDestinationAirport.id);
    } else {
      setRouteDuration(null);
    }
  }, [selectedOriginAirport, selectedDestinationAirport]);

  // Initial data loading when component mounts
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Search/filter benefits
  useEffect(() => {
    if (!benefitSearch || activeBenefitSearchIndex === null) {
      setBenefitSearchResults([]);
      return;
    }

    const currentFare = formData.seatClassFares[activeBenefitSearchIndex];
    if (!currentFare) {
      setBenefitSearchResults([]);
      return;
    }
    setBenefitSearchResults(
      benefits.filter(b =>
        b.name.toLowerCase().includes(benefitSearch.toLowerCase()) &&
        !currentFare.benefits.includes(b.id)
      )
    );
  }, [benefitSearch, benefits, formData.seatClassFares, activeBenefitSearchIndex]);

  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    // Clear previous field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
      setDetailedError(null);
      setShowErrorDetails(false);
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // When aircraft is selected, find and set its type data and fetch seat sections
      if (name === 'aircraftId') {
        const selectedAircraft = aircraft.find(a => a.id === value);
        if (selectedAircraft) {
          setSelectedAircraftType(selectedAircraft.aircraftType);
          // Fetch seat sections from flight service
          fetchAircraftSeatSections(value);
        } else {
          setSelectedAircraftType(null);
          setAircraftSeatSections({});
        }
      }

      // Validate field on change for immediate feedback
      const fieldValidationErrors = validateField(name, value, newData);
      if (Object.keys(fieldValidationErrors).length > 0) {
        setFieldErrors(prev => ({ ...prev, ...fieldValidationErrors }));
      }

      return newData;
    });
  };

  // Helper function to determine fare type from seat class name
  const getFareTypeFromSeatClass = (seatClassName) => {
    // Convert to lowercase to standardize comparison
    const normalizedName = seatClassName.toLowerCase().trim();
    
    // Check for exact matches first
    if (SEAT_CLASS_TO_FARE_TYPE[normalizedName]) {
      return SEAT_CLASS_TO_FARE_TYPE[normalizedName];
    }
    
    // Check for partial matches
    if (normalizedName.includes('economy')) {
      // All economy classes (including premium economy) are mapped to ECONOMY
      return FARE_TYPES.ECONOMY;
    } else if (normalizedName.includes('business')) {
      return FARE_TYPES.BUSINESS;
    } else if (normalizedName.includes('first')) {
      return FARE_TYPES.FIRST_CLASS;
    }
    
    // Default to economy if no match found
    console.warn(`No fare type match found for seat class: ${seatClassName}, defaulting to ECONOMY`);
    return FARE_TYPES.ECONOMY;
  };

  const fetchAircraftSeatSections = async (aircraftId) => {
    try {
      const response = await axiosInstance.get(`/flight-service/api/v1/fs/aircraft/${aircraftId}/seat-sections`);
      const seatSections = response.data.seatSections;
      setAircraftSeatSections(seatSections);      // Initialize seat class fares based on available seat sections
      const initialSeatClassFares = Object.entries(seatSections)
        .filter(([sectionName, seats]) => seats && seats.length > 0) // Only include sections with actual seats
        .map(([sectionName, seats]) => {
          // Determine the fare type based on seat class name
          const fareType = getFareTypeFromSeatClass(sectionName);
          
          return {
            seatClassName: sectionName,
            name: sectionName.charAt(0).toUpperCase() + sectionName.slice(1), // Capitalize first letter
            minPrice: '',
            maxPrice: '',
            benefits: [],
            fareType: fareType // Use the determined fare type
          };
        });

      setFormData(prev => ({
        ...prev,
        seatClassFares: initialSeatClassFares
      }));
    } catch (error) {
      console.error('Error fetching aircraft seat sections:', error);
      setError('Failed to fetch aircraft seat sections');
    }
  };

  const handleSeatClassFareChange = (index, field, value) => {
    // Clear related field errors
    const errorKey = `seatClassFare_${index}`;
    if (fieldErrors[errorKey]?.[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[errorKey]) {
          delete newErrors[errorKey][field];
          if (Object.keys(newErrors[errorKey]).length === 0) {
            delete newErrors[errorKey];
          }
        }
        return newErrors;
      });
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
      setDetailedError(null);
      setShowErrorDetails(false);
    }

    setFormData(prev => ({
      ...prev,
      seatClassFares: prev.seatClassFares.map((fare, i) =>
        i === index ? { ...fare, [field]: value } : fare
      )
    }));
  };

  const handleBenefitChange = (index, benefitId, checked) => {
    setFormData(prev => ({
      ...prev,
      seatClassFares: prev.seatClassFares.map((fare, i) =>
        i === index ? {
          ...fare,
          benefits: checked
            ? [...fare.benefits, benefitId]
            : fare.benefits.filter(id => id !== benefitId)
        } : fare
      )
    }));
  };  const renderSeatSections = () => {
    if (!aircraftSeatSections || Object.keys(aircraftSeatSections).length === 0) {
      return (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <p>Please select an aircraft to see available seat sections.</p>
        </div>
      );
    }

    // Filter out sections with no seats
    const validSections = Object.entries(aircraftSeatSections).filter(([sectionName, seats]) => seats && seats.length > 0);

    if (validSections.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <p>No valid seat sections found for this aircraft.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Aircraft Seat Sections</h3>
        <div className="space-y-3">
          {validSections.map(([sectionName, seats]) => (
            <div key={sectionName} className="rounded-md border p-3">
              <h4 className="font-medium">{sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h4>
              <p className="text-sm text-muted-foreground">
                {seats.length} seats: {seats.slice(0, 5).join(', ')}{seats.length > 5 ? '...' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Calculate estimated arrival time
  const calculateEstimatedArrivalTime = () => {
    if (!formData.departureTime || !routeDuration) {
      return null;
    }

    try {
      const departureDate = new Date(formData.departureTime);
      
      // Validate the departure date
      if (isNaN(departureDate.getTime())) {
        console.error('Invalid departure time:', formData.departureTime);
        return null;
      }
      
      // Calculate arrival time by adding duration in milliseconds
      const durationMs = routeDuration * 60 * 1000; // Convert minutes to milliseconds
      const arrivalDate = new Date(departureDate.getTime() + durationMs);
            
      // Validate the arrival date
      if (isNaN(arrivalDate.getTime())) {
        console.error('Invalid calculated arrival time');
        return null;
      }

      return arrivalDate.toISOString();
    } catch (error) {
      console.error('Error calculating arrival time:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setSubmitError(null);
    setDetailedError(null);
    setShowErrorDetails(false);
    setFieldErrors({});

    // Validate all fields
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      // Scroll to first error
      const firstErrorElement = document.querySelector('[data-error="true"]');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Validate that a valid route exists
    if (!routeId) {
      setSubmitError('Please select airports that have an established route between them.');
      return;
    }

    try {
      setLoading(true);
      const requestData = {
        code: formData.code,
        aircraftId: formData.aircraftId,
        routeId: routeId,
        departureTime: formData.departureTime,
        seatClassFares: formData.seatClassFares.map(fare => {
          // Always make sure we have a valid fare type based on the seat class
          const validFareType = fare.fareType || getFareTypeFromSeatClass(fare.seatClassName);
          
          return {
            fareType: validFareType,
            minPrice: parseFloat(fare.minPrice),
            maxPrice: parseFloat(fare.maxPrice),
            name: fare.name,
            benefits: fare.benefits || []
          };
        })
      };
      // This endpoint matches the one in FlightController.java
      const response = await axiosInstance.post('/flight-service/api/v1/fs/flights', requestData);

      if ((response.status === 201 || response.status === 200) && response.data) {
        navigate('/dashboard/flights');
      } else {
        throw new Error(response.data?.message || 'Failed to create flight');
      }
    } catch (err) {
      console.error('Error creating flight:', err);

      // Extract detailed error information
      const errorDetails = {
        status: err.response?.status,
        statusText: err.response?.statusText,
        message: err.response?.data?.message || err.message,
        timestamp: new Date().toISOString(),
        endpoint: '/flight-service/api/v1/fs/flights',
        method: 'POST'
      };

      // Add validation errors if they exist
      if (err.response?.data?.errors) {
        errorDetails.validationErrors = err.response.data.errors;
      }

      // Add stack trace for 500 errors (if available)
      if (err.response?.status >= 500 && err.response?.data?.trace) {
        errorDetails.stackTrace = err.response.data.trace;
      }

      setDetailedError(errorDetails);

      // Handle different types of errors with user-friendly messages
      if (err.response?.status === 400) {
        // Bad request - show specific error message
        const errorMessage = err.response.data?.message || 'Invalid data provided';
        
        // Check for validation errors
        if (err.response.data?.errors && Array.isArray(err.response.data.errors)) {
          const validationMessages = err.response.data.errors.map(error => {
            if (error.field && error.defaultMessage) {
              return `${error.field}: ${error.defaultMessage}`;
            } else if (error.message) {
              return error.message;
            }
            return JSON.stringify(error);
          }).join('; ');
          setSubmitError(`Validation failed: ${validationMessages}`);
        } else {
          setSubmitError(errorMessage);
        }
      } else if (err.response?.status === 401) {
        setSubmitError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setSubmitError('You do not have permission to create flights.');
      } else if (err.response?.status === 404) {
        setSubmitError('Flight service not found. Please contact system administrator.');
      } else if (err.response?.status >= 500) {
        // Server error
        setSubmitError('Server error occurred. Please try again later or contact support if the problem persists.');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        // Network error
        setSubmitError('Network error. Please check your connection and try again.');
      } else {
        // Generic error
        setSubmitError(`Failed to create flight: ${err.response?.data?.message || err.message || 'Unknown error occurred'}`);
      }
    } finally {
      setLoading(false);
    }
  };
  // Click outside to close airport and benefit dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (originDropdownOpen && originDropdownRef.current && !originDropdownRef.current.contains(event.target) &&
        (!originInputRef.current || !originInputRef.current.contains(event.target))) {
        setOriginDropdownOpen(false);
      }
      if (destinationDropdownOpen && destinationDropdownRef.current && !destinationDropdownRef.current.contains(event.target) &&
        (!destinationInputRef.current || !destinationInputRef.current.contains(event.target))) {
        setDestinationDropdownOpen(false);
      }
      if (benefitDropdownOpen && benefitDropdownRef.current && !benefitDropdownRef.current.contains(event.target)) {
        setBenefitDropdownOpen(false);
        setActiveBenefitSearchIndex(null);
        setBenefitSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [originDropdownOpen, destinationDropdownOpen, benefitDropdownOpen]);

  // Field validation functions
  const validateField = (name, value, formData) => {
    const errors = {};

    switch (name) {
      case 'code':
        if (!value.trim()) {
          errors.code = 'Flight code is required';
        } else if (value.length < 2) {
          errors.code = 'Flight code must be at least 2 characters';
        }
        break;

      case 'aircraftId':
        if (!value) {
          errors.aircraftId = 'Please select an aircraft';
        }
        break;

      case 'originId':
        if (!value) {
          errors.originId = 'Please select an origin airport';
        } else if (value === formData.destinationId) {
          errors.originId = 'Origin and destination cannot be the same';
        }
        break;

      case 'destinationId':
        if (!value) {
          errors.destinationId = 'Please select a destination airport';
        } else if (value === formData.originId) {
          errors.destinationId = 'Origin and destination cannot be the same';
        }
        break;

      case 'departureTime':
        if (!value) {
          errors.departureTime = 'Please select departure time';
        } else {
          try {
            const departureDate = new Date(value);
            if (isNaN(departureDate.getTime())) {
              errors.departureTime = 'Invalid departure time format';
            } else {
              const now = new Date();
              if (departureDate <= now) {
                errors.departureTime = 'Departure time must be in the future';
              }
            }
          } catch (error) {
            errors.departureTime = 'Invalid departure time format';
          }
        }
        break;
    }

    return errors;
  };

  const validateSeatClassFares = () => {
    const errors = {};

    if (!formData.seatClassFares || formData.seatClassFares.length === 0) {
      errors.seatClassFares = 'Please select an aircraft to configure seat class fares';
      return errors;
    }

    formData.seatClassFares.forEach((fare, index) => {
      const fareErrors = {};

      if (!fare.name?.trim()) {
        fareErrors.name = 'Fare name is required';
      }

      if (!fare.minPrice || fare.minPrice === '') {
        fareErrors.minPrice = 'Min price is required';
      } else if (parseFloat(fare.minPrice) <= 0) {
        fareErrors.minPrice = 'Min price must be greater than 0';
      }

      if (!fare.maxPrice || fare.maxPrice === '') {
        fareErrors.maxPrice = 'Max price is required';
      } else if (parseFloat(fare.maxPrice) <= 0) {
        fareErrors.maxPrice = 'Max price must be greater than 0';
      } else if (fare.minPrice && parseFloat(fare.maxPrice) <= parseFloat(fare.minPrice)) {
        fareErrors.maxPrice = 'Max price must be greater than min price';
      }

      // Add validation for fareType
      if (!fare.fareType) {
        fareErrors.fareType = 'Fare type is required';
      }

      if (Object.keys(fareErrors).length > 0) {
        errors[`seatClassFare_${index}`] = fareErrors;
      }
    });

    return errors;
  };
  const validateForm = () => {
    let allErrors = {};

    // Validate basic fields
    Object.keys(formData).forEach(key => {
      if (key !== 'seatClassFares') {
        const fieldErrors = validateField(key, formData[key], formData);
        allErrors = { ...allErrors, ...fieldErrors };
      }
    });

    // Validate route ID - must be a valid route ID from the backend
    if (!routeId) {
      allErrors.routeId = 'No valid route exists between the selected airports';
    } else if (typeof routeId === 'string' && routeId.startsWith('manual-')) {
      // This should never happen now, but just in case there's old code still using it
      allErrors.routeId = 'Only established routes are allowed. Please select airports with a valid route.';
    }

    // Validate seat class fares
    const fareErrors = validateSeatClassFares();
    allErrors = { ...allErrors, ...fareErrors };

    return allErrors;
  };

  // Early returns for loading and critical errors
  if (loading) { // Show loading spinner during initial load
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !airports.length && !benefits.length && !aircraft.length) { // Only show error screen for critical initial data loading errors
    return (
      <div className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Failed to Load Initial Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchInitialData}>
              Retry Loading
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Filtered airport lists for search bars (must be before return)
  const filteredOrigins = originSearch
    ? airports.filter(a => a.name.toLowerCase().includes(originSearch.toLowerCase()) || a.code.toLowerCase().includes(originSearch.toLowerCase()))
    : airports;
  const filteredDestinations = destinationSearch ? airports.filter(a => a.name.toLowerCase().includes(destinationSearch.toLowerCase()) || a.code.toLowerCase().includes(destinationSearch.toLowerCase()))
    : airports;

  // UI: Flight Information first, then split section (seat map left, fare classes right)
  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Flight</h1>
      </div>

      {/* Enhanced error display */}
      {submitError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Creating Flight</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-3">
              <p>{submitError}</p>
              
              {detailedError && (
                <Collapsible open={showErrorDetails} onOpenChange={setShowErrorDetails}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto p-0 text-sm text-destructive hover:text-destructive/80"
                    >
                      <span className="flex items-center gap-1">
                        {showErrorDetails ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {showErrorDetails ? 'Hide' : 'Show'} technical details
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Error Details:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(detailedError, null, 2));
                            }}
                            className="h-auto p-1 text-xs"
                            title="Copy error details"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="grid gap-2 text-xs">
                          {detailedError.status && (
                            <div>
                              <span className="font-medium">Status:</span> {detailedError.status} {detailedError.statusText}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Endpoint:</span> {detailedError.method} {detailedError.endpoint}
                          </div>
                          <div>
                            <span className="font-medium">Timestamp:</span> {new Date(detailedError.timestamp).toLocaleString()}
                          </div>
                          {detailedError.validationErrors && (
                            <div>
                              <span className="font-medium">Validation Errors:</span>
                              <pre className="mt-1 whitespace-pre-wrap text-xs">
                                {JSON.stringify(detailedError.validationErrors, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 rounded border bg-background p-2">
                          <div className="font-medium text-xs mb-1">Full Error Response:</div>
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(detailedError, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              
              <div className="text-xs text-muted-foreground">
                If this error persists, please contact support with the technical details above.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Flight Information</CardTitle>
            <CardDescription>Enter the basic details for this flight</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2" data-error={!!fieldErrors.code}>
                <Label htmlFor="code">Flight Code</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="Enter flight code (e.g. BA123)"
                  className={fieldErrors.code ? "border-destructive" : ""}
                />
                {fieldErrors.code && (
                  <p className="text-sm text-destructive">{fieldErrors.code}</p>
                )}
              </div>

              <div className="space-y-2" data-error={!!fieldErrors.aircraftId}>
                <Label htmlFor="aircraftId">Aircraft</Label>
                <Select
                  value={formData.aircraftId}
                  onValueChange={(value) => handleInputChange({
                    target: { name: 'aircraftId', value }
                  })}
                >
                  <SelectTrigger className={fieldErrors.aircraftId ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select aircraft" />
                  </SelectTrigger>
                  <SelectContent>
                    {aircraft.map(ac => (
                      <SelectItem key={ac.id} value={ac.id}>
                        {ac.code} - {ac.aircraftType.model} ({ac.aircraftType.manufacturer})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.aircraftId && <p className="text-sm text-destructive">{fieldErrors.aircraftId}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2" data-error={!!fieldErrors.originId}>
                <Label htmlFor="originId">Origin Airport</Label>
                {selectedOriginAirport ? (
                  <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                    <span>{selectedOriginAirport.code} - {selectedOriginAirport.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOriginAirport(null);
                        setFormData(prev => ({ ...prev, originId: '' }));
                        setOriginSearch('');
                        setOriginDropdownOpen(true);
                      }}
                      title="Change airport"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      type="text"
                      id="originSearch"
                      placeholder="Search origin airport..."
                      value={originSearch}
                      onChange={e => { setOriginSearch(e.target.value); setOriginDropdownOpen(true); }}
                      onFocus={() => setOriginDropdownOpen(true)}
                      ref={originInputRef}
                      className={fieldErrors.originId ? "border-destructive" : ""}
                      autoComplete="off"
                    />
                    {originDropdownOpen && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-popover p-1 shadow-md" ref={originDropdownRef}>
                        <ScrollArea className="h-full max-h-[200px]">
                          {filteredOrigins.map(airport => (
                            <div
                              key={airport.id}
                              className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={() => {
                                setSelectedOriginAirport(airport);
                                setFormData(prev => ({ ...prev, originId: airport.id }));
                                setOriginSearch('');
                                setOriginDropdownOpen(false);
                              }}
                            >
                              {airport.code} - {airport.name}
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </>
                )}
                {fieldErrors.originId && <p className="text-sm text-destructive">{fieldErrors.originId}</p>}
              </div>
              
              <div className="space-y-2" data-error={!!fieldErrors.destinationId}>
                <Label htmlFor="destinationId">Destination Airport</Label>
                {selectedDestinationAirport ? (
                  <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                    <span>{selectedDestinationAirport.code} - {selectedDestinationAirport.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDestinationAirport(null);
                        setFormData(prev => ({ ...prev, destinationId: '' }));
                        setDestinationSearch('');
                        setDestinationDropdownOpen(true);
                      }}
                      title="Change airport"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      type="text"
                      id="destinationSearch"
                      placeholder="Search destination airport..."
                      value={destinationSearch}
                      onChange={e => { setDestinationSearch(e.target.value); setDestinationDropdownOpen(true); }}
                      onFocus={() => setDestinationDropdownOpen(true)}
                      ref={destinationInputRef}
                      className={fieldErrors.destinationId ? "border-destructive" : ""}
                      autoComplete="off"
                    />
                    {destinationDropdownOpen && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-popover p-1 shadow-md" ref={destinationDropdownRef}>
                        <ScrollArea className="h-full max-h-[200px]">
                          {filteredDestinations.map(airport => (
                            <div
                              key={airport.id}
                              className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={() => {
                                setSelectedDestinationAirport(airport);
                                setFormData(prev => ({ ...prev, destinationId: airport.id }));
                                setDestinationSearch('');
                                setDestinationDropdownOpen(false);
                              }}
                            >
                              {airport.code} - {airport.name}
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </>
                )}
                {fieldErrors.destinationId && <p className="text-sm text-destructive">{fieldErrors.destinationId}</p>}
              </div>
            </div>

            {/* Route Duration Display */}
            {(selectedOriginAirport && selectedDestinationAirport) && (
              <div className="space-y-2" data-error={!!fieldErrors.routeId}>
                <Label>Route Information</Label>
                <div className={`flex items-center gap-2 rounded-md border p-3 ${fieldErrors.routeId ? "border-destructive" : ""}`}>
                  {durationLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm italic">Retrieving route information...</span>
                    </div>
                  ) : routeId && routeDuration ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 font-medium text-emerald-600">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {Math.floor(routeDuration / 60)}h {Math.round(routeDuration % 60)}m</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <CheckCircle className="mr-1 inline-block h-3 w-3" />
                        Route established between airports
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">No route found between these airports.</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Please select airports that have an established route between them.
                      </div>
                    </div>
                  )}
                </div>
                {fieldErrors.routeId && <p className="text-sm text-destructive">{fieldErrors.routeId}</p>}
              </div>
            )}            <div className="space-y-2" data-error={!!fieldErrors.departureTime}>
              <Label htmlFor="departureTime">Departure Date & Time</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Date (UTC)</Label>
                  <DatePicker 
                    date={formData.departureTime ? (() => {
                      // Create a date that represents the UTC date as local date for the picker
                      const utcDate = new Date(formData.departureTime);
                      return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
                    })() : undefined}
                    onSelect={(date) => {
                      if (date) {
                        // Treat the selected date as UTC date
                        // Create a new Date object with UTC year, month, day
                        const utcYear = date.getFullYear();
                        const utcMonth = date.getMonth();
                        const utcDay = date.getDate();
                        
                        // Create target date in UTC
                        const targetDate = new Date();
                        targetDate.setUTCFullYear(utcYear, utcMonth, utcDay);
                        
                        if (formData.departureTime) {
                          // Preserve existing UTC time components
                          const currentDateTime = new Date(formData.departureTime);
                          targetDate.setUTCHours(
                            currentDateTime.getUTCHours(),
                            currentDateTime.getUTCMinutes(),
                            0,
                            0
                          );
                        } else {
                          // Set default time to 09:00 UTC
                          targetDate.setUTCHours(9, 0, 0, 0);
                        }
                        
                        // Store as UTC ISO string (admin works in UTC)
                        const utcISOString = targetDate.toISOString();
                        
                        handleInputChange({
                          target: {
                            name: 'departureTime',
                            value: utcISOString
                          }
                        });
                      }
                    }}
                    placeholder="Select departure date"
                    className={fieldErrors.departureTime ? "border-destructive" : ""}
                    disabledDates={(date) => {
                      // Disable dates before today
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return date < today
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Time (UTC)</Label>
                  <Input
                    type="time"
                    value={formData.departureTime ? (() => {
                      // Extract UTC time components directly without timezone conversion
                      const utcDate = new Date(formData.departureTime);
                      const hours = String(utcDate.getUTCHours()).padStart(2, '0');
                      const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
                      return `${hours}:${minutes}`;
                    })() : '09:00'}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [hours, minutes] = e.target.value.split(':');
                        
                        // Get the current date part (preserve the selected date)
                        let targetDate;
                        if (formData.departureTime) {
                          targetDate = new Date(formData.departureTime);
                        } else {
                          // If no date is set yet, use today
                          targetDate = new Date();
                        }
                        
                        // Set the time components in UTC
                        targetDate.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                        
                        // Store as UTC ISO string (admin works in UTC)
                        const utcISOString = targetDate.toISOString();
                        
                        handleInputChange({
                          target: {
                            name: 'departureTime',
                            value: utcISOString
                          }
                        });
                      }
                    }}
                    className={fieldErrors.departureTime ? "border-destructive" : ""}
                    step="300"
                  />
                </div>
              </div>
              {fieldErrors.departureTime && <p className="text-sm text-destructive">{fieldErrors.departureTime}</p>}
            </div>

            {/* Estimated Arrival Time Display */}
            {formData.departureTime && routeDuration && (
              <div className="space-y-2">
                <Label>Estimated Arrival Time (UTC)</Label>
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-700">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {(() => {
                      const arrivalTime = calculateEstimatedArrivalTime();
                      if (arrivalTime) {
                        const arrivalDate = new Date(arrivalTime);
                        // Display arrival time in UTC for admin
                        const year = arrivalDate.getUTCFullYear();
                        const month = arrivalDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
                        const day = arrivalDate.getUTCDate();
                        const hours = String(arrivalDate.getUTCHours()).padStart(2, '0');
                        const minutes = String(arrivalDate.getUTCMinutes()).padStart(2, '0');
                        
                        return `${month} ${day}, ${year} ${hours}:${minutes} UTC`;
                      }
                      return 'Unable to calculate arrival time';
                    })()}
                  </span>
                  <span className="text-xs italic text-amber-600">
                    (Based on estimated flight duration: {Math.floor(routeDuration / 60)}h {Math.round(routeDuration % 60)}m)
                  </span>
                </div>
              </div>
            )}

            {/* Timezone Information Display */}
            {formData.departureTime && selectedOriginAirport && selectedDestinationAirport && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Timezone Information
                </Label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {(() => {
                    const timezoneDisplay = getMultiTimezoneDisplay(
                      formData.departureTime,
                      selectedOriginAirport.timezone || 'UTC',
                      selectedDestinationAirport.timezone || 'UTC'
                    );
                    
                    return (
                      <>
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                          <div className="text-xs font-medium text-blue-800 mb-1">Admin Time (UTC)</div>
                          <div className="text-sm font-semibold text-blue-900">{timezoneDisplay.utc.time}</div>
                          <div className="text-xs text-blue-700">{timezoneDisplay.utc.date}</div>
                        </div>
                        
                        <div className="rounded-md border border-green-200 bg-green-50 p-3">
                          <div className="text-xs font-medium text-green-800 mb-1">
                            {selectedOriginAirport.city} Time
                          </div>
                          <div className="text-sm font-semibold text-green-900">{timezoneDisplay.origin.time}</div>
                          <div className="text-xs text-green-700">{timezoneDisplay.origin.date}</div>
                        </div>
                        
                        <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
                          <div className="text-xs font-medium text-purple-800 mb-1">
                            {selectedDestinationAirport.city} Time
                          </div>
                          <div className="text-sm font-semibold text-purple-900">{timezoneDisplay.destination.time}</div>
                          <div className="text-xs text-purple-700">{timezoneDisplay.destination.date}</div>
                        </div>
                        
                        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                          <div className="text-xs font-medium text-gray-800 mb-1">Your Local Time</div>
                          <div className="text-sm font-semibold text-gray-900">{timezoneDisplay.user.time}</div>
                          <div className="text-xs text-gray-700">{timezoneDisplay.user.date}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  ℹ️ Admin sets flight times in UTC. Times are automatically displayed in local timezones for passengers.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Aircraft Seat Map</CardTitle>
              <CardDescription>View seat sections for the selected aircraft</CardDescription>
            </CardHeader>
            <CardContent>
              {renderSeatSections()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seat Class Fares</CardTitle>
              <CardDescription>Configure pricing for each seat class</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.seatClassFares.map((fare, index) => (
                <div 
                  key={index} 
                  className="rounded-md border p-4 shadow-sm" 
                  style={{ borderLeft: `6px solid ${FARE_COLORS[index % FARE_COLORS.length]}` }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-medium" style={{ color: FARE_COLORS[index % FARE_COLORS.length] }}>
                      {fare.seatClassName.charAt(0).toUpperCase() + fare.seatClassName.slice(1)} Class
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-slate-100">
                        Type: {fare.fareType?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {aircraftSeatSections[fare.seatClassName]?.length || 0} seats
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-2">
                      <Label htmlFor={`fare-name-${index}`}>Fare Name</Label>
                      <Input
                        type="text"
                        id={`fare-name-${index}`}
                        name={`seatClassFares.${index}.name`}
                        value={fare.name}
                        onChange={e => handleSeatClassFareChange(index, 'name', e.target.value)}
                        className={fieldErrors[`seatClassFare_${index}`]?.name ? "border-destructive" : ""}
                        required
                      />
                      {fieldErrors[`seatClassFare_${index}`]?.name && 
                        <p className="text-sm text-destructive">{fieldErrors[`seatClassFare_${index}`]?.name}</p>
                      }
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor={`fare-minPrice-${index}`}>Min Price</Label>
                        <Input
                          type="number"
                          id={`fare-minPrice-${index}`}
                          name={`seatClassFares.${index}.minPrice`}
                          value={fare.minPrice}
                          onChange={e => handleSeatClassFareChange(index, 'minPrice', e.target.value)}
                          className={fieldErrors[`seatClassFare_${index}`]?.minPrice ? "border-destructive" : ""}
                          min="0"
                          step="0.01"
                          required
                        />
                        {fieldErrors[`seatClassFare_${index}`]?.minPrice && 
                          <p className="text-sm text-destructive">{fieldErrors[`seatClassFare_${index}`]?.minPrice}</p>
                        }
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`fare-maxPrice-${index}`}>Max Price</Label>
                        <Input
                          type="number"
                          id={`fare-maxPrice-${index}`}
                          name={`seatClassFares.${index}.maxPrice`}
                          value={fare.maxPrice}
                          onChange={e => handleSeatClassFareChange(index, 'maxPrice', e.target.value)}
                          className={fieldErrors[`seatClassFare_${index}`]?.maxPrice ? "border-destructive" : ""}
                          min="0"
                          step="0.01"
                          required
                        />
                        {fieldErrors[`seatClassFare_${index}`]?.maxPrice && 
                          <p className="text-sm text-destructive">{fieldErrors[`seatClassFare_${index}`]?.maxPrice}</p>
                        }
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label>Benefits</Label>
                      <div className="relative">
                        {/* Selected benefits as tags */}
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {fare.benefits.map(benefitId => {
                            const benefit = benefits.find(b => b.id === benefitId);
                            if (!benefit) return null;
                            return (
                              <Badge key={benefitId} variant="secondary" className="flex items-center gap-1">
                                {benefit.icon && <span>{benefit.icon}</span>}
                                {benefit.name}
                                <X 
                                  className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={() => handleBenefitChange(index, benefitId, false)}
                                />
                              </Badge>
                            );
                          })}
                          {fare.benefits.length === 0 && (
                            <span className="text-sm text-muted-foreground italic">No benefits selected</span>
                          )}
                        </div>

                        {/* Benefit search */}
                        {activeBenefitSearchIndex === index ? (
                          <div className="relative">
                            <div className="flex">
                              <Input
                                type="text"
                                placeholder="Search benefits..."
                                value={benefitSearch}
                                onChange={e => setBenefitSearch(e.target.value)}
                                onBlur={(e) => {
                                  // Only close if not clicking on a result
                                  if (!e.relatedTarget || !benefitDropdownRef.current?.contains(e.relatedTarget)) {
                                    setTimeout(() => {
                                      setBenefitDropdownOpen(false);
                                      setActiveBenefitSearchIndex(null);
                                      setBenefitSearch('');
                                    }, 200);
                                  }
                                }}
                                autoFocus
                                autoComplete="off"
                                className="w-full"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="ml-1"
                                onClick={() => {
                                  setBenefitDropdownOpen(false);
                                  setActiveBenefitSearchIndex(null);
                                  setBenefitSearch('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {benefitSearchResults.length > 0 && (
                              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-input bg-popover shadow-md" ref={benefitDropdownRef}>
                                <Command>
                                  <CommandList>
                                    {benefitSearchResults.map(b => (
                                      <CommandItem
                                        key={b.id}
                                        onSelect={() => {
                                          handleBenefitChange(index, b.id, true);
                                          setBenefitSearch('');
                                        }}
                                        className="flex items-center cursor-pointer"
                                      >
                                        {b.icon && <span className="mr-2">{b.icon}</span>}
                                        {b.name}
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </Command>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveBenefitSearchIndex(index);
                              setBenefitDropdownOpen(true);
                              setBenefitSearch('');
                            }}
                            className="w-full flex justify-center items-center"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Benefit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/flights')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : 'Create Flight'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateFlight;