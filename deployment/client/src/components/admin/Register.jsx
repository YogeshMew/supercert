import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaEnvelope, FaBuilding, FaMapMarkerAlt, FaUserPlus, FaKey, FaSpinner, FaCheck } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminRegister = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        activationCode: '',
        institution: {
            name: '',
            email: '',
            address: ''
        }
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifyingCode, setIsVerifyingCode] = useState(false);
    const [codeVerified, setCodeVerified] = useState(false);
    const [institutionDetected, setInstitutionDetected] = useState(false);
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
            
            // Reset code verification if activation code changes
            if (name === 'activationCode') {
                setCodeVerified(false);
                setInstitutionDetected(false);
            }
        }
    };
    
    const verifyActivationCode = async () => {
        if (!formData.activationCode) {
            setError('Please enter an activation code');
            return;
        }
        
        setIsVerifyingCode(true);
        setError('');
        
        try {
            // Verify the activation code
            const response = await axios.post('http://localhost:5001/api/activation-codes/verify', {
                code: formData.activationCode
            });
            
            if (response.data.valid) {
                setCodeVerified(true);
                toast.success('Activation code verified!');
                
                // Check if this is an institution-specific code
                if (response.data.institution) {
                    setInstitutionDetected(true);
                    // Pre-fill institution information
                    setFormData({
                        ...formData,
                        institution: {
                            name: response.data.institution.name || '',
                            email: response.data.institution.email || '',
                            address: response.data.institution.address || ''
                        }
                    });
                    toast.info('Institution information detected and pre-filled');
                }
            }
        } catch (error) {
            console.error('Verification Error:', error.response?.data || error.message);
            setError(error.response?.data?.message || 'Invalid activation code');
            setCodeVerified(false);
        } finally {
            setIsVerifyingCode(false);
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
        
        // Require code verification
        if (!codeVerified) {
            setError('Please verify your activation code before registering');
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://localhost:5001/user/register', {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: 'admin',
                activationCode: formData.activationCode,
                institution: {
                    name: formData.institution.name,
                    email: formData.institution.email,
                    address: formData.institution.address
                }
            });

            setSuccess('Registration successful! You can now login.');
            setTimeout(() => {
                navigate('/login');
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
            <ToastContainer position="top-right" autoClose={3000} />
            <motion.div
                className="card shadow-lg p-5"
                style={{ width: '500px', maxWidth: '90%', borderRadius: 'var(--border-radius-lg)' }}
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <motion.div className="text-center mb-4" variants={itemVariants}>
                    <h2 className="text-primary fw-bold">SUPERCERT</h2>
                    <p className="text-muted">Admin Registration</p>
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
                        <div className="input-group">
                            <span className="input-group-text bg-primary text-white">
                                <FaKey />
                            </span>
                            <input
                                type="text"
                                className="form-control py-2"
                                placeholder="Activation Code"
                                name="activationCode"
                                value={formData.activationCode}
                                onChange={handleChange}
                                required
                                disabled={codeVerified}
                            />
                            <button 
                                type="button" 
                                className={`btn ${codeVerified ? 'btn-success' : 'btn-outline-primary'}`}
                                onClick={verifyActivationCode}
                                disabled={isVerifyingCode || codeVerified || !formData.activationCode}
                            >
                                {isVerifyingCode ? (
                                    <FaSpinner className="fa-spin" />
                                ) : codeVerified ? (
                                    <FaCheck />
                                ) : (
                                    'Verify'
                                )}
                            </button>
                        </div>
                        <small className="form-text text-muted">
                            {codeVerified 
                                ? 'Activation code verified successfully!' 
                                : 'Enter the activation code provided by SuperCert administrators.'}
                        </small>
                    </motion.div>

                    <motion.div className="mb-3" variants={itemVariants}>
                        <h5 className="text-primary mb-3">Institution Information {institutionDetected && <span className="badge bg-info">Auto-detected</span>}</h5>
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
                                readOnly={institutionDetected}
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
                                readOnly={institutionDetected}
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
                                readOnly={institutionDetected}
                            />
                        </div>
                    </motion.div>

                    <motion.div className="d-grid gap-2 mt-4" variants={itemVariants}>
                        <button
                            type="submit"
                            className="btn btn-primary py-2 d-flex align-items-center justify-content-center gap-2"
                            disabled={isLoading || !codeVerified}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <FaUserPlus />
                                    <span>Register as Admin</span>
                                </>
                            )}
                        </button>
                    </motion.div>

                    <motion.div className="text-center mt-3" variants={itemVariants}>
                        <p className="mb-0">
                            Already have an account? <a href="/login" className="text-primary fw-bold">Login</a>
                        </p>
                    </motion.div>
                </motion.form>
            </motion.div>
        </div>
    );
};

export default AdminRegister;