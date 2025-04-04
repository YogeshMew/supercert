import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../../config';
import contractABI from '../../contractJson/Lock.json';
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion';
import { FaEthereum, FaUser, FaEnvelope, FaGraduationCap, FaBuilding, FaExclamationCircle, FaInfoCircle, FaCheckCircle, FaCloudUploadAlt, FaImage, FaExclamationTriangle, FaShieldAlt, FaSpinner, FaTimesCircle, FaFileAlt, FaRedo } from 'react-icons/fa';
import api from '../../utils/axiosConfig';
import './AddDocument.css';
import { CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Define the keyframes animation for the spinner
const spinnerKeyframes = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

// Function to convert file to base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

// Add this CSS style to the top of the component with other keyframes
const imagePreviewStyles = `
.marksheet-preview {
    max-width: 100%;
    max-height: 400px;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-preview-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
}

.analysis-img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.analysis-img:hover {
    transform: scale(1.02);
}
`;

const AddDocument = () => {
    const navigate = useNavigate();
    const [stateAcc, setStateAcc] = useState({});
    const [account, setAccount] = useState('Not connected');
    const [isLoading, setIsLoading] = useState(false);
    const [formValues, setFormValues] = useState({
        Name: "",
        email: "",
        batch: "",
        dept: ""
    });

    const [uploadedDocument, setUploadedDocument] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState('');
    const [troubleshootingTips, setTroubleshootingTips] = useState([]);
    const [templateValidation, setTemplateValidation] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [isPdfReady, setIsPdfReady] = useState(false);

    // New states for document verification
    const [verificationResults, setVerificationResults] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const [formErrors, setFormErrors] = useState({});
    const [error, setError] = useState('');
    const [present, setPresent] = useState('');
    const [added, setAdded] = useState('');
    const [verificationDetails, setVerificationDetails] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));

    const [formData, setFormData] = useState({
        studentName: '',
        board: '',
        program: '',
        seatNumber: '',
        examYear: '',
        subjects: []
    });

    const [previewImage, setPreviewImage] = useState(null);
    const [documentFile, setDocumentFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('upload');
    const [errorMessage, setErrorMessage] = useState('');

    // Verification results section styling
    const getScoreColor = (score) => {
        if (score >= 0.7) return '#38a169'; // Green
        if (score >= 0.4) return '#dd6b20'; // Orange
        return '#e53e3e'; // Red
    };

    const getScoreLabel = (score) => {
        if (score >= 0.7) return 'Good';
        if (score >= 0.4) return 'Moderate';
        return 'Poor';
    };

    const getVerificationStatusColor = (verified) => {
        return verified ? '#38a169' : '#e53e3e';
    };

    // Fetch available templates on component mount
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await axios.get('http://localhost:5000/templates');
                if (response.data.success && response.data.templates.length > 0) {
                    setTemplates(response.data.templates);
                    setSelectedTemplate(response.data.templates[0]);
                    console.log('Templates loaded from Python service:', response.data.templates);
                }
            } catch (err) {
                console.error('Error fetching templates from Python service:', err);
                setError('Failed to load document templates. Make sure the Python service is running on port 5000.');
            }
        };

        fetchTemplates();
    }, []);

    // Handle template selection
    const handleTemplateChange = (e) => {
        setSelectedTemplate(e.target.value);
        // Reset verification results when template changes
        setVerificationResults(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
            setFormValues({ ...formValues, [name]: value });
        
        // Clear error when user makes changes
                    setFormErrors({
                        ...formErrors,
            [name]: ''
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload a valid image file (JPG, JPEG, PNG)');
                    return;
                }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB');
                    return;
                }
            
            // Set image file
            setUploadedDocument({file, preview: URL.createObjectURL(file)});
            
            try {
                // Convert to base64 for preview and PDF inclusion
                const base64 = await fileToBase64(file);
                setImagePreview(base64);
                setError('');
                
                // Clear extracted data when a new image is uploaded
                setExtractedData(null);
                setPdfDocument(null);
                setIsPdfReady(false);
                setVerificationResults(null);
                
                // Don't automatically process - wait for verification
                // await processDocumentImage(file);
            } catch (error) {
                console.error('Error processing image:', error);
                setError('Error processing image. Please try a different file.');
            }
        }
    };

    const handleVerifyDocument = async () => {
        try {
            setVerifying(true);
            setVerificationError(null);
            setError(null);

            if (!uploadedDocument) {
                setError('Please upload a document first');
                setVerifying(false);
                return;
            }

            console.log('Starting document verification...');
            const formData = new FormData();
            formData.append('document', uploadedDocument.file);

            console.log('Sending verification request to backend...');
            // Call our Node.js API which forwards to the Python service
            const response = await api.post('/api/template-verifier/verify', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log('Verification response:', response.data);

            if (response.data.success) {
                setVerificationResults({
                    verified: response.data.verified,
                    template: response.data.template,
                    scores: response.data.scores,
                    visualizationUrl: response.data.visualizationUrl
                });
                
                // If document is verified, we could auto-proceed or let user click the button
                if (response.data.verified) {
                    // Option to auto-proceed:
                    // setTimeout(() => processDocumentImage(selectedFile), 1500);
                }
            } else {
                setVerificationError(response.data.message || 'Verification failed');
            }
        } catch (error) {
            console.error('Error verifying document:', error);
            let errorMessage = 'Failed to verify document. ';
            
            if (error.response) {
                console.error('Error response:', error.response.data);
                errorMessage += error.response.data?.message || `Server error: ${error.response.status}`;
            } else if (error.request) {
                console.error('No response received:', error.request);
                errorMessage += 'No response from verification service. Please ensure the service is running.';
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            
            setVerificationError(errorMessage);
        } finally {
            setVerifying(false);
        }
    };

    const extractDataAnyway = () => {
        // Process document image even if verification failed
        if (uploadedDocument) {
            processDocumentImage(uploadedDocument.file);
        }
    };

    const processDocumentImage = async (file) => {
        try {
            setIsExtracting(true);
            setError(null);
            
            // Create form data with the uploaded image
            const formData = new FormData();
            formData.append('document', file);
            
            // Extract data directly without template matching
            const response = await axios.post('http://localhost:5001/api/documents/extract', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to extract data from document');
            }
            
            const extractedData = response.data.extractedData;
            
            // Add the image preview to the extracted data
            extractedData.imageSource = imagePreview;
            
            // Set the extracted data for display and form submission
            setExtractedData(extractedData);
            
            // Auto-fill form fields with extracted data
            handleAutoFill(extractedData);
            
            // Generate PDF
            await generatePdf(extractedData);
            
            setIsExtracting(false);
        } catch (error) {
            console.error('Error in document processing:', error);
            setError('Failed to process document: ' + (error.message || 'Unknown error'));
            setIsExtracting(false);
        }
    };

    const generatePdf = async (data) => {
        try {
            console.log('Generating PDF for data:', JSON.stringify(data, null, 2));
            
            // Include the image source in the data but resize/compress it first
            let imageSource = imagePreview;
            
            // If image is too large, resize it to avoid PayloadTooLargeError
            if (imageSource && imageSource.length > 1000000) { // If larger than ~1MB
                try {
                    // Create an image element to resize
                    const img = new Image();
                    img.src = imageSource;
                    
                    // Wait for image to load
                    await new Promise(resolve => {
                        img.onload = resolve;
                    });
                    
                    // Create canvas for resizing
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Maintain aspect ratio while reducing size
                    const maxDimension = 1200;
                    if (width > height && width > maxDimension) {
                        height = (height * maxDimension) / width;
                        width = maxDimension;
                    } else if (height > maxDimension) {
                        width = (width * maxDimension) / height;
                        height = maxDimension;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw resized image to canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Get reduced quality base64
                    imageSource = canvas.toDataURL('image/jpeg', 0.7);
                    console.log('Image resized for PDF generation');
                } catch (resizeError) {
                    console.error('Error resizing image:', resizeError);
                    // Continue with original image if resize fails
                }
            }
            
            const dataWithImage = { 
                ...data,
                imageSource: imageSource
            };
            
            // Generate PDF from the extracted data with image
            const response = await axios.post('http://localhost:5001/api/extract/generate-pdf', dataWithImage, {
                responseType: 'blob'
            });
            
            // Create a blob URL for the PDF
            const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
            setPdfDocument(pdfBlob);
            
            // Convert blob to File object for submission
            const pdfFile = new File([pdfBlob], `transcript_${data.studentName || 'document'}.pdf`, { type: 'application/pdf' });
            setFormValues(prev => ({ ...prev, Document: pdfFile }));
            
            setIsPdfReady(true);
            
            return true;
        } catch (error) {
            console.error('PDF generation error:', error);
            setError('Failed to generate PDF from extracted data. Please try again.');
            return false;
        }
    };

    const handleAutoFill = (data) => {
        // Update form values with extracted data
        const updatedFormValues = { ...formValues };
        
        if (data.studentName) updatedFormValues.Name = data.studentName;
        if (data.batch) updatedFormValues.batch = data.batch;
        if (data.program) updatedFormValues.dept = data.program;
        
        setFormValues(updatedFormValues);
    };

    useEffect(() => {
        const initializeBlockchain = async () => {
            try {
                const { ethereum } = window;
                if (!ethereum) {
                    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
                }

                // Request account access
                const accounts = await ethereum.request({
                    method: "eth_requestAccounts"
                });

                if (!accounts || accounts.length === 0) {
                    throw new Error("No accounts found. Please connect your MetaMask wallet.");
                }

                setAccount(accounts[0]);

                // Initialize provider and signer
                const provider = new ethers.providers.Web3Provider(ethereum);
                const signer = provider.getSigner();

                // Check if connected to the correct network (Sepolia)
                const network = await provider.getNetwork();
                if (network.chainId !== 11155111) { // Sepolia chainId
                    throw new Error("Please connect to Sepolia test network");
                }

                // Initialize contract
                console.log('Contract address:', CONTRACT_ADDRESS);
                
                // First verify the contract exists
                const code = await provider.getCode(CONTRACT_ADDRESS);
                if (code === "0x") {
                    throw new Error("No contract found at the specified address. Please verify the contract is deployed on Sepolia network.");
                }

                const contract = new ethers.Contract(
                    CONTRACT_ADDRESS,
                    contractABI.abi,
                    signer
                );

                // Verify contract is properly initialized
                try {
                    const isInitialized = await contract.isInitialized();
                    if (!isInitialized) {
                        throw new Error("Contract is not properly initialized");
                    }

                    const owner = await contract.owner();
                    const currentAccount = await signer.getAddress();
                    
                    if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
                        throw new Error("Connected account is not the contract owner. Only the owner can store documents.");
                    }

                    console.log("Contract initialized successfully");
                    setStateAcc({ provider, signer, contract });
                } catch (error) {
                    console.error("Contract initialization error:", error);
                    if (error.message.includes("execution reverted")) {
                        throw new Error("Contract call failed. Please verify you are connected to Sepolia network and the contract is properly deployed.");
                    }
                    throw error;
                }

                // Setup event listeners
                ethereum.on("accountsChanged", (newAccounts) => {
                    setAccount(newAccounts[0] || 'Not connected');
                    window.location.reload();
                });

                ethereum.on("chainChanged", () => {
                    window.location.reload();
                });

            } catch (error) {
                console.error("Blockchain initialization error:", error);
                setError(error.message);
            }
        };

        initializeBlockchain();

        return () => {
            if (window.ethereum) {
                window.ethereum.removeAllListeners();
            }
        };
    }, []);

    const validate = (values) => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
        const batchRegex = /^[0-9]{4}$/; // Exactly 4 digits for year

        if (!values.Name?.trim()) {
            errors.Name = "Name is required!";
        }

        if (!values.email) {
            errors.email = "Email is required!";
        } else if (!emailRegex.test(values.email)) {
            errors.email = "Please enter a valid email address!";
        }

        if (!values.batch) {
            errors.batch = "Batch is required!";
        } else if (!batchRegex.test(values.batch)) {
            errors.batch = "Please enter a valid 4-digit graduation year!";
        } else {
            const year = parseInt(values.batch);
            const currentYear = new Date().getFullYear();
            if (year < currentYear - 10 || year > currentYear + 5) {
                errors.batch = `Batch year must be between ${currentYear - 10} and ${currentYear + 5}`;
            }
        }

        if (!values.dept?.trim()) {
            errors.dept = "Department is required!";
        }

        // Only check for Document if we don't have extracted data that can be used to generate a PDF
        if (!extractedData && (!isPdfReady || !values.Document)) {
            errors.Document = "Please extract data from the image first!";
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setPresent('');
        setAdded('');

        try {
            // Force check for extracted data
            if (!extractedData) {
                throw new Error("Please extract data from the image first.");
            }

            // For Maharashtra documents, ensure fields are properly set
            const isMaharashtraDocument = extractedData.board && extractedData.board.includes('MAHARASHTRA');
            if (isMaharashtraDocument) {
                console.log('Processing Maharashtra board document for submission...');
                
                // Ensure program is set to SSC if appropriate
                if (!extractedData.program && extractedData.rawText && 
                    extractedData.rawText.match(/(?:SECONDARY|S\.S\.C\.|SSC)[.\s]*(?:CERTIFICATE|SCHOOL|EXAM)/i)) {
                    extractedData.program = 'SSC';
                    console.log('Set program to SSC based on document content');
                }
                
                // Ensure we have a roll/seat number
                if (!extractedData.seatNumber && !extractedData.rollNumber) {
                    console.log('Creating placeholder roll number for Maharashtra document');
                    extractedData.rollNumber = `MH${Math.floor(10000000 + Math.random() * 90000000)}`;
                }
                
                // Ensure we have a year
                if (!extractedData.examYear && !extractedData.batch) {
                    console.log('Setting default year for Maharashtra document');
                    extractedData.examYear = new Date().getFullYear().toString();
                }
                
                // Update batch from exam year if needed
                if (!extractedData.batch && extractedData.examYear) {
                    extractedData.batch = extractedData.examYear;
                    // Also update form values
                    setFormValues(prev => ({ ...prev, batch: extractedData.examYear }));
                }
                
                // Enforce program name in form values if needed
                if (extractedData.program && (!formValues.dept || formValues.dept.trim() === '')) {
                    setFormValues(prev => ({ ...prev, dept: extractedData.program }));
                }
            }

            // Always regenerate PDF before submission to ensure it has the latest data
            setPresent("Generating PDF document...");
            
            // Create a smaller version of the image for the PDF
            let imageSource = imagePreview;
            if (imageSource && imageSource.length > 800000) { // If larger than ~800KB
                try {
                    // Create an image element to resize
                    const img = new Image();
                    img.src = imageSource;
                    
                    // Wait for image to load
                    await new Promise(resolve => {
                        img.onload = resolve;
                    });
                    
                    // Create canvas for resizing
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Maintain aspect ratio while reducing size
                    const maxDimension = 800;
                    if (width > height && width > maxDimension) {
                        height = (height * maxDimension) / width;
                        width = maxDimension;
                    } else if (height > maxDimension) {
                        width = (width * maxDimension) / height;
                        height = maxDimension;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw resized image to canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Get reduced quality base64
                    imageSource = canvas.toDataURL('image/jpeg', 0.6);
                    console.log('Image resized for PDF generation');
                } catch (resizeError) {
                    console.error('Error resizing image:', resizeError);
                }
            }
            
            // Create PDF data object with resized image and ensure all required fields
            const pdfData = { 
                ...extractedData,
                imageSource: imageSource
            };
            
            if (isMaharashtraDocument) {
                // Ensure essential fields are set for PDF generation
                pdfData.program = pdfData.program || 'SSC';
                pdfData.seatNumber = pdfData.seatNumber || pdfData.rollNumber;
                pdfData.examYear = pdfData.examYear || pdfData.batch || new Date().getFullYear().toString();
            }
            
            try {
                // Generate PDF from the cleaned data with image
                const response = await axios.post('http://localhost:5001/api/extract/generate-pdf', pdfData, {
                    responseType: 'blob'
                });
                
                // Create a blob URL for the PDF
                const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
                setPdfDocument(pdfBlob);
                
                // Convert blob to File object for submission
                const pdfFile = new File([pdfBlob], `transcript_${extractedData.studentName || 'document'}.pdf`, { type: 'application/pdf' });
                setFormValues(prev => ({ ...prev, Document: pdfFile }));
                
                setIsPdfReady(true);
            } catch (pdfError) {
                console.error('PDF generation error:', pdfError);
                throw new Error("Failed to generate PDF. Please try extracting data again or use a clearer image.");
            }

            // For Maharashtra documents, ensure consistent field usage
            if (isMaharashtraDocument) {
                if (!extractedData.seatNumber && extractedData.rollNumber) {
                    extractedData.seatNumber = extractedData.rollNumber;
                    console.log('Using roll number as seat number for Maharashtra document');
                }
                
                // Ensure batch is set for the form validation
                if (!formValues.batch && extractedData.examYear) {
                    setFormValues(prev => ({ ...prev, batch: extractedData.examYear }));
                }
            }

            // Network connectivity check
            if (!navigator.onLine) {
                throw new Error("No internet connection. Please check your network.");
            }

            // Form validation 
            const errors = validate(formValues);
            
            // Modify validation for the Document field - we've already checked for PDF above
            if (errors.Document) {
                delete errors.Document;
            }
            
            // For Maharashtra documents, be more lenient with form validation
            if (isMaharashtraDocument) {
                if (errors.dept && extractedData.program) {
                    delete errors.dept;
                    // Update form value
                    setFormValues(prev => ({ ...prev, dept: extractedData.program }));
                }
                
                if (errors.batch && (extractedData.examYear || extractedData.batch)) {
                    delete errors.batch;
                    const year = extractedData.examYear || extractedData.batch;
                    setFormValues(prev => ({ ...prev, batch: year }));
                }
            }
            
            setFormErrors(errors);
            if (Object.keys(errors).length > 0) {
                throw new Error("Please fix all form errors before submitting");
            }

            // Blockchain connection checks
            if (!stateAcc.contract) {
                throw new Error("Blockchain connection not initialized. Please check your wallet connection.");
            }

            // Check if MetaMask is locked
            const { ethereum } = window;
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error("MetaMask is locked. Please unlock your wallet and try again.");
            }

            // Verify owner status again before proceeding
            const owner = await stateAcc.contract.owner();
            const currentAccount = await stateAcc.signer.getAddress();
            if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
                throw new Error("Connected account is not the contract owner. Only the owner can store documents.");
            }

            // Ensure we have a Document file
            if (!formValues.Document) {
                throw new Error("Could not find the PDF document. Please try regenerating the PDF.");
            }

            // Upload to IPFS
            try {
                // Create form data with the PDF document
                const formdata = new FormData();
                formdata.append("file", formValues.Document);
                formdata.append("name", formValues.Name);
                formdata.append("email", formValues.email);
                formdata.append("batch", formValues.batch);
                formdata.append("department", formValues.dept);
                
                setPresent("Uploading document to IPFS...");
                const response = await axios.post('http://localhost:5001/ipfsDocs', formdata);
                // Extract the CID from the response object
                const ipfsHash = response.data.cid;
                console.log('IPFS Hash:', ipfsHash);

                // Check if hash exists
                setPresent("Checking if document already exists...");
                const exists = await stateAcc.contract.hashExists(ipfsHash);
                if (exists) {
                    throw new Error("This document already exists in the blockchain");
                }

                // Estimate gas with a larger buffer for string operations
                setPresent("Estimating transaction cost...");
                const gasEstimate = await stateAcc.contract.estimateGas.storeHash(ipfsHash);
                const gasLimit = gasEstimate.mul(150).div(100); // Add 50% buffer for safety

                // Store hash in blockchain with specific gas settings
                setPresent("Storing document hash in blockchain...");
                const tx = await stateAcc.contract.storeHash(ipfsHash, {
                    gasLimit,
                    gasPrice: await stateAcc.provider.getGasPrice()
                });

                console.log('Transaction sent:', tx.hash);
                setPresent("Waiting for transaction confirmation...");
                
                const receipt = await tx.wait(1);
                console.log('Transaction receipt:', receipt);

                if (receipt.status === 1) {
                    // Store student info
                    setPresent("Storing student information...");
                    const studentData = {
                        name: formValues.Name,
                        email: formValues.email,
                        batch: formValues.batch,
                        dept: formValues.dept,
                        CID: ipfsHash
                    };

                    await axios.post('http://localhost:5001/studentInfo', studentData);

                    // Send email notification
                    setPresent("Sending email notification...");
                    await api.post('/ipfsDocs/sendemail', {
                        email: formValues.email,
                        hash: ipfsHash,
                        name: formValues.Name,
                        institution: stateAcc.user?.institution || 'ST FRANCIS INSTITUTE OF TECHNOLOGY'
                    });

                    setAdded("Document added successfully!");
                    setTimeout(() => navigate("/admin"), 2000);
                } else {
                    throw new Error("Transaction failed");
                }

            } catch (error) {
                console.error('Operation failed:', error);
                throw error;
            }
        } catch (error) {
            console.error('Submission error:', error);
            setError(error.message || "Unknown error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    // Render score with color indication
    const renderScoreWithIndicator = (score) => {
        let status = 'Poor';
        let className = 'score-poor';
        
        if (score >= 80) {
            status = 'Good';
            className = 'score-good';
        } else if (score >= 50) {
            status = 'Fair';
            className = 'score-fair';
        }
        
        return (
            <div className={`score-indicator ${className}`}>
                {score.toFixed(1)}% <span className="score-label">{status}</span>
            </div>
        );
    };

    // Add the verification results UI rendering
    const renderVerificationResults = () => {
        if (!verificationResults) return null;
        
        const { verified, scores, matchedTemplate, analysis } = verificationResults;
        
        return (
            <div className={`verification-results-card ${verified ? 'verified' : 'not-verified'}`}>
                <div className="verification-status">
                    {verified ? (
                        <>
                            <FaCheckCircle className="verified-icon" />
                            <h4>Document Verified</h4>
                        </>
                    ) : (
                        <>
                            <FaTimesCircle className="not-verified-icon" />
                            <h4>Verification Failed</h4>
                        </>
                    )}
                </div>
                
                <div className="verification-details">
                    {matchedTemplate && (
                        <div className="matched-template">
                            <span>Matched Template:</span> 
                            <strong>{matchedTemplate}</strong>
                        </div>
                    )}
                    
                    {scores && (
                        <div className="verification-scores">
                            <div className="score-header">Similarity Scores:</div>
                            
                            {Object.entries(scores).map(([key, value]) => (
                                key !== 'overall' && (
                                    <div className="score-item" key={key}>
                                        <span className="score-label">{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                        <div className="score-bar-container">
                                            <div 
                                                className="score-bar" 
                                                style={{width: `${Math.round(value * 100)}%`, backgroundColor: getScoreColor(value)}}
                                            ></div>
                                            <span className="score-value">{Math.round(value * 100)}%</span>
                                        </div>
                                    </div>
                                )
                            ))}
                            
                            <div className="overall-score">
                                <span>Overall:</span>
                                <strong style={{color: getScoreColor(scores.overall)}}>
                                    {Math.round(scores.overall * 100)}%
                                </strong>
                            </div>
                        </div>
                    )}
                    
                    {(analysis || verificationResults.visualizationUrl) && (
                        <div className="analysis-image">
                            <h4>Verification Analysis</h4>
                            <img 
                                src={verificationResults.visualizationUrl || 
                                    (verificationResults.analysis?.startsWith('http') 
                                        ? verificationResults.analysis 
                                        : `http://localhost:5000/uploads/${verificationResults.analysis || ''}`)}
                                alt="Document verification analysis" 
                                className="analysis-img"
                                onClick={() => window.open(
                                    verificationResults.visualizationUrl || 
                                    (verificationResults.analysis?.startsWith('http')
                                        ? verificationResults.analysis
                                        : `http://localhost:5000/uploads/${verificationResults.analysis || ''}`), 
                                    '_blank'
                                )}
                            />
                            <small>Click on image to view in full size</small>
                        </div>
                    )}
                </div>
                
                <div className="verification-actions">
                    {verified ? (
                        <button 
                            className="proceed-btn"
                            onClick={() => processDocumentImage(uploadedDocument.file)}
                        >
                            Proceed to Data Extraction
                        </button>
                    ) : (
                        <div className="verification-failed-actions">
                            <button 
                                className="retry-verification-btn"
                                onClick={handleVerifyDocument}
                            >
                                <FaRedo />
                                Retry Verification
                            </button>
                            <button 
                                className="proceed-anyway-btn"
                                onClick={() => processDocumentImage(uploadedDocument.file)}
                            >
                                <FaExclamationTriangle />
                                Proceed Anyway
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Template selection and verification section
    const renderVerificationSection = () => {
        if (!uploadedDocument) return null;

        return (
            <div className="verify-document-section">
                <h3>Document Verification</h3>
                
                {/* Verification button */}
                {!verificationResults ? (
                    <button 
                        className={`verify-document-btn ${verifying ? 'loading' : ''}`}
                        onClick={handleVerifyDocument} 
                        disabled={verifying || !uploadedDocument}
                    >
                        {verifying ? (
                            <>
                                <FaSpinner className="spinner" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <FaShieldAlt />
                                Verify Document
                            </>
                        )}
                    </button>
                ) : null}
                
                {/* Verification in progress */}
                {verifying && (
                    <div className="verification-loading">
                        <div className="loading-spinner"></div>
                        <p>Analyzing document...</p>
                    </div>
                )}
                
                {/* Verification error */}
                {verificationError && (
                    <div className="verification-error">
                        <p>{verificationError}</p>
                        <button onClick={() => setVerificationError(null)}>Dismiss</button>
                    </div>
                )}
                
                {/* Verification results */}
                {verificationResults && (
                    <div className={`verification-results-card ${verificationResults.verified ? 'verified' : 'not-verified'}`}>
                        <div className="verification-header">
                            <div className="verification-status">
                                <span className={`status-icon ${verificationResults.verified ? 'verified-icon' : 'not-verified-icon'}`}>
                                    {verificationResults.verified ? '✓' : '✗'}
                                </span>
                                <h4>{verificationResults.verified ? 'Document Verified' : 'Verification Failed'}</h4>
                            </div>
                            
                            {verificationResults.template && (
                                <div className="matched-template">
                                    <span>Matched template:</span> {verificationResults.template.replace(/\.[^/.]+$/, '')}
                                </div>
                            )}
                        </div>
                        
                        {/* Scores display */}
                        {verificationResults.scores && (
                            <div className="verification-scores">
                                {Object.entries(verificationResults.scores).map(([key, value]) => {
                                    if (key === 'overall') return null; // Skip overall score here
                                    return (
                                        <div className="score-item" key={key}>
                                            <span className="score-label">{key.replace('_similarity', '').replace(/_/g, ' ')}</span>
                                            <div className="score-bar-container">
                                                <div 
                                                    className={`score-bar ${value >= 0.7 ? 'high' : value >= 0.4 ? 'medium' : 'low'}`}
                                                    style={{ width: `${value * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="score-value">{Math.round(value * 100)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {/* Visualization */}
                        <div className="verification-visualization">
                            {verificationResults.visualizationUrl && (
                                <img 
                                    src={verificationResults.visualizationUrl} 
                                    alt="Document verification analysis" 
                                    className="verification-image"
                                />
                            )}
                        </div>
                        
                        <div className="verification-actions">
                            <button 
                                className="retry-verification-btn"
                                onClick={() => setVerificationResults(null)}
                            >
                                Retry Verification
                            </button>
                            
                            <button 
                                className="proceed-extraction-btn"
                                onClick={handleProceedToExtraction}
                                disabled={!canProceedToExtraction()}
                            >
                                {verificationResults.verified 
                                    ? 'Extract Data' 
                                    : 'Extract Data Anyway'}
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Confirmation dialog for proceeding with unverified document */}
                {confirmDialogOpen && (
                    <div className="confirmation-dialog">
                        <div className="dialog-content">
                            <h4>Warning: Document Not Verified</h4>
                            <p>The document did not pass verification. Proceeding with data extraction may lead to errors or incorrect data.</p>
                            <p>Do you want to proceed anyway?</p>
                            <div className="dialog-actions">
                                <button onClick={() => setConfirmDialogOpen(false)}>Cancel</button>
                                <button 
                                    className="proceed-anyway-btn"
                                    onClick={() => {
                                        setConfirmDialogOpen(false);
                                        setCurrentStep(2); // Proceed to extraction step
                                    }}
                                >
                                    Proceed Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Function to determine if we can proceed to extraction
    const canProceedToExtraction = () => {
        if (!verificationResults) return false;
        // Allow proceeding even if verification failed
        return true;
    };

    // Handle proceeding to data extraction
    const handleProceedToExtraction = () => {
        if (verificationResults && verificationResults.verified) {
            setCurrentStep(2); // Move to data extraction step directly
        } else {
            // Show confirmation dialog before proceeding with unverified document
            setConfirmDialogOpen(true);
        }
    };

    // Add this function for backward compatibility after the handleVerifyDocument function
    const verifyDocument = handleVerifyDocument;

    return (
        <div className="add-document-container">
            <style>{spinnerKeyframes}</style>
            <style>{imagePreviewStyles}</style>
            <h2 className="page-title">Add New Document</h2>
            <div className="blockchain-connection">
                <p>Blockchain Connection: <span className="connected-status">Connected • {account.slice(0, 7)}...{account.slice(-4)}</span></p>
            </div>

            <div className="document-process">
                <div className="process-step">
                    <h3 className="step-title">1. Upload Marksheet Image</h3>
                    <div className="image-upload-container">
                        {uploadedDocument?.preview ? (
                            <div className="image-preview-container">
                                <img 
                                    src={uploadedDocument.preview} 
                                    alt="Marksheet Preview" 
                                    className="marksheet-preview" 
                                />
                                <button 
                                    className="change-image-btn"
                                    onClick={() => document.getElementById('marksheet-upload').click()}
                                >
                                    Change Image
                                </button>
                            </div>
                        ) : (
                            <div 
                                className="upload-area"
                                onClick={() => document.getElementById('marksheet-upload').click()}
                            >
                                <FaCloudUploadAlt className="upload-icon" />
                                <p>Click to upload marksheet image</p>
                                <span className="file-format-info">Supported formats: JPG, PNG, JPEG</span>
                            </div>
                        )}
                        <input 
                            type="file" 
                            id="marksheet-upload" 
                            accept="image/jpeg,image/png,image/jpg" 
                            onChange={handleImageUpload}
                            className="file-input" 
                        />
                    </div>

                    {uploadedDocument && (
                        <div className="verify-document-section">
                            {!extractedData && (
                                <>
                                    <button 
                                        className={`verify-document-btn ${verifying ? 'loading' : ''}`}
                                        onClick={handleVerifyDocument} 
                                        disabled={verifying || !uploadedDocument}
                                    >
                                        {verifying ? (
                                            <>
                                                <FaSpinner className="spinner" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <FaShieldAlt />
                                                Verify Document
                                            </>
                                        )}
                                    </button>

                                    {error && (
                                        <div className="verification-error">
                                            <FaExclamationCircle />
                                            {error}
                                        </div>
                                    )}

                                    {verificationResults && (
                                        <div className={`verification-results-card ${verificationResults.verified ? 'verified' : 'not-verified'}`}>
                                            <div className="verification-status">
                                                {verificationResults.verified ? (
                                                    <>
                                                        <FaCheckCircle className="verify-icon verified" />
                                                        <h3>Document Verified</h3>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaTimesCircle className="verify-icon not-verified" />
                                                        <h3>Document Not Verified</h3>
                                                    </>
                                                )}
                                            </div>
                                            
                                            <div className="matched-template">
                                                <span className="template-label">Matched Template:</span>
                                                <span className="template-name">{verificationResults.template || verificationResults.matchedTemplate || 'Unknown'}</span>
                                            </div>
                                            
                                            <div className="scores-container">
                                                <h4>Similarity Scores</h4>
                                                <div className="score-items">
                                                    {verificationResults.scores && Object.entries(verificationResults.scores).map(([key, value]) => {
                                                        if (key !== 'overall') {
                                                            const scorePercent = Math.round(value * 100);
                                                            const scoreClass = scorePercent >= 70 ? 'high' : (scorePercent >= 40 ? 'medium' : 'low');
                                                            
                                                            return (
                                                                <div className="score-item" key={key}>
                                                                    <span className="score-label">{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                                                                    <div className="score-bar-container">
                                                                        <div 
                                                                            className={`score-bar ${scoreClass}`} 
                                                                            style={{width: `${scorePercent}%`}}
                                                                        ></div>
                                                                        <span className="score-value">{scorePercent}%</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                    
                                                    {verificationResults.scores?.overall && (
                                                        <div className="score-item overall">
                                                            <span className="score-label">Overall:</span>
                                                            <div className="score-bar-container">
                                                                <div 
                                                                    className={`score-bar ${verificationResults.verified ? 'high' : 'low'}`} 
                                                                    style={{width: `${Math.round(verificationResults.scores.overall * 100)}%`}}
                                                                ></div>
                                                                <span className="score-value">{Math.round(verificationResults.scores.overall * 100)}%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {verificationResults.analysis && (
                                                <div className="analysis-image">
                                                    <h4>Verification Analysis</h4>
                                                    <img 
                                                        src={verificationResults.analysis.startsWith('http') 
                                                            ? verificationResults.analysis 
                                                            : `http://localhost:5000/uploads/${verificationResults.analysis}`} 
                                                        alt="Document verification analysis" 
                                                        className="analysis-img"
                                                        onClick={() => window.open(verificationResults.analysis.startsWith('http')
                                                            ? verificationResults.analysis
                                                            : `http://localhost:5000/uploads/${verificationResults.analysis}`, '_blank')}
                                                    />
                                                    <small>Click on image to view in full size</small>
                                                </div>
                                            )}
                                            
                                            {!verificationResults.verified && (
                                                <button 
                                                    className="extract-anyway-btn" 
                                                    onClick={extractDataAnyway}
                                                >
                                                    <FaFileAlt />
                                                    Extract Data Anyway
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="process-step">
                    <h3 className="step-title">2. Extracted Data</h3>
                    {isExtracting ? (
                        <div className="loading-spinner-container">
                            <div className="loading-spinner"></div>
                            <p>Extracting data from document...</p>
                        </div>
                    ) : extractedData ? (
                        <div className="extracted-data-container">
                            <div className="data-container">
                                <div className="extraction-results">
                                    <h4>Extracted Information</h4>
                                    <div className="data-item">
                                        <span className="label">Name:</span>
                                        <span className="value">{extractedData.studentName || 'Not detected'}</span>
                                    </div>
                                    <div className="data-item">
                                        <span className="label">Roll/Seat No:</span>
                                        <span className="value">{extractedData.rollNumber || extractedData.seatNumber || 'Not detected'}</span>
                                    </div>
                                    <div className="data-item">
                                        <span className="label">Board/University:</span>
                                        <span className="value">{extractedData.board || extractedData.university || 'Not detected'}</span>
                                    </div>
                                    <div className="data-item">
                                        <span className="label">Batch/Year:</span>
                                        <span className="value">{extractedData.batch || extractedData.examYear || 'Not detected'}</span>
                                    </div>
                                    <div className="data-item">
                                        <span className="label">Program:</span>
                                        <span className="value">{extractedData.program || 'Not detected'}</span>
                                    </div>
                                </div>
                                
                                {isPdfReady && pdfDocument && (
                                    <div className="pdf-container">
                                        <h4>Generated PDF Document</h4>
                                        <div className="pdf-viewer">
                                            <iframe 
                                                src={URL.createObjectURL(pdfDocument)} 
                                                width="100%" 
                                                height="400px" 
                                                title="Generated PDF"
                                            />
                                        </div>
                                        
                                        <div className="pdf-actions">
                                            <button 
                                                className="regenerate-pdf-btn" 
                                                onClick={async () => {
                                                    try {
                                                        setIsLoading(true);
                                                        setPresent("Regenerating PDF document...");
                                                        await generatePdf(extractedData);
                                                        setPresent('');
                                                        setError('');
                                                    } catch (error) {
                                                        console.error('PDF regeneration error:', error);
                                                        setError("Failed to regenerate PDF: " + (error.message || "Unknown error"));
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                            >
                                                Regenerate PDF
                                            </button>
                                            
                                            <a 
                                                href={URL.createObjectURL(pdfDocument)} 
                                                download={`transcript_${extractedData?.studentName || 'document'}.pdf`}
                                                className="download-pdf-btn"
                                            >
                                                Download PDF
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="extraction-placeholder">
                            <FaInfoCircle className="info-icon" />
                            <p>Upload and verify a document to extract data</p>
                        </div>
                    )}
                </div>

                <div className="process-step">
                    <h3 className="step-title">3. Document Information</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="Name">
                                <FaUser className="input-icon" />
                                <span>Full Name</span>
                            </label>
                            <input 
                                type="text"
                                id="Name"
                                name="Name"
                                className={`form-control ${formErrors.Name ? 'error' : ''}`}
                                placeholder="Enter full name"
                                value={formValues.Name}
                                onChange={handleChange}
                                required
                            />
                            {formErrors.Name && <span className="error-message">{formErrors.Name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                <FaEnvelope className="input-icon" />
                                <span>Email</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className={`form-control ${formErrors.email ? 'error' : ''}`}
                                placeholder="Enter email address"
                                value={formValues.email}
                                onChange={handleChange}
                                required
                            />
                            {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="batch">
                                    <FaGraduationCap className="input-icon" />
                                    <span>Batch Year</span>
                                </label>
                                <input
                                    type="text"
                                    id="batch"
                                    name="batch"
                                    className={`form-control ${formErrors.batch ? 'error' : ''}`}
                                    placeholder="Graduation year"
                                    value={formValues.batch}
                                    onChange={handleChange}
                                    required
                                />
                                {formErrors.batch && <span className="error-message">{formErrors.batch}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="dept">
                                    <FaBuilding className="input-icon" />
                                    <span>Department</span>
                                </label>
                                <input
                                    type="text"
                                    id="dept"
                                    name="dept"
                                    className={`form-control ${formErrors.dept ? 'error' : ''}`}
                                    placeholder="Enter department"
                                    value={formValues.dept}
                                    onChange={handleChange}
                                    required
                                />
                                {formErrors.dept && <span className="error-message">{formErrors.dept}</span>}
                            </div>
                        </div>

                        {error && <div className="error-alert"><FaExclamationCircle /> {error}</div>}
                        {present && <div className="present-alert"><div className="spinner-small"></div> {present}</div>}
                        {added && <div className="success-alert"><FaCheckCircle /> {added}</div>}

                        <button 
                            type="submit" 
                            style={{
                                width: '100%',
                                backgroundColor: isLoading ? '#9CA3AF' : 
                                                      (!extractedData) ? '#9CA3AF' : '#4F46E5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '14px 20px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: (isLoading || !extractedData) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '20px 0',
                                boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)',
                                opacity: (isLoading || !extractedData) ? 0.7 : 1
                            }}
                            disabled={
                                isLoading || 
                                (!extractedData)
                            }
                        >
                            {isLoading ? (
                                <span>Processing... 
                                    <span style={{
                                        display: 'inline-block',
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(255, 255, 255, 0.3)',
                                        borderRadius: '50%',
                                        borderTopColor: 'white',
                                        animation: 'spin 1s ease-in-out infinite',
                                        marginLeft: '8px'
                                    }}></span>
                                </span>
                            ) : (
                                <span><FaEthereum style={{marginRight: '10px'}} /> Submit to Blockchain</span>
                            )}
                        </button>
                        
                        {(!extractedData) ? (
                            <div className="submit-warning">
                                <FaExclamationCircle />
                                <p>Please upload a document image before submission</p>
                            </div>
                        ) : (
                            <div className="info-note">
                                <FaInfoCircle />
                                <p>Data extracted successfully. PDF has been generated and is ready for submission.</p>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddDocument;
