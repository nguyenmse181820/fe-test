import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, Plane } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dob: '',
    phone: '',
    gender: 'Male',
    nationality: 'Vietnamese',
    role: 'USER'
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      setFormData(prev => ({
        ...prev,
        dob: formattedDate
      }));
      setError('');
      setSuccess('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate date of birth
    if (!selectedDate || !formData.dob) {
      setError('Please select your date of birth');
      setLoading(false);
      return;
    }

    try {
      const result = await register(formData);

      if (result.success) {
        setSuccess(result.message);
        // Clear form data
        setFormData({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          dob: '',
          phone: '',
          gender: 'Male',
          nationality: 'Vietnamese',
          role: 'USER'
        });
        setSelectedDate(null);

        // Show success toast
        toast({
          title: "Registration successful",
          description: "Your account has been created! Redirecting to login...",
          duration: 3000,
        });

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Registration successful! Please login to continue.',
              email: formData.email // Pass the email to pre-fill the login form
            }
          });
        }, 2000);
      } else {
        setError(result.message);
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: result.message,
          duration: 5000,
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-xl border-0">
        <CardHeader className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-t-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Plane className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Join Boeing Airways</CardTitle>
          <CardDescription className="text-blue-100 mt-2">
            Create your account to start booking flights
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-100 text-green-700 rounded-md p-3 flex items-center gap-2 mb-4">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name and Last Name */}
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Email and Phone */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* DOB and Gender */}
              <div className="grid gap-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <DatePicker
                  date={selectedDate}
                  onSelect={handleDateChange}
                  placeholder="Select your date of birth"
                  required
                  captionLayout="dropdown"
                  startYear={1920}
                  endYear={2006}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gender">Gender</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value) => handleSelectChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nationality and Password */}
              <div className="grid gap-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Select 
                  value={formData.nationality} 
                  onValueChange={(value) => handleSelectChange('nationality', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vietnamese">Vietnamese</SelectItem>
                    <SelectItem value="American">American</SelectItem>
                    <SelectItem value="British">British</SelectItem>
                    <SelectItem value="Australian">Australian</SelectItem>
                    <SelectItem value="Canadian">Canadian</SelectItem>
                    <SelectItem value="Chinese">Chinese</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Indian">Indian</SelectItem>
                    <SelectItem value="Japanese">Japanese</SelectItem>
                    <SelectItem value="Korean">Korean</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t p-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;
