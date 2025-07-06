import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout Components
import MainLayout from './components/Layout/MainLayout';
import DashboardLayout from './components/Layout/DashboardLayout';

// Pages
import Home from './pages/Home/Home';
import Flights from './pages/Flights/Flights';
import Booking from './pages/Booking/Booking';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import CheckIn from './pages/CheckIn/CheckIn';
import CheckInList from './pages/CheckIn/CheckedInList';
import About from './pages/About/About';
import Contact from './pages/Contact/Contact';
import VoucherManagement from './pages/Dashboard/VoucherManagement';
import CheckInDetail from "./pages/CheckIn/CheckInDetail"
import BookingOverview from './pages/Booking/BookingOverview';
import BookingDetails from './pages/Booking/BookingDetails';
import Aircraft from './pages/Aircraft';
import ManagementAircraft from './pages/ManagementAircraft';
import FlightList from './pages/Dashboard/Flights/FlightList';
import CreateFlight from './pages/Dashboard/Flights/CreateFlight';
import RouteList from './pages/Dashboard/Routes/RouteList';
import CreateRoute from './pages/Dashboard/Routes/CreateRoute';
import PaymentResult from './pages/Booking/PaymentResult';
import { Toaster } from "@/components/ui/toaster";
import PaymentSuccess from './pages/Payment/PaymentSuccess';
import PaymentFailed from './pages/Payment/PaymentFailed';
import RefundManagement from './pages/Dashboard/RefundManagement';
import MyRefundRequests from './pages/Booking/MyRefundRequests';

const FlightManagement = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Flight Management</h2>
    <p>Manage all flights, schedules, and aircraft assignments.</p>
  </div>
);

const UserManagement = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>User Management</h2>
    <p>Manage system users and permissions.</p>
  </div>
);

const Analytics = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Analytics</h2>
    <p>View detailed analytics and performance metrics.</p>
  </div>
);

const AddFlight = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Add New Flight</h2>
    <p>Create and schedule new flights.</p>
  </div>
);

const Schedules = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Flight Schedules</h2>
    <p>Manage flight schedules and timetables.</p>
  </div>
);

const Passengers = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Passenger Management</h2>
    <p>View and manage passenger information.</p>
  </div>
);

const Reports = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Reports</h2>
    <p>Generate and view system reports.</p>
  </div>
);

const Settings = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>System Settings</h2>
    <p>Configure system settings and preferences.</p>
  </div>
);

// Redirect component for authenticated users
const AuthRedirect = () => {
  const { isAuthenticated, isStaffOrAdmin } = useAuth();

  if (isAuthenticated()) {
    if (isStaffOrAdmin()) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return null;
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
          <Routes>
            {/* Public Routes with Main Layout */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="flights" element={<Flights />} />
              {/* <Route path="aircraft" element={<Aircraft />} /> */}
              <Route path="booking" element={<Booking />} />

              <Route path="check-in/detail/:bookingReference" element={
                <ProtectedRoute roles={['user']}>
                  <CheckInDetail />
                </ProtectedRoute>
              } />
              <Route path="check-in-history" element={<CheckInList />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />

              {/* Protected User Routes */}
              <Route
                path="booking-overview"
                element={
                  <ProtectedRoute roles={['user']}>
                    <BookingOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="booking-details/:bookingReference"
                element={
                  <ProtectedRoute roles={['user']}>
                    <BookingDetails />
                  </ProtectedRoute>
                }
              />
              
              {/* Refund Requests for Users */}
              <Route
                path="my-refund-requests"
                element={
                  <ProtectedRoute roles={['user']}>
                    <MyRefundRequests />
                  </ProtectedRoute>
                }
              />
              
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failed" element={<PaymentFailed />} />
            </Route>

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />            
            
            {/* Dashboard Routes for Staff/Admin */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['staff', 'admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >

              <Route index element={<Dashboard />} />

              {/* Analytics - Admin only */}
              <Route
                path="analytics"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              {/* Flight Management */}
              <Route
                path="flights"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <FlightList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="flights/add"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <CreateFlight />
                  </ProtectedRoute>
                }
              />
              <Route path="schedules" element={<Schedules />} />

              {/* Route Management */}
              <Route
                path="routes"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <RouteList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="routes/create"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <CreateRoute />
                  </ProtectedRoute>
                }
              />

              {/* Booking Management */}
              <Route path="passengers" element={<Passengers />} />

              {/* Voucher Management */}
              <Route
                path="vouchers"
                element={
                  <ProtectedRoute roles={['staff', 'admin']}>
                    <VoucherManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="aircraft"
                element={
                  <ProtectedRoute roles={['staff', 'admin']}>
                    <Aircraft />
                  </ProtectedRoute>
                }
              />

              {/* Refund Management */}
              <Route
                path="refunds"
                element={
                  <ProtectedRoute roles={['staff', 'admin']}>
                    <RefundManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my-refunds"
                element={
                  <ProtectedRoute roles={['user']}>
                    <MyRefundRequests />
                  </ProtectedRoute>
                }
              />

              {/* System - Admin only */}
              <Route
                path="users"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider >
  );
}
