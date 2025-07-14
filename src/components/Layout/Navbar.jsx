import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Plane, User, CreditCard, History, Gift, Award, LogOut, Menu, X } from 'lucide-react';
import LogoutButton from '../LogoutButton';

const Navbar = () => {
  const { user, isAuthenticated, isStaffOrAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-blue-800 to-blue-600 backdrop-blur supports-[backdrop-filter]:bg-gradient-to-r supports-[backdrop-filter]:from-blue-800/95 supports-[backdrop-filter]:to-blue-600/95">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 text-white hover:text-blue-100 transition-colors">
          <Plane className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight">Boeing Airways</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link 
            to="/" 
            className="text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium px-3 py-2 rounded-md"
          >
            Home
          </Link>
          <Link 
            to="/flights" 
            className="text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium px-3 py-2 rounded-md"
          >
            Flights
          </Link>
          {isAuthenticated() && (
            <Link 
              to="/booking-overview" 
              className="text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium px-3 py-2 rounded-md"
            >
              My Bookings
            </Link>
          )}
          <Link 
            to="/about" 
            className="text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium px-3 py-2 rounded-md"
          >
            About
          </Link>
          <Link 
            to="/contact" 
            className="text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium px-3 py-2 rounded-md"
          >
            Contact
          </Link>
        </div>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex items-center space-x-3">
          {isAuthenticated() ? (
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/10">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold">
                        {user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/check-in-history" className="w-full cursor-pointer">
                      <History className="mr-2 h-4 w-4" />
                      Check-in List
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-refund-requests" className="w-full cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4" />
                      My Refund Requests
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/membership" className="w-full cursor-pointer">
                      <Award className="mr-2 h-4 w-4" />
                      Loyalty Program
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/redeem-voucher" className="w-full cursor-pointer">
                      <Gift className="mr-2 h-4 w-4" />
                      Redeem Vouchers
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-white font-medium text-sm">
                {user.name}
              </span>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button asChild className="text-black bg-white">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
                <Link to="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center space-x-2">
          {isAuthenticated() && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/10">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold">
                      {user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/check-in-history" className="w-full cursor-pointer">
                    <History className="mr-2 h-4 w-4" />
                    Check-in List
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-refund-requests" className="w-full cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    My Refund Requests
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/membership" className="w-full cursor-pointer">
                    <Award className="mr-2 h-4 w-4" />
                    Loyalty Program
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/redeem-voucher" className="w-full cursor-pointer">
                    <Gift className="mr-2 h-4 w-4" />
                    Redeem Vouchers
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMobileMenu}
            className="text-white hover:bg-white/10"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-blue-700 bg-blue-800">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <Link 
              to="/" 
              className="block text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium py-2 px-3 rounded-md"
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            <Link 
              to="/flights" 
              className="block text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium py-2 px-3 rounded-md"
              onClick={closeMobileMenu}
            >
              Flights
            </Link>
            {isAuthenticated() && (
              <Link 
                to="/booking-overview" 
                className="block text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium py-2 px-3 rounded-md"
                onClick={closeMobileMenu}
              >
                My Bookings
              </Link>
            )}
            <Link 
              to="/about" 
              className="block text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium py-2 px-3 rounded-md"
              onClick={closeMobileMenu}
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className="block text-white hover:text-blue-100 hover:bg-white/10 transition-all duration-200 font-medium py-2 px-3 rounded-md"
              onClick={closeMobileMenu}
            >
              Contact
            </Link>
            
            {!isAuthenticated() && (
              <div className="flex flex-col space-y-2 pt-4 border-t border-blue-700">
                <Button variant="ghost" asChild className="text-white border-white hover:bg-white hover:text-blue-800 justify-start">
                  <Link to="/login" onClick={closeMobileMenu}>Login</Link>
                </Button>
                <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white justify-start">
                  <Link to="/register" onClick={closeMobileMenu}>Register</Link>
                </Button>
              </div>
            )}
            
            {isAuthenticated() && (
              <div className="pt-4 border-t border-blue-700">
                <LogoutButton />
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;