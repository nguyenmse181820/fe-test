import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { format } from "date-fns";
import FlightService from '../../services/FlightService';
import { airports, promotions, destinations } from '../../data/mockData';
import styles from './Home.module.css';
import {
  CalendarIcon,
  Plane,
  RotateCw,
  Search,
  LightbulbIcon,
  BellIcon,
  PartyPopper,
  Building2,
  ChevronsUpDown
} from "lucide-react";
import { getUserTimezone, convertLocalToUTC, formatTimeWithTimezone } from '../../utils/timezone';

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [airports, setAirports] = useState([]);

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState({
    tripType: 'one-way',
    from: '',
    to: '',
    departureDate: new Date(),
    returnDate: '',
    passengers: {
      adults: 1,
      children: 0,
      babies: 0
    }
  });

  // Additional state for passenger management
  const [showPassengerSelector, setShowPassengerSelector] = useState(false);
  const [passengerCount, setPassengerCount] = useState({
    adults: 1,
    children: 0,
    infants: 0
  });

  // Fetch airports and routes when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [airportData, routeData] = await Promise.all([
          FlightService.getAirports(),
          FlightService.getRoutes().catch(() => [])
        ]);

        setAirports(airportData);
        setRoutes(routeData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setAirports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setSearchData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePassengerCount = (type, increment) => {
    setPassengerCount(prev => {
      const current = prev[type];
      let newValue = current + increment;

      // Validation rules
      if (type === 'adults') {
        newValue = Math.max(1, Math.min(newValue, 9)); // Min 1, Max 9 adults
      } else if (type === 'children') {
        newValue = Math.max(0, Math.min(newValue, 8)); // Max 8 children
      } else if (type === 'infants') {
        newValue = Math.max(0, Math.min(newValue, prev.adults)); // Max infants = adults
      }

      const updated = { ...prev, [type]: newValue };

      // Update passenger string
      const totalPassengers = updated.adults + updated.children + updated.infants;
      if (totalPassengers <= 10) { // Max 10 total passengers
        const passengerString = `${updated.adults} Adult${updated.adults > 1 ? 's' : ''}, ${updated.children} Child${updated.children !== 1 ? 'ren' : ''}, ${updated.infants} Infant${updated.infants !== 1 ? 's' : ''}`;
        setSearchData(prevSearch => ({
          ...prevSearch,
          passengers: passengerString
        }));
        return updated;
      }

      return prev; // Don't update if exceeds 10 passengers
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    try {
      // Find the route ID based on the selected origin and destination
      const route = routes.find(r =>
        r.origin?.code === searchData.from &&
        r.destination?.code === searchData.to
      );

      if (!route) {
        toast({
          variant: "destructive",
          title: "Invalid Route",
          description: "No route found between the selected airports. Please select a different route.",
        });
        return;
      }

      // Prepare search parameters for navigation
      const params = new URLSearchParams({
        routeId: route.id,
        from: searchData.from,
        to: searchData.to,
        departureDate: format(searchData.departureDate, 'yyyy-MM-dd'),
        tripType: searchData.tripType,
        adults: searchData.passengers.adults,
        children: searchData.passengers.children,
        babies: searchData.passengers.babies
      });

      // Log timezone information for search comparison
      const userTimezone = getUserTimezone();
      const searchDate = searchData.departureDate;
      const localSearchTime = searchDate.toISOString();
      const utcSearchTime = convertLocalToUTC(searchDate);

      console.log('🌍 Search Time Comparison:');
      console.log(`- User timezone: ${userTimezone}`);
      console.log(`- Local search time: ${formatTimeWithTimezone(localSearchTime, userTimezone)}`);
      console.log(`- UTC search time: ${formatTimeWithTimezone(utcSearchTime, 'UTC')}`);
      console.log(`- Search date: ${format(searchDate, 'yyyy-MM-dd')}`);

      // Add return date for round-trip
      if (searchData.tripType === 'round-trip' && searchData.returnDate) {
        params.append('returnDate', format(searchData.returnDate, 'yyyy-MM-dd'));

        // Log return date timezone info too
        const returnLocalTime = searchData.returnDate.toISOString();
        const returnUtcTime = convertLocalToUTC(searchData.returnDate);
        console.log('🔄 Return Time Comparison:');
        console.log(`- Local return time: ${formatTimeWithTimezone(returnLocalTime, userTimezone)}`);
        console.log(`- UTC return time: ${formatTimeWithTimezone(returnUtcTime, 'UTC')}`);
      }

      // Prepare search request based on required API structure
      const searchRequest = {
        routeId: route.id,
        departureDate: format(searchData.departureDate, 'yyyy-MM-dd'),
        noAdults: searchData.passengers.adults,
        noChildren: searchData.passengers.children,
        noBabies: searchData.passengers.babies
      };

      try {
        // Send search request to API
        await FlightService.searchFlights(searchRequest);
      } catch (searchError) {
        console.error('Pre-search failed:', searchError);
        // Continue to navigate even if pre-search fails
      }

      // Log the search details with enhanced timezone comparison
      console.log('✈️ Search initiated with comprehensive timezone info:');
      console.log(`Route: ${searchData.from} → ${searchData.to}`);
      console.log(`Passengers: ${searchData.passengers.adults} adults, ${searchData.passengers.children} children, ${searchData.passengers.babies} babies`);

      // Navigate to flights page with search parameters
      navigate(`/flights?${params.toString()}`);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: "Unable to search flights. Please try again.",
      });
    }
  };

  // Close passenger selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPassengerSelector && !event.target.closest('.passengerSelector')) {
        setShowPassengerSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPassengerSelector]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900/90 to-blue-500/90 h-[70vh] flex items-center justify-center text-white text-center relative">
        <div className="max-w-[800px] px-8">
          <h1 className="text-5xl font-bold mb-4 leading-tight">Discover Your Next Adventure</h1>
          <p className="text-xl mb-8 opacity-90">
            Book flights to amazing destinations worldwide with Boeing Airways
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 -mt-16">
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <Tabs defaultValue="one-way" className="w-full" onValueChange={(value) => handleInputChange('tripType', value)}>
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="one-way" className="flex items-center gap-2">
                  <Plane className="h-4 w-4" /> One-way
                </TabsTrigger>
                <TabsTrigger value="round-trip" className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4" /> Round-trip
                </TabsTrigger>
              </TabsList>

              <TabsContent value="one-way">
                <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSearch}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From</label>
                    <Select required value={searchData.from} onValueChange={(value) => handleInputChange('from', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select departure" />
                      </SelectTrigger>
                      <SelectContent side="bottom">
                        {airports.map(airport => (
                          <SelectItem key={airport.code} value={airport.code}>
                            {airport.city} ({airport.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">To</label>
                    <Select required value={searchData.to} onValueChange={(value) => handleInputChange('to', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent side="bottom">
                        {airports.map(airport => (
                          <SelectItem key={airport.code} value={airport.code}>
                            {airport.city} ({airport.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Departure Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !searchData.departureDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {searchData.departureDate ? format(searchData.departureDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={searchData.departureDate}
                          onSelect={(date) => handleInputChange('departureDate', date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-medium">Passengers</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-medium">Adults</label>
                        <Input
                          type="number"
                          min="1"
                          max="9"
                          value={searchData.passengers.adults}
                          onChange={(e) => handleInputChange('passengers', {
                            ...searchData.passengers,
                            adults: parseInt(e.target.value) || 1
                          })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Children</label>
                        <Input
                          type="number"
                          min="0"
                          max="9"
                          value={searchData.passengers.children}
                          onChange={(e) => handleInputChange('passengers', {
                            ...searchData.passengers,
                            children: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Infants</label>
                        <Input
                          type="number"
                          min="0"
                          max="9"
                          value={searchData.passengers.babies}
                          onChange={(e) => handleInputChange('passengers', {
                            ...searchData.passengers,
                            babies: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex justify-end mt-2">
                    <Button type="submit" className="w-full md:w-auto flex items-center gap-2 justify-center">
                      <Search className="h-4 w-4" /> Search Flights
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="round-trip">
                <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSearch}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From</label>
                    <Select required value={searchData.from} onValueChange={(value) => handleInputChange('from', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select departure" />
                      </SelectTrigger>
                      <SelectContent side="bottom">
                        {airports.map(airport => (
                          <SelectItem key={airport.code} value={airport.code}>
                            {airport.city} ({airport.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">To</label>
                    <Select required value={searchData.to} onValueChange={(value) => handleInputChange('to', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent side="bottom">
                        {airports.map(airport => (
                          <SelectItem key={airport.code} value={airport.code}>
                            {airport.city} ({airport.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Departure Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !searchData.departureDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {searchData.departureDate ? format(searchData.departureDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={searchData.departureDate}
                          onSelect={(date) => handleInputChange('departureDate', date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Return Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !searchData.returnDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {searchData.returnDate ? format(searchData.returnDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={searchData.returnDate}
                          onSelect={(date) => handleInputChange('returnDate', date)}
                          disabled={(date) => date < searchData.departureDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-medium">Passengers</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-medium">Adults</label>
                        <Input
                          type="number"
                          min="1"
                          max="9"
                          value={searchData.passengers.adults}
                          onChange={(e) => handleInputChange('passengers', {
                            ...searchData.passengers,
                            adults: parseInt(e.target.value) || 1
                          })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Children</label>
                        <Input
                          type="number"
                          min="0"
                          max="9"
                          value={searchData.passengers.children}
                          onChange={(e) => handleInputChange('passengers', {
                            ...searchData.passengers,
                            children: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Infants</label>
                        <Input
                          type="number"
                          min="0"
                          max="9"
                          value={searchData.passengers.babies}
                          onChange={(e) => handleInputChange('passengers', {
                            ...searchData.passengers,
                            babies: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex justify-end mt-2">
                    <Button type="submit" className="w-full md:w-auto flex items-center gap-2 justify-center">
                      <Search className="h-4 w-4" /> Search Flights
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardHeader>
          {/* Card Footer removed */}
        </Card>
      </section>

      {/* Promotions Section */}
      <section className="py-12 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Special Offers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center mb-2">
                <PartyPopper className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Summer Getaway</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">Get 20% off on all international flights this summer. Book by July 30th.</CardDescription>
            </CardContent>
            <CardFooter className="bg-muted/50 pt-2">
              <p className="text-sm font-medium">Code: SUMMER20</p>
            </CardFooter>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center mb-2">
                <PartyPopper className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Business Class Special</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">Upgrade to Business Class for just $299 extra on long-haul flights.</CardDescription>
            </CardContent>
            <CardFooter className="bg-muted/50 pt-2">
              <p className="text-sm font-medium">Code: BIZUP299</p>
            </CardFooter>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center mb-2">
                <PartyPopper className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Family Package</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">Children fly for half price when booking for 4 or more passengers.</CardDescription>
            </CardContent>
            <CardFooter className="bg-muted/50 pt-2">
              <p className="text-sm font-medium">Code: FAMILY50</p>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-12 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Popular Destinations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center mb-2">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Paris, France</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">Explore the city of lights with our daily flights to Paris.</CardDescription>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center mb-2">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Tokyo, Japan</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">Experience the blend of traditional and modern culture in Tokyo.</CardDescription>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center mb-2">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>New York, USA</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">The city that never sleeps awaits with our premium service flights.</CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
};

export default Home;
