import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3,
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  LogOut,
  Map,
  Menu,
  Plane,
  Settings,
  Users,
  Wallet,
  X
} from 'lucide-react';

// Shadcn components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Sidebar = () => {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setIsVisible(!isVisible);
  };

  const navigationItems = [
    {
      section: 'Overview',
      items: [
        { path: '/dashboard', icon: BarChart3, text: 'Analytics', roles: ['admin'] },
      ]
    },
    {
      section: 'Flight Management',
      items: [
        { path: '/dashboard/flights', icon: Plane, text: 'All Flights', roles: ['staff', 'admin'] },
        { path: '/dashboard/routes', icon: Map, text: 'Routes', roles: ['staff', 'admin'] },
        { path: '/dashboard/schedules', icon: Calendar, text: 'Schedules', roles: ['staff', 'admin'] },
      ]
    },
    {
      section: 'Booking Management',
      items: [
        { path: '/dashboard/bookings', icon: BookOpen, text: 'All Bookings', roles: ['staff', 'admin'] },
        { path: '/dashboard/passengers', icon: Users, text: 'Passengers', roles: ['staff', 'admin'] },
      ]
    },
    {
      section: 'Management',
      items: [
        { path: '/dashboard/vouchers', icon: CreditCard, text: 'Vouchers', roles: ['staff', 'admin'] },
        { path: '/dashboard/aircraft', icon: Plane, text: 'Aircraft', roles: ['staff', 'admin'] },
        { path: '/dashboard/refunds', icon: Wallet, text: 'Refund Requests', roles: ['staff', 'admin'] },
      ]
    },
    {
      section: 'System',
      items: [
        { path: '/dashboard/users', icon: Users, text: 'Users', roles: ['admin'] },
        { path: '/dashboard/reports', icon: FileText, text: 'Reports', roles: ['admin'] },
        { path: '/dashboard/settings', icon: Settings, text: 'Settings', roles: ['admin'] },
      ]
    }
  ];
  const hasAccess = (roles) => {
    if (!user?.role) return false;

    if (roles.includes('admin') && isAdmin()) return true;
    if (roles.includes('staff') && (isStaff() || isAdmin())) return true;

    return roles.includes(user.role);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        {isVisible ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 
        transition-transform duration-300 ease-in-out flex flex-col
        ${isVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div>
              <Link to="/dashboard" className="block">
                <div className="font-bold text-lg text-gray-900">Boeing Airways</div>
                <div className="text-sm text-gray-500">Admin Panel</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {navigationItems.map((section, index) => (
            <div key={index} className="space-y-2">
              <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items
                  .filter(item => hasAccess(item.roles))
                  .map((item, itemIndex) => {
                    const IconComponent = item.icon;
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <Link
                        key={itemIndex}
                        to={item.path}
                        onClick={() => setIsVisible(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive 
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                      >
                        <IconComponent className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span>{item.text}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section - Always visible at bottom */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0 mt-auto">
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 truncate mb-2">
                {user?.name}
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                user?.role === 'admin' 
                  ? 'bg-red-100 text-red-700'
                  : user?.role === 'staff'
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full text-sm hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isVisible && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsVisible(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
