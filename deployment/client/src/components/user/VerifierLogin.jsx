import React, { useState } from 'react';
import Cookies from 'js-cookie';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';

const VerifierLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      
      console.log('Attempting login with email:', email);
      
      // For development - simulate successful login
      setTimeout(() => {
        try {
          // Create a mock user data object
          const mockUser = {
            id: 'verifier-123',
            username: email.split('@')[0],
            email: email,
            role: 'verifier',
            institution: 'SuperCert University'
          };
          
          // Store the mock data in localStorage and cookies
          localStorage.setItem('user', JSON.stringify(mockUser));
          Cookies.set('token', 'dev-token-123456', { expires: 1, path: '/' });
          
          console.log('Development mode: Using mock login data', mockUser);
          
          // Navigate to verifier dashboard
          navigate("/guest");
        } catch (error) {
          console.error('Login Error:', error);
          setError('An unexpected error occurred');
        } finally {
          setIsLoading(false);
        }
      }, 1500);
    };

    // Animation variants
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: { 
          duration: 0.5,
          when: "beforeChildren",
          staggerChildren: 0.2
        }
      }
    };

    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
    };

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: 'var(--background-light)' }}>
            <motion.div 
                className="card shadow-lg p-5" 
                style={{ width: '400px', maxWidth: '90%', borderRadius: 'var(--border-radius-lg)' }}
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <motion.div className="text-center mb-4" variants={itemVariants}>
                    <h2 className="text-primary fw-bold">SUPERCERT</h2>
                    <p className="text-muted">Verifier Login</p>
                </motion.div>

                {error && (
                    <motion.div 
                        className="alert alert-danger" 
                        role="alert"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {error}
                    </motion.div>
                )}

                <motion.form onSubmit={handleSubmit} variants={containerVariants}>
                    <motion.div className="mb-4" variants={itemVariants}>
                        <div className="input-group">
                            <span className="input-group-text bg-primary text-white">
                                <FaUser />
                            </span>
                            <input
                                type="text"
                                className="form-control py-2"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <small className="form-text text-muted">We'll never share your email with anyone else.</small>
                    </motion.div>

                    <motion.div className="mb-4" variants={itemVariants}>
                        <div className="input-group">
                            <span className="input-group-text bg-primary text-white">
                                <FaLock />
                            </span>
                            <input
                                type="password"
                                className="form-control py-2"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <button 
                            type="submit" 
                            className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            ) : (
                                <FaSignInAlt className="me-2" />
                            )}
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </motion.div>
                </motion.form>

                <motion.div 
                    className="text-center mt-4"
                    variants={itemVariants}
                >
                    <p className="mb-2">
                        Don't have a verifier account? <Link to="/verifier-register" className="text-primary">Register here</Link>
                    </p>
                    <a href="/" className="text-decoration-none">Back to Home</a>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default VerifierLogin;