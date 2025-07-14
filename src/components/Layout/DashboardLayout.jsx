import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return { title: 'Dashboard', subtitle: 'Overview of your flight management system' };
      case '/dashboard/flights':
        return { title: 'Flight Management', subtitle: 'Manage all flights and schedules' };
      case '/dashboard/bookings':
        return { title: 'Booking Management', subtitle: 'View and manage all bookings' };
      case '/dashboard/users':
        return { title: 'User Management', subtitle: 'Manage system users and permissions' };
      case '/dashboard/vouchers':
        return { title: 'Voucher Management', subtitle: 'Create and manage promotional vouchers' };
      case '/dashboard/aircraft':
        return { title: 'Aircraft Management', subtitle: 'Management Aircraft' };
      default:
        return { title: 'Dashboard', subtitle: 'Admin Panel' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 transition-all duration-300">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 md:px-8 md:py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
