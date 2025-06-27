// Mock data for the flight booking system

export const users = [
  {
    id: 1,
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
    role: 'user',
    phone: '+1234567890',
  },
  {
    id: 2,
    email: 'staff@boeing.com',
    password: 'staff123',
    name: 'Jane Smith',
    role: 'staff',
    phone: '+1234567891',
  },
  {
    id: 3,
    email: 'admin@boeing.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    phone: '+1234567892',
  },
];

export const airports = [
  { code: 'SGN', name: 'Ho Chi Minh City', city: 'Ho Chi Minh City', country: 'Vietnam' },
  { code: 'HAN', name: 'Hanoi', city: 'Hanoi', country: 'Vietnam' },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore' },
  { code: 'BKK', name: 'Bangkok Suvarnabhumi', city: 'Bangkok', country: 'Thailand' },
  { code: 'KUL', name: 'Kuala Lumpur', city: 'Kuala Lumpur', country: 'Malaysia' },
  { code: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles', city: 'Los Angeles', country: 'USA' },
  { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'UK' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { code: 'NRT', name: 'Narita', city: 'Tokyo', country: 'Japan' },
];

export const airlines = [
  { code: 'VN', name: 'Vietnam Airlines', logo: '🇻🇳' },
  { code: 'VJ', name: 'VietJet Air', logo: '✈️' },
  { code: 'QR', name: 'Qatar Airways', logo: '🇶🇦' },
  { code: 'SQ', name: 'Singapore Airlines', logo: '🇸🇬' },
  { code: 'TG', name: 'Thai Airways', logo: '🇹🇭' },
  { code: 'MH', name: 'Malaysia Airlines', logo: '🇲🇾' },
  { code: 'AA', name: 'American Airlines', logo: '🇺🇸' },
  { code: 'BA', name: 'British Airways', logo: '🇬🇧' },
  { code: 'AF', name: 'Air France', logo: '🇫🇷' },
  { code: 'JL', name: 'Japan Airlines', logo: '🇯🇵' },
];

export const flights = [
  {
    id: 'FL001',
    airline: 'VN',
    flightNumber: 'VN211',
    from: 'SGN',
    to: 'SIN',
    departureTime: '2025-06-10T08:00:00',
    arrivalTime: '2025-06-10T10:30:00',
    duration: '2h 30m',
    price: {
      economy: 150,
      business: 450,
      first: 800,
    },
    aircraft: 'Boeing 787-9',
    availableSeats: {
      economy: 180,
      business: 28,
      first: 12,
    },
    status: 'scheduled',
  },
  {
    id: 'FL002',
    airline: 'SQ',
    flightNumber: 'SQ618',
    from: 'SIN',
    to: 'SGN',
    departureTime: '2025-06-10T14:15:00',
    arrivalTime: '2025-06-10T16:45:00',
    duration: '2h 30m',
    price: {
      economy: 160,
      business: 480,
      first: 850,
    },
    aircraft: 'Airbus A350-900',
    availableSeats: {
      economy: 200,
      business: 42,
      first: 6,
    },
    status: 'scheduled',
  },
  {
    id: 'FL003',
    airline: 'QR',
    flightNumber: 'QR970',
    from: 'SGN',
    to: 'LHR',
    departureTime: '2025-06-11T23:40:00',
    arrivalTime: '2025-06-12T07:15:00',
    duration: '13h 35m',
    price: {
      economy: 650,
      business: 1800,
      first: 3200,
    },
    aircraft: 'Boeing 777-300ER',
    availableSeats: {
      economy: 280,
      business: 42,
      first: 8,
    },
    status: 'scheduled',
  },
  {
    id: 'FL004',
    airline: 'VJ',
    flightNumber: 'VJ831',
    from: 'SGN',
    to: 'HAN',
    departureTime: '2025-06-10T06:30:00',
    arrivalTime: '2025-06-10T08:45:00',
    duration: '2h 15m',
    price: {
      economy: 80,
      business: 200,
      first: null,
    },
    aircraft: 'Airbus A321',
    availableSeats: {
      economy: 180,
      business: 12,
      first: 0,
    },
    status: 'scheduled',
  },
  {
    id: 'FL005',
    airline: 'TG',
    flightNumber: 'TG644',
    from: 'BKK',
    to: 'SGN',
    departureTime: '2025-06-10T12:30:00',
    arrivalTime: '2025-06-10T13:45:00',
    duration: '1h 15m',
    price: {
      economy: 120,
      business: 350,
      first: 600,
    },
    aircraft: 'Boeing 737-800',
    availableSeats: {
      economy: 150,
      business: 16,
      first: 8,
    },
    status: 'scheduled',
  },
];

export const bookings = [
  {
    id: 'BK001',
    userId: 1,
    flightId: 'FL001',
    bookingReference: 'BOEING001',
    passengers: [
      {
        title: 'Mr',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15',
        passport: 'US123456789',
        seatClass: 'economy',
        seatNumber: '14A',
      },
    ],
    totalAmount: 150,
    status: 'confirmed',
    bookingDate: '2025-06-08T10:30:00',
    paymentStatus: 'paid',
  },
  {
    id: 'BK002',
    userId: 1,
    flightId: 'FL003',
    bookingReference: 'BOEING002',
    passengers: [
      {
        title: 'Mr',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15',
        passport: 'US123456789',
        seatClass: 'business',
        seatNumber: '2A',
      },
    ],
    totalAmount: 1800,
    status: 'confirmed',
    bookingDate: '2025-06-07T15:45:00',
    paymentStatus: 'paid',
  },
];

export const promotions = [
  {
    id: 'PROMO001',
    title: 'Mega Sale 6.6',
    description: 'Special discount up to 60% off for summer flights',
    discount: 0.6,
    validFrom: '2025-05-27',
    validTo: '2025-06-06',
    code: 'MEGA66',
    image: '/api/placeholder/400/200',
    minAmount: 100,
    maxDiscount: 300,
  },
  {
    id: 'PROMO002',
    title: 'QR Code Special',
    description: 'Scan QR code for instant discount up to 6 million VND',
    discount: 0.3,
    validFrom: '2025-05-16',
    validTo: '2025-09-06',
    code: 'QRSPECIAL',
    image: '/api/placeholder/400/200',
    minAmount: 200,
    maxDiscount: 6000000,
  },
];

export const destinations = [
  {
    id: 1,
    city: 'Singapore',
    country: 'Singapore',
    image: '/api/placeholder/300/200',
    description: 'Modern city-state with amazing attractions',
    popularFlights: ['FL001', 'FL002'],
  },
  {
    id: 2,
    city: 'London',
    country: 'United Kingdom',
    image: '/api/placeholder/300/200',
    description: 'Historic city with rich culture and heritage',
    popularFlights: ['FL003'],
  },
  {
    id: 3,
    city: 'Bangkok',
    country: 'Thailand',
    image: '/api/placeholder/300/200',
    description: 'Vibrant city with amazing food and temples',
    popularFlights: ['FL005'],
  },
];

// Helper functions
export const getAirportByCode = (code) => airports.find(airport => airport.code === code);
export const getAirlineByCode = (code) => airlines.find(airline => airline.code === code);
export const getFlightById = (id) => flights.find(flight => flight.id === id);
export const getUserById = (id) => users.find(user => user.id === id);
export const getBookingsByUserId = (userId) => bookings.filter(booking => booking.userId === userId);
