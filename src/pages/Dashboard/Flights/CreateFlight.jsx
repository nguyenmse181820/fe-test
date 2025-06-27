import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import styles from './CreateFlight.module.css';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';

// Aircraft service base URL
const AIRCRAFT_SERVICE_URL = `${import.meta.env.VITE_API_GATEWAY || 'http://localhost:8080'}/air-craft/api/v1/public`;

// Predefined color palette for fares (up to 15)
const FARE_COLORS = [
  '#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ff8a65', '#a1887f', '#90a4ae', '#f06292',
  '#7986cb', '#aed581', '#fff176', '#9575cd', '#4fc3f7'
];

const CreateFlight = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
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

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch airports without pagination
      const airportsResponse = await axiosInstance.get('/flight-service/api/v1/airports');
      setAirports(airportsResponse.data.data.content);

      // Fetch benefits without pagination
      const benefitsResponse = await axiosInstance.get('/flight-service/api/v1/benefits');
      setBenefits(benefitsResponse.data.data.content);

      // Fetch aircraft without pagination
      const aircraftResponse = await axiosInstance.get('/air-craft/api/v1/public/aircraft-active');
      if (aircraftResponse.data && aircraftResponse.data.data) {
        setAircraft(aircraftResponse.data.data);
      } else {
        console.error('Unexpected aircraft response structure:', aircraftResponse.data);
        setAircraft([]);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err.response?.data?.message || 'Failed to fetch initial data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch route duration between airports
  const fetchRouteDuration = async (originId, destinationId) => {
    if (!originId || !destinationId) {
      setRouteDuration(null);
      return;
    }

    try {
      setDurationLoading(true);
      const response = await axiosInstance.get(`/flight-service/api/v1/fs/routes/duration`, {
        params: {
          originAirportId: originId,
          destinationAirportId: destinationId
        }
      });
      
      if (response.data !== null && response.data !== undefined) {
        setRouteDuration(response.data);
      } else {
        setRouteDuration(null);
      }
    } catch (err) {
      console.error('Error fetching route duration:', err);
      setRouteDuration(null);
    } finally {
      setDurationLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);
  
  // Fetch route duration when both airports are selected
  useEffect(() => {
    if (selectedOriginAirport && selectedDestinationAirport) {
      fetchRouteDuration(selectedOriginAirport.id, selectedDestinationAirport.id);
    } else {
      setRouteDuration(null);
    }
  }, [selectedOriginAirport, selectedDestinationAirport]);

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
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // When aircraft is selected, find and set its type data and fetch seat sections
      if (name === 'aircraftId') {
        const selectedAircraft = aircraft.find(a => a.id === value);
        if (selectedAircraft) {
          console.log('Selected aircraft:', selectedAircraft); // Debug log
          setSelectedAircraftType(selectedAircraft.aircraftType);
          // Fetch seat sections from flight service
          fetchAircraftSeatSections(value);
        } else {
          console.log('Aircraft not found for id:', value); // Debug log
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

  const fetchAircraftSeatSections = async (aircraftId) => {
    try {
      console.log('Fetching seat sections for aircraft:', aircraftId);
      const response = await axiosInstance.get(`/flight-service/api/v1/fs/aircraft/${aircraftId}/seat-sections`);
      console.log('Seat sections response:', response.data);
      const seatSections = response.data.seatSections;
      setAircraftSeatSections(seatSections);      // Initialize seat class fares based on available seat sections
      const initialSeatClassFares = Object.entries(seatSections)
        .filter(([sectionName, seats]) => seats && seats.length > 0) // Only include sections with actual seats
        .map(([sectionName, seats]) => ({
          seatClassName: sectionName,
          name: sectionName.charAt(0).toUpperCase() + sectionName.slice(1), // Capitalize first letter
          minPrice: '',
          maxPrice: '',
          benefits: []
        }));

      console.log('Initial seat class fares:', initialSeatClassFares);

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
      return <p>Please select an aircraft to see available seat sections.</p>;
    }

    // Filter out sections with no seats
    const validSections = Object.entries(aircraftSeatSections).filter(([sectionName, seats]) => seats && seats.length > 0);

    if (validSections.length === 0) {
      return <p>No valid seat sections found for this aircraft.</p>;
    }

    return (
      <div className={styles.seatSectionsInfo}>
        <h3>Aircraft Seat Sections</h3>
        {validSections.map(([sectionName, seats]) => (
          <div key={sectionName} className={styles.seatSection}>
            <h4>{sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h4>
            <p>{seats.length} seats: {seats.slice(0, 5).join(', ')}{seats.length > 5 ? '...' : ''}</p>
          </div>
        ))}
      </div>
    );
  };

  // Calculate estimated arrival time
  const calculateEstimatedArrivalTime = () => {
    if (!formData.departureTime || !routeDuration) {
      return null;
    }
    
    const departureDate = new Date(formData.departureTime);
    const arrivalDate = new Date(departureDate.getTime() + (routeDuration * 60 * 1000)); // routeDuration is in minutes
    
    return arrivalDate.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:MM for datetime-local input
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setSubmitError(null);
    setFieldErrors({});

    // Validate all fields
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      // Scroll to first error
      const firstErrorElement = document.querySelector('.error');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setLoading(true);

      console.log('Submitting form data:', formData);

      // Format the request data for the new API
      const requestData = {
        ...formData,
        seatClassFares: formData.seatClassFares.map(fare => ({
          ...fare,
          minPrice: parseFloat(fare.minPrice),
          maxPrice: parseFloat(fare.maxPrice)
        }))
      };

      const response = await axiosInstance.post('/flight-service/api/v1/fs/flights', requestData);

      // Accept both 200 and 201, or if response contains an id
      if ((response.status === 201 || response.status === 200) && response.data && (response.data.id || (response.data.data && response.data.data.id))) {
        navigate('/dashboard/flights');
      } else {
        throw new Error(response.data?.message || 'Failed to create flight');
      }
    } catch (err) {
      console.error('Error creating flight:', err);

      // Handle different types of errors
      if (err.response?.status === 400) {
        // Bad request - show specific error message
        const errorMessage = err.response.data?.message || 'Invalid data provided';
        setSubmitError(errorMessage);
      } else if (err.response?.status >= 500) {
        // Server error
        setSubmitError('Server error occurred. Please try again later.');
      } else if (err.code === 'NETWORK_ERROR') {
        // Network error
        setSubmitError('Network error. Please check your connection and try again.');
      } else {
        // Generic error
        setSubmitError(err.message || 'Failed to create flight. Please try again.');
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
      } if (benefitDropdownOpen && benefitDropdownRef.current && !benefitDropdownRef.current.contains(event.target)) {
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
          const departureDate = new Date(value);
          const now = new Date();
          if (departureDate <= now) {
            errors.departureTime = 'Departure time must be in the future';
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

    // Validate seat class fares
    const fareErrors = validateSeatClassFares();
    allErrors = { ...allErrors, ...fareErrors };

    return allErrors;
  };

  // Helper component for displaying field errors
  const FieldError = ({ error }) => {
    if (!error) return null;
    return <span className={styles.fieldError}>{error}</span>;
  };

  // Early returns for loading and critical errors
  if (loading && !formData.code) { // Only show loading spinner for initial load
    return (
      <div className={styles.container}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error && !airports.length && !benefits.length && !aircraft.length) { // Only show error screen for critical initial data loading errors
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Failed to Load Initial Data</h2>
          <p>{error}</p>
          <button onClick={fetchInitialData} className={styles.retryButton}>
            Retry Loading
          </button>
        </div>
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
    <div className={styles.container}>
      <h1 className={styles.header}>Create New Flight</h1>

      {/* Global submit error */}
      {submitError && (
        <div className={styles.submitError}>
          <strong>Error:</strong> {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formPanel}>
        <div className={styles.section}>
          <h2>Flight Information</h2>
          <div className={styles.grid}>            <div className={styles.formGroup}>
            <label htmlFor="code">Flight Code</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              required
              className={`${styles.input} ${fieldErrors.code ? styles.inputError : ''}`}
              placeholder="Enter flight code"
            />
            {fieldErrors.code && <span className={styles.fieldError}>{fieldErrors.code}</span>}
          </div>            <div className={styles.formGroup}>
              <label htmlFor="aircraftId">Aircraft</label>
              <select
                id="aircraftId"
                name="aircraftId"
                value={formData.aircraftId}
                onChange={handleInputChange}
                className={`${styles.select} ${fieldErrors.aircraftId ? styles.inputError : ''}`}
                required
              >
                <option value="">Select aircraft</option>
                {aircraft.map(ac => (
                  <option key={ac.id} value={ac.id}>
                    {ac.code} - {ac.aircraftType.model} ({ac.aircraftType.manufacturer})
                  </option>
                ))}
              </select>
              {fieldErrors.aircraftId && <span className={styles.fieldError}>{fieldErrors.aircraftId}</span>}
            </div>            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label htmlFor="originId">Origin Airport</label>
              {selectedOriginAirport ? (
                <div className={styles.selectedAirport}>
                  <span>{selectedOriginAirport.code} - {selectedOriginAirport.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOriginAirport(null);
                      setFormData(prev => ({ ...prev, originId: '' }));
                      setOriginSearch('');
                      setOriginDropdownOpen(true);
                    }}
                    className={styles.clearSelection}
                    title="Change airport"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    id="originSearch"
                    placeholder="Search origin airport..."
                    value={originSearch}
                    onChange={e => { setOriginSearch(e.target.value); setOriginDropdownOpen(true); }}
                    onFocus={() => setOriginDropdownOpen(true)}
                    ref={originInputRef}
                    className={`${styles.input} ${fieldErrors.originId ? styles.inputError : ''}`}
                    autoComplete="off"
                  />
                  {originDropdownOpen && (
                    <div className={styles.airportDropdown} ref={originDropdownRef}>
                      {filteredOrigins.map(airport => (
                        <div
                          key={airport.id}
                          className={styles.airportDropdownItem}
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
                    </div>
                  )}
                </>
              )}
              {fieldErrors.originId && <span className={styles.fieldError}>{fieldErrors.originId}</span>}
            </div>            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label htmlFor="destinationId">Destination Airport</label>
              {selectedDestinationAirport ? (
                <div className={styles.selectedAirport}>
                  <span>{selectedDestinationAirport.code} - {selectedDestinationAirport.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDestinationAirport(null);
                      setFormData(prev => ({ ...prev, destinationId: '' }));
                      setDestinationSearch('');
                      setDestinationDropdownOpen(true);
                    }}
                    className={styles.clearSelection}
                    title="Change airport"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    id="destinationSearch"
                    placeholder="Search destination airport..."
                    value={destinationSearch}
                    onChange={e => { setDestinationSearch(e.target.value); setDestinationDropdownOpen(true); }}
                    onFocus={() => setDestinationDropdownOpen(true)}
                    ref={destinationInputRef}
                    className={`${styles.input} ${fieldErrors.destinationId ? styles.inputError : ''}`}
                    autoComplete="off"
                  />
                  {destinationDropdownOpen && (
                    <div className={styles.airportDropdown} ref={destinationDropdownRef}>
                      {filteredDestinations.map(airport => (
                        <div
                          key={airport.id}
                          className={styles.airportDropdownItem}
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
                    </div>
                  )}
                </>
              )}
              {fieldErrors.destinationId && <span className={styles.fieldError}>{fieldErrors.destinationId}</span>}
            </div>

            {/* Route Duration Display */}
            {(selectedOriginAirport && selectedDestinationAirport) && (
              <div className={styles.formGroup}>
                <label>Estimated Flight Duration</label>
                <div className={styles.durationDisplay}>
                  {durationLoading ? (
                    <span className={styles.durationLoading}>Calculating duration...</span>
                  ) : routeDuration ? (
                    <span className={styles.durationValue}>
                      {Math.floor(routeDuration / 60)}h {Math.round(routeDuration % 60)}m
                    </span>
                  ) : (
                    <span className={styles.durationNotFound}>
                      Duration not available - Create a route first
                    </span>
                  )}
                </div>
              </div>
            )}            <div className={styles.formGroup}>
              <label htmlFor="departureTime">Departure Time</label>
              <input
                type="datetime-local"
                id="departureTime"
                name="departureTime" value={formData.departureTime}
                onChange={handleInputChange}
                required
                className={`${styles.input} ${fieldErrors.departureTime ? styles.inputError : ''}`}
              />
              {fieldErrors.departureTime && <span className={styles.fieldError}>{fieldErrors.departureTime}</span>}
            </div>            {/* Estimated Arrival Time Display */}
            {formData.departureTime && routeDuration && (
              <div className={styles.formGroup}>
                <label>Estimated Arrival Time</label>
                <div className={styles.arrivalTimeDisplay}>
                  <span className={styles.arrivalTimeValue}>
                    {new Date(calculateEstimatedArrivalTime()).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                  <span className={styles.arrivalTimeNote}>
                    (Based on estimated flight duration)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div><div className={styles.splitSection}>
          <div className={styles.seatMapPanel}>
            {renderSeatSections()}
          </div>
          <div className={styles.fareClassesPanel}>
            <h2>Seat Class Fares</h2>
            {formData.seatClassFares.map((fare, index) => (
              <div key={index} className={styles.fareClass} style={{ borderLeft: `6px solid ${FARE_COLORS[index % FARE_COLORS.length]}` }}>
                <div className={styles.fareHeader}>
                  <h3 style={{ color: FARE_COLORS[index % FARE_COLORS.length] }}>
                    {fare.seatClassName.charAt(0).toUpperCase() + fare.seatClassName.slice(1)} Class
                  </h3>
                  <span className={styles.seatCount}>
                    {aircraftSeatSections[fare.seatClassName]?.length || 0} seats
                  </span>
                </div>
                <div className={styles.grid}>
                  <div className={styles.formGroup}>
                    <label htmlFor={`fare-name-${index}`}>Fare Name</label>
                    <input
                      type="text"
                      id={`fare-name-${index}`} name={`seatClassFares.${index}.name`}
                      value={fare.name}
                      onChange={e => handleSeatClassFareChange(index, 'name', e.target.value)}
                      className={`${styles.input} ${fieldErrors[`seatClassFare_${index}`]?.name ? styles.inputError : ''}`}
                      required
                    />
                    {fieldErrors[`seatClassFare_${index}`]?.name && <span className={styles.fieldError}>{fieldErrors[`seatClassFare_${index}`]?.name}</span>}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor={`fare-minPrice-${index}`}>Min Price</label>
                    <input
                      type="number"
                      id={`fare-minPrice-${index}`} name={`seatClassFares.${index}.minPrice`}
                      value={fare.minPrice}
                      onChange={e => handleSeatClassFareChange(index, 'minPrice', e.target.value)}
                      className={`${styles.input} ${fieldErrors[`seatClassFare_${index}`]?.minPrice ? styles.inputError : ''}`}
                      min="0"
                      step="0.01"
                      required
                    />
                    {fieldErrors[`seatClassFare_${index}`]?.minPrice && <span className={styles.fieldError}>{fieldErrors[`seatClassFare_${index}`]?.minPrice}</span>}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor={`fare-maxPrice-${index}`}>Max Price</label>
                    <input
                      type="number"
                      id={`fare-maxPrice-${index}`} name={`seatClassFares.${index}.maxPrice`}
                      value={fare.maxPrice}
                      onChange={e => handleSeatClassFareChange(index, 'maxPrice', e.target.value)}
                      className={`${styles.input} ${fieldErrors[`seatClassFare_${index}`]?.maxPrice ? styles.inputError : ''}`}
                      min="0"
                      step="0.01"
                      required
                    />
                    {fieldErrors[`seatClassFare_${index}`]?.maxPrice && <span className={styles.fieldError}>{fieldErrors[`seatClassFare_${index}`]?.maxPrice}</span>}
                  </div>                  <div className={styles.formGroup}>
                    <label>Benefits</label>
                    <div className={styles.benefitsList} style={{ position: 'relative' }}>
                      {/* Selected benefits as tags */}
                      <div className={styles.selectedBenefits}>
                        {fare.benefits.map(benefitId => {
                          const benefit = benefits.find(b => b.id === benefitId);
                          if (!benefit) return null;
                          return (
                            <span key={benefit.id} className={styles.benefitTag}>
                              {benefit.icon && <span style={{ marginRight: 6, fontSize: 18 }}>{benefit.icon}</span>}
                              {benefit.name}
                              <FaTimes
                                className={styles.benefitRemove}
                                onClick={() => handleBenefitChange(index, benefit.id, false)}
                                title="Remove"
                              />
                            </span>
                          );
                        })}
                        {fare.benefits.length === 0 && (
                          <span className={styles.noBenefitsText}>No benefits selected</span>
                        )}
                      </div>

                      {/* Add benefit button or search input */}
                      {activeBenefitSearchIndex === index ? (
                        <>
                          <input
                            type="text"
                            placeholder="Search benefits..."
                            value={benefitSearch}
                            onChange={e => setBenefitSearch(e.target.value)}
                            onBlur={() => {
                              // Delay closing to allow clicking on dropdown items
                              setTimeout(() => {
                                if (!benefitDropdownOpen) {
                                  setActiveBenefitSearchIndex(null);
                                  setBenefitSearch('');
                                }
                              }, 150);
                            }}
                            className={styles.benefitSearch}
                            autoFocus
                            autoComplete="off"
                          />
                          {benefitSearchResults.length > 0 && (
                            <div className={styles.benefitSearchResults} ref={benefitDropdownRef}>
                              {benefitSearchResults.map(b => (
                                <div
                                  key={b.id}
                                  className={styles.benefitSearchItem}
                                  onClick={() => {
                                    handleBenefitChange(index, b.id, true);
                                    setBenefitSearch('');
                                    setActiveBenefitSearchIndex(null);
                                    setBenefitDropdownOpen(false);
                                  }}
                                >
                                  {b.icon && <span style={{ marginRight: 6, fontSize: 18 }}>{b.icon}</span>}
                                  {b.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBenefitSearchIndex(index);
                            setBenefitDropdownOpen(true);
                            setBenefitSearch('');
                          }}
                          className={styles.addBenefitButton}
                        >
                          + Add Benefit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/flights')}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Flight'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateFlight;