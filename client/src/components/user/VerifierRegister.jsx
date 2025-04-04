import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaKey, FaUserPlus } from 'react-icons/fa';

const VerifierRegister = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        activationCode: 'SUPERCERT-VERIFIER-2025' // Hardcoded for development
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        // Validate inputs
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        // For development - simulate successful registration without API call
        setTimeout(() => {
            console.log('Development mode: Registration data:', formData);
            setSuccess('Verifier account created successfully! You can now log in.');
            
            // Redirect to verifier login after 2 seconds
            setTimeout(() => {
                navigate('/verifier-login');
            }, 2000);
            
            setIsLoading(false);
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
        <motion.div
            className="container mt-5"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <motion.div className="card shadow" variants={itemVariants}>
                        <div className="card-body p-5">
                            <div className="text-center mb-4">
                                <h2 className="h3 text-primary font-weight-bold">Verifier Registration</h2>
                                <p className="text-muted">Create a verifier account to verify certificates</p>
                            </div>

                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="alert alert-success" role="alert">
                                    {success}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <div className="input-group">
                                        <span className="input-group-text bg-primary text-white">
                                            <FaUser />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Username"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="input-group">
                                        <span className="input-group-text bg-primary text-white">
                                            <FaEnvelope />
                                        </span>
                                        <input
                                            type="email"
                                            className="form-control"
                                            placeholder="Email Address"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="input-group">
                                        <span className="input-group-text bg-primary text-white">
                                            <FaLock />
                                        </span>
                                        <input
                                            type="password"
                                            className="form-control"
                                            placeholder="Password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="input-group">
                                        <span className="input-group-text bg-primary text-white">
                                            <FaLock />
                                        </span>
                                        <input
                                            type="password"
                                            className="form-control"
                                            placeholder="Confirm Password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="input-group">
                                        <span className="input-group-text bg-primary text-white">
                                            <FaKey />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Activation Code"
                                            name="activationCode"
                                            value={formData.activationCode}
                                            onChange={handleChange}
                                            required
                                            readOnly
                                        />
                                    </div>
                                    <small className="form-text text-muted">Default activation code for development: SUPERCERT-VERIFIER-2025</small>
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    ) : (
                                        <FaUserPlus className="me-2" />
                                    )}
                                    {isLoading ? 'Registering...' : 'Register as Verifier'}
                                </button>
                            </form>

                            <div className="text-center mt-4">
                                <p>
                                    Already have an account? <Link to="/verifier-login" className="text-primary">Login here</Link>
                                </p>
                                <Link to="/" className="text-decoration-none">Back to Home</Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default VerifierRegister; 