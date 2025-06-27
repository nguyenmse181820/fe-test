// src/pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Auth.module.css';
import { toast } from 'react-toastify';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have a message from registration
    if (location.state?.message) {
      toast.success(location.state.message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }

    // Pre-fill username if provided
    if (location.state?.email) {
      setFormData(prev => ({
        ...prev,
        username: location.state.email
      }));
    }
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData);

      if (result.success) {
        // Show success toast
        toast.success('Login successful!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        // Redirect based on role
        if (result.role === 'admin' || result.role === 'staff') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
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
      console.error('Login error:', err);
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
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <div className={styles.authLogo}>✈️</div>
          <h1 className={styles.authTitle}>Welcome Back</h1>
          <p className={styles.authSubtitle}>Sign in to your Boeing Airways account</p>
        </div>

        <form className={styles.authForm} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>Email Address</label>
            <input
              type="email"
              id="username"
              name="username"
              className={styles.input}
              value={formData.username}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
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
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          <div className={styles.authFooter}>
            Don't have an account?{' '}
            <Link to="/register" className={styles.authLink}>
              Create one here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;