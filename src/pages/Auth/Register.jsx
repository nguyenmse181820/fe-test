import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Auth.module.css';
import { toast } from 'react-toastify';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

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
    if (!formData.dob) {
      setError('Please enter your date of birth');
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

        // Show success toast
        toast.success('Registration successful! Please login to continue.', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
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
        toast.error(result.message, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainerWide}>
        <div className={styles.authHeaderWide}>
          <div className={styles.authLogo}>✈️</div>
          <h1 className={styles.authTitle}>Join Boeing Airways</h1>
          <p className={styles.authSubtitle}>Create your account to start booking flights</p>
        </div>

        <form className={styles.authFormWide} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {success && (
            <div className={styles.success}>
              {success}
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.label}>First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                className={styles.input}
                value={formData.firstName}
                onChange={handleInputChange}
                required
                placeholder="Enter your first name"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.label}>Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className={styles.input}
                value={formData.lastName}
                onChange={handleInputChange}
                required
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className={styles.input}
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className={styles.input}
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="dob" className={styles.label}>Date of Birth</label>
              <input
                type="date"
                id="dob"
                name="dob"
                className={styles.input}
                value={formData.dob}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="gender" className={styles.label}>Gender</label>
              <select
                id="gender"
                name="gender"
                className={styles.input}
                value={formData.gender}
                onChange={handleInputChange}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="nationality" className={styles.label}>Nationality</label>
              <input
                type="text"
                id="nationality"
                name="nationality"
                className={styles.input}
                value={formData.nationality}
                onChange={handleInputChange}
                required
                placeholder="Enter your nationality"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className={styles.input}
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter your password"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>

          <div className={styles.authFooter}>
            Already have an account?{' '}
            <Link to="/login" className={styles.authLink}>
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
