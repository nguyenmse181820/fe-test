import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import { 
  formatTimeWithTimezone, 
  formatDateWithTimezone, 
  getMultiTimezoneDisplay, 
  getUserTimezone,
  getTimezoneAbbreviation,
  parseBackendDateTime
} from '../../../utils/timezone';
import { 
  AlertCircle, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Info,
  Loader2, 
  Plane, 
  Search, 
  SortAsc, 
  SortDesc, 
  X
} from 'lucide-react';

// Shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
      
      // This endpoint matches the one in FlightController.java
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
      <Dialog open={detailsModalOpen} onOpenChange={isOpen => {
        if (!isOpen) {
          setDetailsModalOpen(false);
          setFlightDetails(null);
          setDetailsError(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Flight Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected flight.
            </DialogDescription>
          </DialogHeader>
            
          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
              <span>Loading flight details...</span>
            </div>
          ) : detailsError ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <p>Error: {detailsError}</p>
              </div>
            </div>
          ) : flightDetails ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Flight Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Flight Information</h3>
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
                <h3 className="text-lg font-medium border-b pb-2">Aircraft</h3>
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
                <h3 className="text-lg font-medium border-b pb-2">Origin</h3>
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
                  <div className="space-y-2">
                    <strong>Departure:</strong>
                    {flightDetails.originAirport?.timezone ? (
                      <div className="ml-4 space-y-1 text-sm">
                        {(() => {
                          const timezones = getMultiTimezoneDisplay(
                            flightDetails.departureTime, 
                            flightDetails.originAirport.timezone, 
                            flightDetails.destinationAirport?.timezone || 'UTC'
                          );
                          return (
                            <>
                              <div className="font-medium">{timezones.user.label}: {timezones.user.time}</div>
                              <div className="text-gray-600">{timezones.utc.label}: {timezones.utc.time}</div>
                              <div className="text-gray-600">{timezones.origin.label}: {timezones.origin.time}</div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="ml-4 space-y-1 text-sm">
                        <div className="font-medium">Your time: {formatTimeWithTimezone(flightDetails.departureTime, getUserTimezone(), true)}</div>
                        <div className="text-gray-600">UTC: {formatTimeWithTimezone(flightDetails.departureTime, 'UTC', true)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Destination Airport */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Destination</h3>
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
                  <div className="space-y-2">
                    <strong>Estimated Arrival:</strong>
                    {flightDetails.destinationAirport?.timezone ? (
                      <div className="ml-4 space-y-1 text-sm">
                        {(() => {
                          const timezones = getMultiTimezoneDisplay(
                            flightDetails.estimatedArrivalTime, 
                            flightDetails.originAirport?.timezone || 'UTC', 
                            flightDetails.destinationAirport.timezone
                          );
                          return (
                            <>
                              <div className="font-medium">{timezones.user.label}: {timezones.user.time}</div>
                              <div className="text-gray-600">{timezones.utc.label}: {timezones.utc.time}</div>
                              <div className="text-gray-600">{timezones.destination.label}: {timezones.destination.time}</div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="ml-4 space-y-1 text-sm">
                        <div className="font-medium">Your time: {formatTimeWithTimezone(flightDetails.estimatedArrivalTime, getUserTimezone(), true)}</div>
                        <div className="text-gray-600">UTC: {formatTimeWithTimezone(flightDetails.estimatedArrivalTime, 'UTC', true)}</div>
                      </div>
                    )}
                  </div>
                  {flightDetails.actualArrivalTime && (
                    <div className="space-y-2">
                      <strong>Actual Arrival:</strong>
                      {flightDetails.destinationAirport?.timezone ? (
                        <div className="ml-4 space-y-1 text-sm">
                          {(() => {
                            const timezones = getMultiTimezoneDisplay(
                              flightDetails.actualArrivalTime, 
                              flightDetails.originAirport?.timezone || 'UTC', 
                              flightDetails.destinationAirport.timezone
                            );
                            return (
                              <>
                                <div className="font-medium">{timezones.user.label}: {timezones.user.time}</div>
                                <div className="text-gray-600">{timezones.utc.label}: {timezones.utc.time}</div>
                                <div className="text-gray-600">{timezones.destination.label}: {timezones.destination.time}</div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="ml-4 space-y-1 text-sm">
                          <div className="font-medium">Your time: {formatTimeWithTimezone(flightDetails.actualArrivalTime, getUserTimezone(), true)}</div>
                          <div className="text-gray-600">UTC: {formatTimeWithTimezone(flightDetails.actualArrivalTime, 'UTC', true)}</div>
                        </div>
                      )}
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
                  <h3 className="text-lg font-medium border-b pb-2">Available Fares</h3>
                  <div className="space-y-3">
                    {flightDetails.availableFares.map((fare, index) => (
                      <Card key={fare.id}>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium">{fare.name}</h4>
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
                        </CardContent>
                      </Card>
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
              <div className="space-y-2">
                <strong>Departure:</strong> 
                <div className="ml-4 space-y-1 text-sm">
                  <div className="font-medium">Your time: {formatTimeWithTimezone(selectedFlight.departureTime, getUserTimezone(), true)}</div>
                  <div className="text-gray-600">UTC: {formatTimeWithTimezone(selectedFlight.departureTime, 'UTC', true)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <strong>Arrival:</strong> 
                <div className="ml-4 space-y-1 text-sm">
                  <div className="font-medium">Your time: {formatTimeWithTimezone(selectedFlight.estimatedArrivalTime, getUserTimezone(), true)}</div>
                  <div className="text-gray-600">UTC: {formatTimeWithTimezone(selectedFlight.estimatedArrivalTime, 'UTC', true)}</div>
                </div>
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
            
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDetailsModalOpen(false);
                setFlightDetails(null);
                setDetailsError(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Add getSortIcon helper
  const getSortIcon = (field) => {
    const [currentField, currentDirection] = sortBy.split(':');
    if (currentField !== field) {
      return null;
    }
    return currentDirection === 'asc' ? (
      <SortAsc className="inline h-4 w-4 ml-1" />
    ) : (
      <SortDesc className="inline h-4 w-4 ml-1" />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading flights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-md p-6 my-8">
        <CardHeader>
          <div className="flex items-center justify-center text-red-600 mb-2">
            <AlertCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-center text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">{error}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={fetchFlights} variant="outline">
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }
  return (
    <div className="container mx-auto max-w-6xl p-6">
      {renderDetailsModal()}
      
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Flight Management</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/dashboard/flights/add')}
            className="gap-2"
          >
            <Plane className="h-4 w-4" />
            Create New Flight
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowSearchBar(!showSearchBar)}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            {showSearchBar ? 'Hide Search' : 'Show Search'}
          </Button>
        </div>
      </div>

      {showSearchBar && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="code">Flight Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="Flight Code"
                  value={searchForm.code}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin">Origin Airport</Label>
                <Input
                  id="origin"
                  name="origin"
                  placeholder="Origin Airport"
                  value={searchForm.origin}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination Airport</Label>
                <Input
                  id="destination"
                  name="destination"
                  placeholder="Destination Airport"
                  value={searchForm.destination}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={searchForm.status} 
                  onValueChange={(value) => handleFilterChange({ target: { name: 'status', value }})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="SCHEDULED_OPEN">Scheduled Open</SelectItem>
                    <SelectItem value="SCHEDULED_CLOSED">Scheduled Closed</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={searchForm.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={searchForm.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={handleClearSearch}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('code')}>
                Flight Code {getSortIcon('code')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('origin')}>
                Origin {getSortIcon('origin')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('destination')}>
                Destination {getSortIcon('destination')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('departureTime')}>
                Departure (Your Time) {getSortIcon('departureTime')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('estimatedArrivalTime')}>
                Arrival (Your Time) {getSortIcon('estimatedArrivalTime')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('flightDurationMinutes')}>
                Duration {getSortIcon('flightDurationMinutes')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                  No flights found
                </TableCell>
              </TableRow>
            ) : (
              flights.map((flight) => (
                <TableRow key={flight.id}>
                  <TableCell>{flight.code}</TableCell>
                  <TableCell>{typeof flight.origin === 'object' ? (flight.origin.code || flight.origin.name) : flight.origin}</TableCell>
                  <TableCell>{typeof flight.destination === 'object' ? (flight.destination.code || flight.destination.name) : flight.destination}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatTimeWithTimezone(flight.departureTime, getUserTimezone(), true)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateWithTimezone(flight.departureTime, getUserTimezone())}
                      </div>
                      <div className="text-xs text-gray-400">
                        UTC: {formatTimeWithTimezone(flight.departureTime, 'UTC', false)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatTimeWithTimezone(flight.estimatedArrivalTime, getUserTimezone(), true)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateWithTimezone(flight.estimatedArrivalTime, getUserTimezone())}
                      </div>
                      <div className="text-xs text-gray-400">
                        UTC: {formatTimeWithTimezone(flight.estimatedArrivalTime, 'UTC', false)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(flight.flightDurationMinutes)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-sm ${
                      flight.status.includes("SCHEDULED") ? "bg-blue-100 text-blue-800" :
                      flight.status.includes("IN_PROGRESS") ? "bg-yellow-100 text-yellow-800" :
                      flight.status.includes("COMPLETED") ? "bg-green-100 text-green-800" :
                      flight.status.includes("CANCELLED") ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {flight.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(flight)}
                      >
                        <Info className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/flights/${flight.id}/edit`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="pageSize">Rows per page:</Label>
          <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange({ target: { value: Number(value) }})}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalElements)} of {totalElements} entries
        </div>

        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = currentPage <= 3 
              ? i + 1 
              : currentPage >= totalPages - 2 
                ? totalPages - 4 + i 
                : currentPage - 2 + i;
            
            if (pageNum > 0 && pageNum <= totalPages) {
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            }
            return null;
          })}

          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightList;