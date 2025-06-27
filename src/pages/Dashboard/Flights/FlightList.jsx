import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import styles from './FlightList.module.css';

const FlightList = () => {
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('departureTime:desc');
    // Filter state (applied filters)
  const [appliedFilters, setAppliedFilters] = useState({
    code: '',
    origin: '',
    destination: '',
    status: '',
    departureTime: '' // Will be formatted as ISO string range
  });
  // Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [flightDetails, setFlightDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Search form state (input values)
  const [searchForm, setSearchForm] = useState({ 
    code: '', 
    origin: '', 
    destination: '', 
    status: '', 
    startDate: '',
    endDate: ''
  });
  const [showSearchBar, setShowSearchBar] = useState(false);

  const fetchFlightDetails = async (flightId) => {
    try {
      setDetailsLoading(true);
      setDetailsError(null);
      
      const response = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
      
      if (response.data) {
        setFlightDetails(response.data);
      } else {
        throw new Error('Failed to fetch flight details');
      }
    } catch (err) {
      setDetailsError(err.message || 'An error occurred while fetching flight details');
      console.error('Error fetching flight details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };
  const handleViewDetails = (flight) => {
    setSelectedFlight(flight);
    setDetailsModalOpen(true);
    fetchFlightDetails(flight.id);
  };

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      // Add pagination
      params.append('pageNo', currentPage);
      params.append('pageSize', pageSize);
      
      // Add sorting
      params.append('sortBy', sortBy);
        // Add filters (only non-empty values)
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) {
          if (key === 'departureTime' && value.includes(',')) {
            // Handle date range
            params.append(key, value);
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axiosInstance.get(`/flight-service/api/v1/fs/flights?${params.toString()}`);
      
      if (response.data.statusCode === 200) {
        const { content, totalElements, totalPages } = response.data.data;
        setFlights(content);
        setTotalElements(totalElements);
        setTotalPages(totalPages);
      } else {
        throw new Error('Failed to fetch flights');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching flights');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchFlights();
  }, [currentPage, pageSize, sortBy, appliedFilters]);

  const handleSort = (field) => {
    const [currentField, currentDirection] = sortBy.split(':');
    const newDirection = currentField === field && currentDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(`${field}:${newDirection}`);
  };
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (field, value) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = () => {
    // Convert search form to applied filters format
    const departureTime = searchForm.startDate && searchForm.endDate 
      ? `${new Date(searchForm.startDate).toISOString()},${new Date(searchForm.endDate).toISOString()}`
      : searchForm.startDate 
        ? `${new Date(searchForm.startDate).toISOString()},`
        : searchForm.endDate 
          ? `,${new Date(searchForm.endDate).toISOString()}`
          : '';

    setAppliedFilters({
      code: searchForm.code,
      origin: searchForm.origin,
      destination: searchForm.destination,
      status: searchForm.status,
      departureTime
    });
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchForm({
      code: '',
      origin: '',
      destination: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    setAppliedFilters({
      code: '',
      origin: '',
      destination: '',
      status: '',
      departureTime: ''
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };
  const handleQuery = () => {
    handleSearch();
  };

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };  const renderDetailsModal = () => {
    return (
      <Dialog
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setFlightDetails(null);
          setDetailsError(null);
        }}
        className="relative z-50"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        {/* Full-screen container to center the panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          {/* The actual dialog panel */}
          <DialogPanel className="mx-auto max-w-4xl rounded bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-xl font-semibold text-gray-900 mb-6">
              Flight Details
            </DialogTitle>
            
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className={styles.spinner}></div>
                <span className="ml-3">Loading flight details...</span>
              </div>
            ) : detailsError ? (
              <div className="text-red-600 py-4">
                <p>Error: {detailsError}</p>
              </div>
            ) : flightDetails ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Flight Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Flight Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <strong>Flight Code:</strong>
                      <span>{flightDetails.flightCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <strong>Status:</strong>
                      <span className="capitalize px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                        {flightDetails.status.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <strong>Duration:</strong>
                      <span>{formatDuration(flightDetails.flightDurationMinutes)}</span>
                    </div>
                  </div>
                </div>

                {/* Aircraft Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Aircraft</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <strong>Aircraft Code:</strong>
                      <span>{flightDetails.aircraft.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <strong>Model:</strong>
                      <span>{flightDetails.aircraft.model}</span>
                    </div>
                  </div>
                </div>

                {/* Origin Airport */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Origin</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <strong>Airport:</strong>
                      <span>{flightDetails.originAirport.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <strong>Code:</strong>
                      <span>{flightDetails.originAirport.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <strong>City:</strong>
                      <span>{flightDetails.originAirport.city}, {flightDetails.originAirport.country}</span>
                    </div>
                    <div className="flex justify-between">
                      <strong>Departure:</strong>
                      <span>{new Date(flightDetails.departureTime).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Destination Airport */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Destination</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <strong>Airport:</strong>
                      <span>{flightDetails.destinationAirport.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <strong>Code:</strong>
                      <span>{flightDetails.destinationAirport.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <strong>City:</strong>
                      <span>{flightDetails.destinationAirport.city}, {flightDetails.destinationAirport.country}</span>
                    </div>
                    <div className="flex justify-between">
                      <strong>Estimated Arrival:</strong>
                      <span>{new Date(flightDetails.estimatedArrivalTime).toLocaleString()}</span>
                    </div>
                    {flightDetails.actualArrivalTime && (
                      <div className="flex justify-between">
                        <strong>Actual Arrival:</strong>
                        <span>{new Date(flightDetails.actualArrivalTime).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seat Information - Commented out due to potential data inconsistency */}
                {/* Note: Seat availability may not reflect real-time updates immediately after bookings */}
                {false && (
                <div className="space-y-4 lg:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Seat Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">{flightDetails.totalSeats}</div>
                      <div className="text-sm text-gray-600">Total Seats</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-green-600">{flightDetails.remainingSeats}</div>
                      <div className="text-sm text-gray-600">Available Seats</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-red-600">{flightDetails.totalSeats - flightDetails.remainingSeats}</div>
                      <div className="text-sm text-gray-600">Occupied Seats</div>
                    </div>
                  </div>
                </div>
                )}

                {/* Available Fares */}
                {flightDetails.availableFares && flightDetails.availableFares.length > 0 && (
                  <div className="space-y-4 lg:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Available Fares</h3>
                    <div className="space-y-3">
                      {flightDetails.availableFares.map((fare, index) => (
                        <div key={fare.id} className="p-4 border rounded-lg bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-900">{fare.name}</h4>
                              <div className="mt-2 space-y-1 text-sm">
                                <div>Price Range: ${fare.minPrice} - ${fare.maxPrice}</div>
                                <div>Total Seats: {fare.totalSeats}</div>
                                {/* Available seats hidden due to potential data inconsistency */}
                                {/* <div>Available: {fare.remainingSeats}</div> */}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">
                                <strong>Seat Range:</strong>
                                <div className="mt-1 font-mono text-xs break-all">
                                  {fare.seatRange}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedFlight ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <strong>Code:</strong> 
                  <span>{selectedFlight.code}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Origin:</strong> 
                  <span>{typeof selectedFlight.origin === 'object' ? (selectedFlight.origin.code || selectedFlight.origin.name) : selectedFlight.origin}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Destination:</strong> 
                  <span>{typeof selectedFlight.destination === 'object' ? (selectedFlight.destination.code || selectedFlight.destination.name) : selectedFlight.destination}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Departure:</strong> 
                  <span>{new Date(selectedFlight.departureTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Arrival:</strong> 
                  <span>{new Date(selectedFlight.estimatedArrivalTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Duration:</strong> 
                  <span>{formatDuration(selectedFlight.flightDurationMinutes)}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Status:</strong> 
                  <span className="capitalize">{selectedFlight.status.replace(/_/g, ' ').toLowerCase()}</span>
                </div>
              </div>
            ) : (
              <div>No flight data available</div>
            )}
            
            <div className="mt-6 flex justify-end border-t pt-4">
              <button 
                onClick={() => {
                  setDetailsModalOpen(false);
                  setFlightDetails(null);
                  setDetailsError(null);
                }} 
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    );
  };

  // Add getSortIcon helper
  const getSortIcon = (field) => {
    const [currentField, currentDirection] = sortBy.split(':');
    if (currentField !== field) return '↕️';
    return currentDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading flights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button onClick={fetchFlights} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className={styles.container}>
      {renderDetailsModal()}
      
      <div className={styles.header}>
        <h1>Flight Management</h1>
        <div className="flex gap-2">
          <button 
            className={styles.createButton}
            onClick={() => navigate('/dashboard/flights/add')}
          >
            Create New Flight
          </button>
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={() => setShowSearchBar(!showSearchBar)}
          >
            {showSearchBar ? 'Hide Search' : 'Show Search'}
          </button>
        </div>
      </div>

      {showSearchBar && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              name="code"
              placeholder="Flight Code"
              value={searchForm.code}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="origin"
              placeholder="Origin Airport"
              value={searchForm.origin}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="destination"
              placeholder="Destination Airport"
              value={searchForm.destination}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              name="status"
              value={searchForm.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED_OPEN">Scheduled Open</option>
              <option value="SCHEDULED_CLOSED">Scheduled Closed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              type="datetime-local"
              placeholder="Start Date"
              value={searchForm.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="datetime-local"
              placeholder="End Date"
              value={searchForm.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              onClick={handleSearch}
            >
              Search
            </button>
            <button 
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500" 
              onClick={handleClearSearch}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('code')}>
                Flight Code {getSortIcon('code')}
              </th>
              <th onClick={() => handleSort('origin')}>
                Origin {getSortIcon('origin')}
              </th>
              <th onClick={() => handleSort('destination')}>
                Destination {getSortIcon('destination')}
              </th>
              <th onClick={() => handleSort('departureTime')}>
                Departure {getSortIcon('departureTime')}
              </th>
              <th onClick={() => handleSort('estimatedArrivalTime')}>
                Arrival {getSortIcon('estimatedArrivalTime')}
              </th>
              <th onClick={() => handleSort('flightDurationMinutes')}>
                Duration {getSortIcon('flightDurationMinutes')}
              </th>
              <th onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((flight) => (
              <tr key={flight.id}>
                <td>{flight.code}</td>
                <td>{typeof flight.origin === 'object' ? (flight.origin.code || flight.origin.name) : flight.origin}</td>
                <td>{typeof flight.destination === 'object' ? (flight.destination.code || flight.destination.name) : flight.destination}</td>
                <td>{new Date(flight.departureTime).toLocaleString()}</td>
                <td>{new Date(flight.estimatedArrivalTime).toLocaleString()}</td>
                <td>{formatDuration(flight.flightDurationMinutes)}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[flight.status.toLowerCase()]}`}>
                    {flight.status.replace(/_/g, ' ')}
                  </span>
                </td>                <td>
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => handleViewDetails(flight)}
                      className={styles.viewButton}
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/flights/${flight.id}/edit`)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.pageSizeSelector}>
          <label>Rows per page:</label>
          <select value={pageSize} onChange={handlePageSizeChange}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        
        <div className={styles.pageInfo}>
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalElements)} of {totalElements} entries
        </div>

        <div className={styles.pageButtons}>
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            First
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = currentPage <= 3 
              ? i + 1 
              : currentPage >= totalPages - 2 
                ? totalPages - 4 + i 
                : currentPage - 2 + i;
            
            if (pageNum > 0 && pageNum <= totalPages) {
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`${styles.pageButton} ${currentPage === pageNum ? styles.activePage : ''}`}
                >
                  {pageNum}
                </button>
              );
            }
            return null;
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.pageButton}
          >
            Next
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={styles.pageButton}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlightList;