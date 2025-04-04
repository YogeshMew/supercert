import React, { useState } from 'react';
import api from '../../utils/axiosConfig';
import Cookies from 'js-cookie';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/user/login', {
                email,
                password
            });

            if (response.data && response.data.accessToken) {
                // Store token in cookie
                Cookies.set('token', response.data.accessToken, { 
                    expires: 1, 
                    path: '/' 
                });
                
                // Store user info in localStorage
                localStorage.setItem('user', JSON.stringify(response.data.user));
                
                navigate('/admin');
            } else {
                setError('Login failed. Please check your credentials.');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(error.response?.data?.message || 'Invalid username or password. Please try again.');
            setIsLoading(false);
        }
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
                    <p className="text-muted">Admin Login</p>
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
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <FaSignInAlt className="me-2" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </motion.div>
                </motion.form>

                <motion.div 
                    className="d-flex justify-content-between mt-4"
                    variants={itemVariants}
                >
                    <Link to="/" className="text-decoration-none">Back to Home</Link>
                    <Link to="/register" className="text-decoration-none d-flex align-items-center">
                        <FaUserPlus className="me-1" /> Register
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Login;