import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaEnvelope, FaBuilding, FaMapMarkerAlt, FaUserPlus } from 'react-icons/fa';

const VerifierRegister = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        institution: {
            name: '',
            email: '',
            address: ''
        }
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData({
                ...formData,
                [parent]: {
                    ...formData[parent],
                    [child]: value
                }
            });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        // Validate form
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://localhost:5001/user/register', {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: 'verifier',
                institution: {
                    name: formData.institution.name,
                    email: formData.institution.email,
                    address: formData.institution.address
                }
            });

            setSuccess('Registration successful! You can now login.');
            setTimeout(() => {
                navigate('/verifier-login');
            }, 2000);
        } catch (error) {
            console.error('Registration Error:', error.response?.data || error.message);
            setError(error.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
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
                style={{ width: '500px', maxWidth: '90%', borderRadius: 'var(--border-radius-lg)' }}
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <motion.div className="text-center mb-4" variants={itemVariants}>
                    <h2 className="text-primary fw-bold">SUPERCERT</h2>
                    <p className="text-muted">Verifier Registration</p>
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

                {success && (
                    <motion.div
                        className="alert alert-success"
                        role="alert"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {success}
                    </motion.div>
                )}

                <motion.form onSubmit={handleSubmit} variants={containerVariants}>
                    <motion.div className="mb-3" variants={itemVariants}>
                        <div className="input-group">
                            <span className="input-group-text bg-primary text-white">
                                <FaUser />
                            </span>
                            <input
                                type="text"
                                className="form-control py-2"
                                placeholder="Full Name"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </motion.div>

                    <motion.div className="mb-3" variants={itemVariants}>
                        <div className="input-group">
                            <span className="input-group-text bg-primary text-white">
                                <FaEnvelope />
                            </span>
                            <input
                                type="email"
                                className="form-control py-2"
                                placeholder="Email Address"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <small className="form-text text-muted">We'll never share your email with anyone else.</small>
                    </motion.div>

                    <motion.div className="mb-3" variants={itemVariants}>
                        <div className="input-group">
                            <span className="input-group-text bg-primary text-white">
                                <FaLock />
                            </span>
                            <input
                                type="password"
                                className="form-control py-2"
                                placeholder="Password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </motion.div>

                    <motion.div className="mb-3" variants={itemVariants}>
                        <div className="input-group">
                            <span className="input-group-text bg-primary text-white">
                                <FaLock />
                            </span>
                            <input
                                type="password"
                                className="form-control py-2"
                                placeholder="Confirm Password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </motion.div>

                    <motion.div className="mb-3" variants={itemVariants}>
                        <h5 className="text-primary mb-3">Institution Information</h5>
                        <div className="input-group mb-2">
                            <span className="input-group-text bg-primary text-white">
                                <FaBuilding />
                            </span>
                            <input
                                type="text"
                                className="form-control py-2"
                                placeholder="Institution Name"
                                name="institution.name"
                                value={formData.institution.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="input-group mb-2">
                            <span className="input-group-text bg-primary text-white">
                                <FaEnvelope />
                            </span>
                            <input
                                type="email"
                                className="form-control py-2"
                                placeholder="Institution Email"
                                name="institution.email"
                                value={formData.institution.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <span className="input-group-text bg-primary text-white">
                                <FaMapMarkerAlt />
                            </span>
                            <input
                                type="text"
                                className="form-control py-2"
                                placeholder="Institution Address"
                                name="institution.address"
                                value={formData.institution.address}
                                onChange={handleChange}
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
                                <FaUserPlus className="me-2" />
                            )}
                            {isLoading ? 'Registering...' : 'Register'}
                        </button>
                    </motion.div>
                </motion.form>

                <motion.div
                    className="text-center mt-4"
                    variants={itemVariants}
                >
                    <p>Already have an account? <a href="/verifier-login" className="text-decoration-none">Login</a></p>
                    <a href="/" className="text-decoration-none d-block mt-2">Back to Home</a>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default VerifierRegister;