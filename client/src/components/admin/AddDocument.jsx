import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../../config';
import contractABI from '../../contractJson/Lock.json';
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion';
import { FaEthereum, FaUser, FaEnvelope, FaGraduationCap, FaBuilding, FaExclamationCircle, FaInfoCircle, FaCheckCircle, FaCloudUploadAlt, FaImage, FaExclamationTriangle, FaShieldAlt, FaSpinner, FaTimesCircle, FaFileAlt, FaRedo, FaExchangeAlt } from 'react-icons/fa';
import api from '../../utils/axiosConfig';
import './AddDocument.css';
import { CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PersonIcon from '@mui/icons-material/Person';
import NumbersIcon from '@mui/icons-material/Numbers';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import EmailIcon from '@mui/icons-material/Email';
import DateRangeIcon from '@mui/icons-material/DateRange';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckIcon from '@mui/icons-material/Check';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';

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

/* Score styling */
.scores-container {
    margin-top: 20px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
}

.scores-container h4 {
    margin: 0;
    padding: 12px 15px;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
}

.score-items {
    padding: 15px;
}

.score-item {
    margin-bottom: 15px;
}

.score-item:last-child {
    margin-bottom: 0;
}

.score-label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #4b5563;
    font-size: 14px;
}

.score-bar-container {
    height: 8px;
    background-color: #e5e7eb;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
}

.score-bar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;
}

.score-bar.high {
    background-color: #10b981;
}

.score-bar.medium {
    background-color: #f59e0b;
}

.score-bar.low {
    background-color: #ef4444;
}

.score-value {
    position: absolute;
    right: 5px;
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 2px 5px;
    border-radius: 2px;
    z-index: 1;
}
`;

// Add CSS for visualization
const visualizationStyles = `
.visualization-container {
    margin-top: 20px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    padding-bottom: 15px;
}

.visualization-container h4 {
    margin: 0;
    padding: 12px 15px;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
}

.visualization-image {
    max-width: 100%;
    max-height: 300px;
    display: block;
    margin: 15px auto 0;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
}

.submit-blockchain-btn {
    margin-top: 20px;
    padding: 12px 20px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.submit-blockchain-btn:hover:not(:disabled) {
    background-color: #2563eb;
}

.submit-blockchain-btn:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
}

.submit-blockchain-btn .spinner {
    margin-left: 10px;
    animation: spin 1s linear infinite;
    display: inline-block;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
`;

const AddDocument = () => {
    const navigate = useNavigate();
    const [stateAcc, setStateAcc] = useState({});
    const [account, setAccount] = useState('Not connected');
    const [isLoading, setIsLoading] = useState(false);
    
    // Define API_URL constants with fallbacks
    const API_URL = 'http://localhost:5000';  // Primary API endpoint
    const BACKUP_API_URL = 'http://localhost:5000'; // Backup API endpoint
    const [loadingMessage, setLoadingMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // Consolidate form state
    const [formValues, setFormValues] = useState({
        Name: "",
        email: "",
        batch: "",
        dept: "",
        Document: null,
        fullName: "",
        rollNo: "",
        dob: "",
        board: "",
        batchYear: "",
        department: "",
        program: "",
        examYear: ""
    });

    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [uploadedDocument, setUploadedDocument] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [extractionError, setExtractionError] = useState('');
    const [troubleshootingTips, setTroubleshootingTips] = useState([]);
    const [templateValidation, setTemplateValidation] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [isPdfReady, setIsPdfReady] = useState(false);

    // New states for document verification
    const [verificationResults, setVerificationResults] = useState(null);
    const [verificationError, setVerificationError] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const [formErrors, setFormErrors] = useState({});
    const [error, setError] = useState('');
    const [present, setPresent] = useState('');
    const [added, setAdded] = useState('');
    const [verificationDetails, setVerificationDetails] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));

    const [previewImage, setPreviewImage] = useState(null);
    const [documentFile, setDocumentFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('upload');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Restore the isExtracting state variable
    const [isExtracting, setIsExtracting] = useState(false);

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
                console.log('Fetching templates...');
                // Try primary endpoint
                try {
                    const response = await axios.get('http://localhost:5000/api/templates');
                    if (response.data && response.data.templates) {
                    setTemplates(response.data.templates);
                    setSelectedTemplate(response.data.templates[0]);
                        console.log('Templates loaded:', response.data.templates);
                        return;
                    }
                } catch (primaryError) {
                    console.warn('Primary template endpoint failed:', primaryError);
                }

                // Try backup endpoint
                try {
                    const backupResponse = await axios.get('http://localhost:5000/templates');
                    if (backupResponse.data && backupResponse.data.templates) {
                        setTemplates(backupResponse.data.templates);
                        setSelectedTemplate(backupResponse.data.templates[0]);
                        console.log('Templates loaded from backup:', backupResponse.data.templates);
                        return;
                    }
                } catch (backupError) {
                    console.warn('Backup template endpoint failed:', backupError);
                }

                // Set default templates if both endpoints fail
                console.log('Using default templates as fallback');
                const defaultTemplates = [
                    "marksheet_ssc_2",
                    "marksheet_ssc_3",
                    "marksheet_hsc"
                ];
                setTemplates(defaultTemplates);
                setSelectedTemplate(defaultTemplates[0]);
            } catch (error) {
                console.error('Error fetching templates:', error);
                // Set emergency fallback templates
                const emergencyTemplates = [
                    "SSC_Template",
                    "HSC_Template"
                ];
                setTemplates(emergencyTemplates);
                setSelectedTemplate(emergencyTemplates[0]);
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

    // Update the validate function
    const validate = (values) => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
        const batchRegex = /^[0-9]{4}$/;

        if (!values.Name?.trim() && !values.fullName?.trim()) {
            errors.Name = "Name is required!";
        }

        if (!values.email) {
            errors.email = "Email is required!";
        } else if (!emailRegex.test(values.email)) {
            errors.email = "Please enter a valid email address!";
        }

        if (!values.batch && !values.batchYear) {
            errors.batch = "Batch is required!";
        } else {
            const batchValue = values.batch || values.batchYear;
            if (!batchRegex.test(batchValue)) {
                errors.batch = "Please enter a valid 4-digit graduation year!";
            } else {
                const year = parseInt(batchValue);
                const currentYear = new Date().getFullYear();
                if (year < currentYear - 10 || year > currentYear + 5) {
                    errors.batch = `Batch year must be between ${currentYear - 10} and ${currentYear + 5}`;
                }
            }
        }

        if (!values.dept?.trim() && !values.department?.trim()) {
            errors.dept = "Department is required!";
        }

        return errors;
    };

    // Update form change handler
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues(prev => ({
            ...prev,
            [name]: value,
            // Update corresponding fields
            ...(name === 'fullName' ? { Name: value } : {}),
            ...(name === 'department' ? { dept: value } : {}),
            ...(name === 'batchYear' ? { batch: value } : {})
        }));
        
        // Clear error when user makes changes
        setFormErrors(prev => ({
            ...prev,
            [name]: ''
        }));
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

            // Try primary verification endpoint
            try {
                console.log('Trying primary verification endpoint...');
                const response = await axios.post('http://localhost:5000/api/verify', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 10000
                });

                if (response.data.success) {
                    setVerificationResults({
                        verified: response.data.isVerified,
                        template: response.data.template,
                        scores: response.data.scores,
                        visualizationUrl: response.data.visualizationUrl,
                        message: response.data.message,
                        filename: response.data.filename
                    });

                    // If verification is successful, extract data
                    if (response.data.isVerified) {
                        try {
                            const extractFormData = new FormData();
                            extractFormData.append('document', uploadedDocument.file);
                            
                            const extractResponse = await axios.post('http://localhost:5000/api/extract', extractFormData, {
                                headers: {
                                    'Content-Type': 'multipart/form-data'
                                }
                            });

                            if (extractResponse.data.success) {
                                setExtractedData(extractResponse.data);
                                handleAutoFill(extractResponse.data);
                                // No longer generate PDF during verification
                                // await generatePdfFromImage();
                                setIsPdfReady(false); // Reset PDF status
                            }
                        } catch (extractError) {
                            console.error('Data extraction error:', extractError);
                            setError('Document verified but data extraction failed. Please try again.');
                        }
                    }
                } else {
                    setVerificationError(response.data.message || 'Verification failed');
                }
            } catch (error) {
                console.error('Verification error:', error);
                setVerificationError('Error during verification. Please try again.');
            }
        } catch (error) {
            console.error('Verification process error:', error);
            setVerificationError('Error during verification process. Please try again.');
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
            console.log('Starting document data extraction...');
            
            // Create form data with the uploaded image
            const formData = new FormData();
            formData.append('document', file);
            
            let extractedData = null;
            let extractionSource = 'primary';
            
            // Try multiple endpoints with error handling
            try {
                console.log('Attempting primary extraction endpoint...');
            // Extract data directly without template matching
            const response = await axios.post('http://localhost:5001/api/documents/extract', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                    },
                    timeout: 12000 // Increased timeout
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to extract data from document');
            }
            
                console.log('Primary extraction successful:', response.data);
                extractedData = response.data.extractedData;
            } catch (firstError) {
                extractionSource = 'backup';
                console.error('Primary extraction endpoint failed:', firstError);
                
                try {
                    console.log('Attempting backup extraction endpoint...');
                    // Try alternative endpoint
                    const response = await axios.post('http://localhost:5000/extract', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        },
                        timeout: 12000 // Increased timeout
                    });
                    
                    console.log('Backup extraction response:', response.data);
                    extractedData = response.data.extractedData || {
                        studentName: formValues.fullName || formValues.Name,
                        batch: formValues.batchYear || formValues.batch,
                        program: formValues.program || formValues.dept
                    };
                } catch (secondError) {
                    extractionSource = 'fallback';
                    console.error('Backup extraction endpoint failed:', secondError);
                    
                    // Fallback to form values if extraction fails
                    console.log('Using fallback extraction with existing form values');
                    extractedData = {
                        studentName: formValues.fullName || formValues.Name || 'Unknown Student',
                        batch: formValues.batchYear || formValues.batch || '',
                        program: formValues.program || formValues.dept || '',
                        board: formValues.board || '',
                        email: formValues.email || ''
                    };
                }
            }
            
            // Add the image preview to the extracted data
            extractedData.imageSource = imagePreview;
            console.log(`Data extraction complete (source: ${extractionSource})`, extractedData);
            
            // Set the extracted data for display and form submission
            setExtractedData(extractedData);
            
            // Auto-fill form fields with extracted data
            console.log('Auto-filling form with extracted data');
            handleAutoFill(extractedData);
            
            // Generate PDF
            console.log('Starting PDF generation from extracted data');
            await generatePdf(extractedData);
            console.log('PDF generation complete');
            
            setIsExtracting(false);
        } catch (error) {
            console.error('Error in document processing:', error);
            setError('Failed to process document: ' + (error.message || 'Unknown error'));
            setIsExtracting(false);
            
            // Try to generate PDF with form values if extraction fails
            console.log('Attempting emergency PDF generation with form values');
            const formData = {
                studentName: formValues.fullName || formValues.Name || 'Unknown Student',
                batch: formValues.batchYear || formValues.batch || 'N/A',
                program: formValues.program || formValues.dept || 'N/A',
                email: formValues.email || 'N/A',
                imageSource: imagePreview
            };
            
            setExtractedData(formData);
            try {
                await generatePdf(formData);
                console.log('Emergency PDF generation successful');
            } catch (pdfError) {
                console.error('Emergency PDF generation failed:', pdfError);
            }
        }
    };

    const generatePdf = async (data) => {
        try {
            console.log('Generating PDF for data:', JSON.stringify(data, null, 2));
            
            // Include the image source in the data but resize/compress it first
            let imageSource = imagePreview;
            
            // Merge data with all form values to ensure complete information
            const completeData = {
                studentName: data.studentName || formValues.fullName || formValues.Name || 'Unknown Student',
                rollNumber: data.rollNumber || formValues.rollNo || 'N/A',
                seatNumber: data.seatNumber || formValues.rollNo || 'N/A',
                board: data.board || formValues.board || 'N/A',
                batch: data.batch || formValues.batchYear || formValues.batch || 'N/A',
                program: data.program || formValues.program || formValues.dept || 'N/A',
                email: data.email || formValues.email || 'N/A',
                examYear: data.examYear || formValues.examYear || 'N/A',
                
                // Document verification info
                verified: verificationResults?.verified || false,
                template: verificationResults?.template || 'Unknown',
                verificationScore: verificationResults?.scores?.overall || 0,
                
                // Image data without heading
                rawImageOnly: true,
                imageSource: imageSource,
                
                // Explicitly indicate to remove DOB field
                includeDOB: false
            };
            
            console.log('Sending complete data for PDF generation:', completeData);
            
            // If image is too large or needs processing, resize it
            if (imageSource) {
                try {
                    const img = new Image();
                    img.src = imageSource;
                    
                    await new Promise(resolve => {
                        img.onload = resolve;
                    });
                    
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    console.log(`Original image dimensions: ${width}x${height}`);
                    
                    // For certificates, we need to ensure proper orientation
                    // Check if image is in landscape and needs rotation
                    const isLandscape = width > height;
                    if (isLandscape) {
                        console.log('Image is in landscape orientation - preparing for portrait display');
                        // For the canvas we'll keep the original dimensions
                        // The server will handle the rotation for the PDF
                    }
                    
                    // Define maximum dimensions to avoid excessive file sizes
                    // Use a higher limit to ensure the full certificate is visible
                    const maxDimension = 1500;
                    if (Math.max(width, height) > maxDimension) {
                        if (width > height) {
                            width = maxDimension;
                            height = Math.floor(maxDimension * (img.height / img.width));
                        } else {
                            height = maxDimension;
                            width = Math.floor(maxDimension * (img.width / img.height));
                        }
                        console.log(`Resized to ${width}x${height}`);
                    }
                    
                    // Add some padding to ensure the full certificate is captured
                    const padding = 20;
                    const paddedWidth = width + (padding * 2);
                    const paddedHeight = height + (padding * 2);
                    
                    // Set canvas dimensions with padding
                    canvas.width = paddedWidth;
                    canvas.height = paddedHeight;
                    
                    const ctx = canvas.getContext('2d');
                    
                    // Fill with white background
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, paddedWidth, paddedHeight);
                    
                    // Draw image with padding on all sides
                    ctx.drawImage(img, padding, padding, width, height);
                    
                    // Use high quality JPEG for certificates
                    completeData.imageSource = canvas.toDataURL('image/jpeg', 0.95);
                    console.log('Image processed for PDF generation with padding to show full certificate');
                } catch (resizeError) {
                    console.error('Error processing image:', resizeError);
                }
            }
            
            // Try to generate PDF using the Flask endpoint
            let response;
            try {
                response = await axios.post('http://localhost:5000/api/extract/generate-pdf', completeData, {
                    responseType: 'blob',
                    timeout: 60000 // Increase timeout to 60 seconds
                });
            } catch (error) {
                console.error('PDF generation error:', error);
                throw error;
            }
            
            if (!response.data || response.data.size === 0) {
                throw new Error('Server returned an empty PDF');
            }
            
            // Create the PDF blob and file
            const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
            const fileName = `transcript_${completeData.studentName}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
            
            // Set both the PDF document and form values
            setPdfDocument(pdfBlob);
            setFormValues(prev => ({ ...prev, Document: pdfFile }));
            setIsPdfReady(true);
            
            // Log success
            console.log('PDF generated successfully:', fileName);
            
            // Return the generated files for immediate use
            return { success: true, blob: pdfBlob, file: pdfFile };
        } catch (error) {
            console.error('PDF generation error:', error);
            setError('Failed to generate PDF: ' + (error.message || 'Unknown error'));
            return { success: false };
        }
    };

    const handleAutoFill = (data) => {
        console.log('Auto-filling form with data:', data);
        
        // Create a comprehensive mapping from extraction data to form fields
        setFormValues(prev => {
            // Map student name (handling various property names)
            const studentName = data.studentName || data.name || data.full_name || data.student_name || '';
            
            // Map batch/year data
            const batchValue = data.batch || data.batchYear || data.graduation_year || data.year || data.passing_year || '';
            
            // Map program/department data
            const programValue = data.program || data.dept || data.department || data.stream || data.course || '';
            
            // Map board data
            const boardValue = data.board || data.university || data.institution || data.school_board || '';
            
            // Map roll/seat number
            const rollNoValue = data.rollNumber || data.roll_no || data.seatNumber || data.seat_no || data.registration_no || '';
            
            // Map exam year
            const examYearValue = data.examYear || data.exam_year || data.year_of_examination || '';
            
            // Map email (typically preserve existing unless clearly provided)
            const emailValue = data.email || prev.email || '';
            
            console.log('Mapped form values:', {
                name: studentName,
                batch: batchValue,
                program: programValue,
                board: boardValue,
                rollNo: rollNoValue,
                examYear: examYearValue
            });
            
            return {
                ...prev,
                // Set all name-related fields
                Name: studentName,
                fullName: studentName,
                
                // Set all batch/year related fields
                batch: batchValue,
                batchYear: batchValue,
                
                // Set all program/department related fields
                dept: programValue,
                department: programValue,
                program: programValue,
                
                // Set board
                board: boardValue,
                
                // Set rollNo
                rollNo: rollNoValue,
                
                // Set examYear
                examYear: examYearValue,
                
                // Set email (preserve existing unless new one provided)
                email: emailValue,
                
                // Mark fields as filled
                autoFilled: true
            };
        });
    };

    // Add a function to normalize board/program type for analytics
    const normalizeBoardType = (board, program) => {
        // Convert to uppercase for case-insensitive comparison and trim whitespace
        const boardUpper = (board || '').toUpperCase().trim();
        const programUpper = (program || '').toUpperCase().trim();

        // Direct match check first (exact matches)
        if (programUpper === 'SSC' || programUpper === 'SECONDARY SCHOOL CERTIFICATE' ||
            boardUpper === 'SSC' || boardUpper === 'SECONDARY SCHOOL CERTIFICATE') {
            return 'SSC';
        }
        
        if (programUpper === 'HSC' || programUpper === 'HIGHER SECONDARY CERTIFICATE' ||
            boardUpper === 'HSC' || boardUpper === 'HIGHER SECONDARY CERTIFICATE') {
            return 'HSC';
        }

        // Exact lowercase matches check
        if (program?.toLowerCase().trim() === 'ssc' || board?.toLowerCase().trim() === 'ssc') {
            return 'SSC';
        }
        
        if (program?.toLowerCase().trim() === 'hsc' || board?.toLowerCase().trim() === 'hsc') {
            return 'HSC';
        }

        // Define arrays of indicators for each type
        const sscIndicators = [
            'SSC',
            'SECONDARY SCHOOL CERTIFICATE',
            'SECONDARY SCHOOL',
            'MATRICULATION',
            'MATRIC',
            '10TH',
            'TENTH',
            'CLASS 10',
            'CLASS X',
            'GRADE 10',
            'GRADE X',
            'SECONDARY'
        ];
        
        const hscIndicators = [
            'HSC',
            'HIGHER SECONDARY CERTIFICATE',
            'HIGHER SECONDARY',
            'INTERMEDIATE',
            '12TH',
            'TWELFTH',
            'CLASS 12',
            'CLASS XII',
            'GRADE 12',
            'GRADE XII',
            'PUC',
            'PRE-UNIVERSITY',
            'SENIOR SECONDARY'
        ];
        
        // Check for SSC indicators in both board and program
        if (sscIndicators.some(indicator => 
            boardUpper.includes(indicator) || programUpper.includes(indicator)
        )) {
            return 'SSC';
        }
        
        // Check for HSC indicators in both board and program
        if (hscIndicators.some(indicator => 
            boardUpper.includes(indicator) || programUpper.includes(indicator)
        )) {
            return 'HSC';
        }
        
        // Partial match check for SSC (case-insensitive)
        if (program?.toLowerCase().includes('ssc') || board?.toLowerCase().includes('ssc') ||
            program?.toLowerCase().includes('secondary') || board?.toLowerCase().includes('10th')) {
            return 'SSC';
        }
        
        // Partial match check for HSC (case-insensitive)
        if (program?.toLowerCase().includes('hsc') || board?.toLowerCase().includes('hsc') ||
            program?.toLowerCase().includes('higher secondary') || board?.toLowerCase().includes('12th')) {
            return 'HSC';
        }
        
        // Default to Other if not specifically SSC or HSC
        return 'Other';
    };

    useEffect(() => {
        const initializeBlockchain = async () => {
            try {
                console.log('Initializing blockchain connection...');
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
                console.log('Connected account:', accounts[0]);

                // Initialize provider and signer
                const provider = new ethers.providers.Web3Provider(ethereum);
                const signer = provider.getSigner();

                // Check if connected to the correct network (Sepolia)
                const network = await provider.getNetwork();
                console.log('Connected network:', network);
                
                if (network.chainId !== 11155111) {
                    throw new Error("Please connect to Sepolia test network");
                }

                // Initialize contract
                console.log('Initializing contract at address:', CONTRACT_ADDRESS);
                const contract = new ethers.Contract(
                    CONTRACT_ADDRESS,
                    contractABI.abi,
                    signer
                );

                // Verify contract exists
                const code = await provider.getCode(CONTRACT_ADDRESS);
                if (code === "0x") {
                    throw new Error("No contract found at the specified address");
                }

                    setStateAcc({ provider, signer, contract });
                console.log('Blockchain initialization complete');

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

    // Fix the sendEmailNotification function to handle different parameter formats
    const sendEmailNotification = async (emailOrStudent, name, documentHash) => {
        if (!emailOrStudent || emailOrStudent === 'N/A') {
            console.log('No email provided, skipping notification');
            return true; // Not an error, just skipping
        }

        // Clean up the email
        const email = typeof emailOrStudent === 'object' ? emailOrStudent.email : emailOrStudent;
        if (!email || email === 'N/A' || !email.includes('@')) {
            console.log(`Invalid email format: ${email}, skipping notification`);
            return true; // Not an error, just skipping
        }

        try {
            // Try primary endpoint
            const primaryEndpoint = 'http://localhost:5000/notifications/email';
            console.log(`Attempting to send email notification to ${email} via primary endpoint`);
            
            const response = await axios.post(primaryEndpoint, {
                email,
                name,
                documentHash,
                documentType: 'Certificate'
            });
            
            if (response.data.success) {
                console.log('Email notification sent successfully');
                return true;
            }
            
            // If primary fails, try backup endpoint
            console.log('Primary email service failed, trying backup...');
            const backupEndpoint = 'http://localhost:5000/api/notifications/email';
            
            const backupResponse = await axios.post(backupEndpoint, {
                email,
                name,
                documentHash,
                documentType: 'Certificate'
            });
            
            if (backupResponse.data.success) {
                console.log('Email notification sent successfully via backup service');
                return true;
            }
            
            // Both failed but we'll continue without error
            console.log('Email services unavailable, continuing without notification');
            return true;
            
        } catch (error) {
            console.warn('Failed to send email notification:', error.message);
            // Don't throw error, just log it and continue
            return true;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            // Validate all required fields are filled
            const errors = validate(formValues);
            if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                throw new Error('Please fill in all required fields');
            }
            
            // Generate PDF with student information first
            console.log('Generating PDF with student information...');
            const pdfResult = await generatePdf({
                studentName: formValues.fullName || formValues.Name || 'Unknown Student',
                rollNumber: formValues.rollNo || 'N/A',
                seatNumber: formValues.rollNo || 'N/A',
                board: formValues.board || 'N/A',
                batch: formValues.batchYear || formValues.batch || 'N/A',
                program: formValues.program || formValues.dept || 'N/A',
                email: formValues.email || 'N/A',
                examYear: formValues.examYear || 'N/A',
                imageSource: imagePreview,
                rawImageOnly: true,
                includeDOB: false
            });
            
            if (!pdfResult.success) {
                throw new Error('Failed to generate PDF with student information');
            }
            console.log('PDF generated successfully with student data');
            
            // Upload document to IPFS
            const formData = new FormData();
            formData.append('document', formValues.Document);
            formData.append('pdf', pdfResult.file);
            formData.append('student_name', formValues.Name || formValues.fullName || 'Unknown Student');
            formData.append('document_type', formValues.program || 'Document');
            formData.append('email', formValues.email || '');

            const response = await axios.post('http://localhost:5000/api/ipfs/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('IPFS upload response:', response);
            
            // Extract IPFS hash from the response, handling different response formats
            let ipfsHash = null;
            
            if (response && response.data) {
                console.log('IPFS response data structure:', JSON.stringify(response.data, null, 2));
                
                // Check if response is direct string
                if (typeof response.data === 'string') {
                    ipfsHash = response.data;
                    console.log('Using string response as IPFS hash:', ipfsHash);
                } 
                // Check if response is object with success flag
                else if (response.data.success) {
                    // Try all possible field names
                    const possibleFields = ['hash', 'IpfsHash', 'ipfsHash', 'cid', 'documentHash'];
                    
                    for (const field of possibleFields) {
                        if (response.data[field]) {
                            ipfsHash = response.data[field];
                            console.log(`Found IPFS hash in field "${field}":`, ipfsHash);
                            break;
                        }
                    }
                }
            }
            
            if (!ipfsHash) {
                console.error('No IPFS hash found in the response:', response.data);
                setError('Failed to extract IPFS hash from server response');
                setIsLoading(false);
                return;
            }

            console.log('Final document IPFS Hash being used:', ipfsHash);
            
            try {
                // Store student information
                const studentData = {
                    name: formValues.Name || formValues.fullName,
                    email: formValues.email,
                    batch: formValues.batch || formValues.batchYear,
                    program: formValues.program || formValues.dept,
                    board: formValues.board,
                    boardType: normalizeBoardType(formValues.board, formValues.program || formValues.dept),
                    documentHash: ipfsHash,
                    verificationScore: verificationResults?.scores?.overall || 0
                };
                
                const studentResponse = await axios.post('http://localhost:5000/students/store', studentData);
                console.log('Student information stored:', studentResponse.data);
                
                // Send email notification
                if (formValues.email) {
                    console.log('Sending email notification to:', formValues.email);
                    try {
                        await sendEmailNotification(
                            formValues.email, 
                            formValues.Name || formValues.fullName || 'Unknown Student',
                            ipfsHash
                        );
                        console.log('Email notification process completed');
                    } catch (emailError) {
                        console.log('Email notification could not be sent, but continuing with process:', emailError.message);
                        // Don't treat email errors as critical failures
                    }
                }
                
                // Submit to blockchain
                try {
                    if (!stateAcc.contract) {
                        throw new Error('Blockchain contract not initialized');
                    }
                    
                    // First check if the hash already exists
                    const exists = await stateAcc.contract.hashExists(ipfsHash);
                    if (exists) {
                        setSuccess('Document already registered on blockchain. No need to register again.');
                        setIsLoading(false);
                        return;
                    }
                    
                    // Modified blockchain transaction code with proper gas handling
                    console.log('Submitting hash to blockchain:', ipfsHash);
                    
                    try {
                        // Try to estimate gas, but fall back to direct transaction if not supported
                        let gasLimit;
                        try {
                            // Some contracts don't support estimateGas directly
                            const gasEstimate = await stateAcc.provider.estimateGas({
                                to: CONTRACT_ADDRESS,
                                data: stateAcc.contract.interface.encodeFunctionData("storeHash", [ipfsHash])
                            });
                            console.log('Estimated gas required:', gasEstimate.toString());
                            
                            // Add a 20% buffer to the gas estimate to handle fluctuations
                            gasLimit = Math.ceil(gasEstimate.toNumber() * 1.2);
                            console.log('Using gas limit with buffer:', gasLimit);
                        } catch (gasError) {
                            console.warn('Gas estimation failed, using default gas limit:', gasError);
                            // Use a reasonable default gas limit if estimation fails
                            gasLimit = 100000;
                            console.log('Using default gas limit:', gasLimit);
                        }
                        
                        // Send transaction with explicit gas limit - use storeHash instead of addHash
                        const tx = await stateAcc.contract.storeHash(ipfsHash, {
                            gasLimit: gasLimit
                        });
                        
                        console.log('Transaction submitted, hash:', tx.hash);
                        console.log('Waiting for confirmation...');
                        
                        const receipt = await tx.wait();
                        
                        // Check if transaction was successful
                        if (receipt.status === 0) {
                            throw new Error('Transaction failed - check blockchain explorer for details');
                        }
                        
                        console.log('Transaction confirmed in block:', receipt.blockNumber);
                        setSuccess('Document registered successfully on blockchain!');
                    } catch (txError) {
                        // Handle specific transaction errors
                        console.error('Transaction error:', txError);
                        throw txError; // Re-throw to be caught by outer catch block
                    }
                } catch (blockchainError) {
                    console.error('Blockchain transaction error:', blockchainError);
                    
                    // Handle specific error cases for better user feedback
                    if (blockchainError.message.includes('Hash already exists')) {
                        setSuccess('Document was already registered on blockchain. No need to register again.');
                    } else if (blockchainError.code === 4001 || blockchainError.message.includes('user denied') || blockchainError.message.includes('User denied transaction')) {
                        // MetaMask error code for user rejected transaction
                        setError('Transaction was rejected. Please approve the transaction in MetaMask to register the document.');
                        console.log('User denied transaction signature. This is expected behavior when a user chooses not to sign a transaction.');
                        // Display a more user-friendly message
                        setSuccess('You chose not to sign the transaction. The document was uploaded to IPFS but not registered on the blockchain.');
                    } else if (blockchainError.message.includes('insufficient funds')) {
                        setError('Insufficient funds in your wallet to complete this transaction.');
                    } else {
                        setError(`Failed to register document on blockchain: ${blockchainError.message}`);
                    }
                    setIsLoading(false);
                }
            } catch (processError) {
                console.error('Error processing document submission:', processError);
                setError(`Failed to process document: ${processError.message}`);
                setIsLoading(false);
            }
            
            setIsLoading(false);
            
        } catch (error) {
            console.error('Document submission error:', error);
            setError(`Failed to submit document: ${error.message}`);
            setIsLoading(false);
        }
    };

    // Add the missing generatePdfFromImage function before renderVerificationResults
    const generatePdfFromImage = async () => {
        try {
            // Ensure we have an image 
            if (!uploadedDocument || !imagePreview) {
                throw new Error('No document image available');
            }
            
            // Try to generate PDF
            const result = await generatePdf({
                studentName: formValues.fullName || formValues.Name || 'Unknown Student',
                rollNumber: formValues.rollNo || 'N/A',
                seatNumber: formValues.rollNo || 'N/A',
                // DOB removed
                board: formValues.board || 'N/A',
                batch: formValues.batchYear || formValues.batch || 'N/A',
                program: formValues.program || formValues.dept || 'N/A',
                email: formValues.email || 'N/A',
                examYear: formValues.examYear || 'N/A',
                imageSource: imagePreview,
                rawImageOnly: true,
                includeDOB: false
            });

            if (!result.success) {
                throw new Error('PDF generation failed');
            }
            
            return true;
        } catch (error) {
            console.error('PDF generation error:', error);
            setError('Failed to generate PDF: ' + (error.message || 'Unknown error'));
            return false;
        }
    };

    // Fix the renderVerificationResults function to properly display scores
    const renderVerificationResults = () => {
        if (!verificationResults) return null;
        
        const { verified, template, message, scores, filename } = verificationResults;
        
        // Define verification metrics to display
        const verificationMetrics = [
            { key: 'overall_score', label: 'Overall Score' },
            { key: 'logo_match', label: 'Logo Match' },
            { key: 'seal_match', label: 'Seal Match' },
            { key: 'template_match', label: 'Template Match' },
            { key: 'text_match', label: 'Text Match' }
        ];

        // Helper to get score color class
        const getScoreColorClass = (score) => {
            if (score >= 0.7) return 'high';
            if (score >= 0.5) return 'medium';
            return 'low';
        };
        
        return (
            <div className={`verification-results-card ${verified ? 'verified' : 'not-verified'}`}>
                <div className="verification-status">
                    <span className={`verify-icon ${verified ? 'verified' : 'not-verified'}`}>
                        {verified ? <CheckCircleIcon /> : <ErrorIcon />}
                    </span>
                    <h3>Verification {verified ? 'Successful' : 'Failed'}</h3>
                </div>
                
                {template && (
                <div className="matched-template">
                    <span className="template-label">Matched Template:</span>
                        {template}
                    </div>
                )}
                
                {message && <div className="verification-message">{message}</div>}
                
                {scores && (
                    <div className="scores-container">
                        <h4>Verification Scores</h4>
                        <div className="score-items">
                            {verificationMetrics.map((metric) => {
                                // Only display metrics that exist in the scores object
                                if (scores[metric.key] === undefined) return null;

                                const score = parseFloat(scores[metric.key]);
                                const scorePercentage = Math.round(score * 100);
                                const colorClass = getScoreColorClass(score);
                                    
                                    return (
                                    <div className="score-item" key={metric.key}>
                                        <div className="score-label">{metric.label}</div>
                                            <div className="score-bar-container">
                                                <div 
                                                className={`score-bar ${colorClass}`} 
                                                style={{ width: `${scorePercentage}%` }}
                                                ></div>
                                            <span className="score-value">{scorePercentage}%</span>
                                            </div>
                                        </div>
                                    );
                            })}
                        </div>
                    </div>
                )}
                
                {filename && (
                    <div className="visualization-container">
                        <h4>Match Visualization</h4>
                        <img 
                            src={`${API_URL}/verify/visualization/${filename}`} 
                            alt="Document Verification Visualization" 
                            className="visualization-image"
                        />
                    </div>
                )}
                
                <div className="verification-actions">
                    {verified ? (
                        <div className="verification-success-message">
                            <CheckIcon className="success-icon" />
                            Document verified successfully. Please fill in student information.
                        </div>
                    ) : (
                        <div className="verification-failed-actions">
                            <button 
                                className="retry-verification-btn" 
                                onClick={handleVerifyDocument}
                            >
                                <RefreshIcon style={{ fontSize: '16px' }} />
                                Retry Verification
                            </button>
                            <button 
                                className="extract-anyway-btn" 
                                onClick={extractDataAnyway}
                            >
                                <WarningIcon style={{ fontSize: '16px' }} />
                                Extract Anyway
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Add the missing renderImagePreview function
    const renderImagePreview = () => {
        if (uploadedDocument) {
            return (
                <div className="image-preview-container">
                    <img 
                        src={uploadedDocument.preview} 
                        alt="Marksheet preview" 
                        className="marksheet-preview" 
                    />
                    
                    <div className="upload-actions">
                        <label className="upload-new-btn">
                            <FaExchangeAlt /> Change Image
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                </div>
            );
        }
        
        return (
            <div className="document-upload-section">
                <label className="upload-btn">
                    <FaCloudUploadAlt className="upload-icon" />
                    <span>Upload Marksheet</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                    />
                </label>
                <p className="upload-instructions">
                    Upload a clear image of the marksheet for verification
                </p>
            </div>
        );
    };

    return (
        <div className="add-document-container">
            <style>{spinnerKeyframes}</style>
            <style>{imagePreviewStyles}</style>
            <style>{visualizationStyles}</style>
            <style>{`
                /* Verification results styling */
                .verification-results-card {
                    background: #f9f9f9;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 20px 0;
                    border-left: 4px solid #ccc;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                }
                
                .verification-results-card.verified {
                    border-left-color: #4caf50;
                }
                
                .verification-results-card.not-verified {
                    border-left-color: #f44336;
                }
                
                .verification-status {
                    display: flex;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .verification-status h3 {
                    margin: 0 0 0 10px;
                    font-size: 18px;
                }
                
                .verify-icon {
                    font-size: 24px;
                }
                
                .verify-icon.verified {
                    color: #4caf50;
                }
                
                .verify-icon.not-verified {
                    color: #f44336;
                }
                
                .matched-template {
                    margin-bottom: 12px;
                    font-size: 14px;
                }
                
                .template-label {
                    font-weight: 600;
                    margin-right: 8px;
                }
                
                .verification-message {
                    padding: 8px;
                    background: #f5f5f5;
                    border-radius: 4px;
                    margin-bottom: 12px;
                    font-size: 14px;
                }
                
                .verification-actions {
                    margin-top: 16px;
                    display: flex;
                    justify-content: flex-end;
                }
                
                .verification-success-message {
                    display: flex;
                    align-items: center;
                    color: #4caf50;
                }
                
                .success-icon {
                    margin-right: 8px;
                }
                
                .verification-failed-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .retry-verification-btn,
                .extract-anyway-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .retry-verification-btn {
                    background: #2196f3;
                    color: white;
                }
                
                .retry-verification-btn:hover {
                    background: #0d8bf2;
                }
                
                .extract-anyway-btn {
                    background: #ff9800;
                    color: white;
                }
                
                .extract-anyway-btn:hover {
                    background: #e68a00;
                }
            `}</style>
            <h2 className="page-title">Add New Document</h2>
            
            <div className="blockchain-connection">
                <span className="label">Blockchain Connection:</span>
                <span className={`status ${account !== 'Not connected' ? 'connected' : 'disconnected'}`}>
                    {account !== 'Not connected' ? 'Connected • ' + account.substring(0, 6) + '...' + account.substring(account.length - 4) : 'Not Connected'}
                </span>
            </div>
            
            <div className="document-processing-section">
                <div className="process-step">
                    <h3 className="step-title">1. Upload Marksheet Image</h3>
                    
                    {renderImagePreview()}
                    
                    {uploadedDocument && !verificationResults && (
                        <div className="verify-document-section">
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
                        </div>
                    )}
                    
                    {verifying && (
                        <div className="verification-loading">
                            <div className="loading-spinner"></div>
                            <p>Analyzing document...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="error-message">
                            <FaExclamationCircle />
                            <p>{error}</p>
                        </div>
                    )}
                    
                    {verificationResults && (
                        <div className={`verification-results-card ${verificationResults.verified ? 'verified' : 'not-verified'}`}>
                            <div className="verification-status">
                                <span className={`verify-icon ${verificationResults.verified ? 'verified' : 'not-verified'}`}>
                                    {verificationResults.verified ? <CheckCircleIcon /> : <ErrorIcon />}
                                </span>
                                <h3>Verification {verificationResults.verified ? 'Successful' : 'Failed'}</h3>
                </div>
                
                            {verificationResults.template && (
                                <div className="matched-template">
                                    <span className="template-label">Matched Template:</span>
                                    {verificationResults.template}
                        </div>
                            )}
                            
                            {verificationResults.message && <div className="verification-message">{verificationResults.message}</div>}
                            
                            <div className="verification-actions">
                                {verificationResults.verified ? (
                                    <div className="verification-success-message">
                                        <CheckIcon className="success-icon" />
                                        Document verified successfully. Please fill in student information.
                                        </div>
                                ) : (
                                    <div className="verification-failed-actions">
                                <button 
                                            className="retry-verification-btn" 
                                            onClick={handleVerifyDocument}
                                >
                                            <RefreshIcon style={{ fontSize: '16px' }} />
                                            Retry Verification
                                </button>
                                    <button 
                                            className="extract-anyway-btn" 
                                            onClick={extractDataAnyway}
                                    >
                                            <WarningIcon style={{ fontSize: '16px' }} />
                                            Extract Anyway
                                    </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="process-step">
                    <h3 className="step-title">2. Student Information</h3>
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="form-group">
                            <label htmlFor="fullName">
                                <PersonIcon /> Full Name
                            </label>
                    <input 
                        type="text"
                                id="fullName"
                        name="fullName"
                                className={`form-control ${formErrors.fullName ? 'is-invalid' : ''}`}
                                value={formValues.fullName}
                                onChange={handleChange}
                                placeholder="Enter full name"
                    />
                            {formErrors.fullName && (
                                <div className="invalid-feedback">
                                    {formErrors.fullName}
                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">
                                <EmailIcon /> Email
                            </label>
                    <input
                                type="email"
                                id="email"
                                name="email"
                                className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                                value={formValues.email}
                                onChange={handleChange}
                                placeholder="Enter email"
                            />
                            {formErrors.email && (
                                <div className="invalid-feedback">
                                    {formErrors.email}
                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="batch">
                                <NumbersIcon /> Batch
                            </label>
                    <input
                                type="text"
                                id="batch"
                                name="batch"
                                className={`form-control ${formErrors.batch ? 'is-invalid' : ''}`}
                                value={formValues.batch}
                                onChange={handleChange}
                                placeholder="Enter batch"
                            />
                            {formErrors.batch && (
                                <div className="invalid-feedback">
                                    {formErrors.batch}
                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="board">
                                <BusinessIcon /> Board
                            </label>
                    <input
                        type="text"
                                    id="board"
                        name="board"
                                className={`form-control ${formErrors.board ? 'is-invalid' : ''}`}
                                value={formValues.board}
                                onChange={handleChange}
                                placeholder="Enter board"
                            />
                            {formErrors.board && (
                                <div className="invalid-feedback">
                                    {formErrors.board}
                </div>
                            )}
                </div>
                        <div className="form-group">
                                <label htmlFor="batchYear">
                                <CalendarMonthIcon /> Batch Year
                                </label>
                    <input
                        type="text"
                                    id="batchYear"
                        name="batchYear"
                                className={`form-control ${formErrors.batchYear ? 'is-invalid' : ''}`}
                                value={formValues.batchYear}
                                onChange={handleChange}
                                placeholder="Enter batch year"
                            />
                            {formErrors.batchYear && (
                                <div className="invalid-feedback">
                                    {formErrors.batchYear}
                </div>
                            )}
                        </div>
                        <div className="form-group">
                                <label htmlFor="department">
                                <SchoolIcon /> Department
                                </label>
                    <input
                        type="text"
                                    id="department"
                        name="department"
                                className={`form-control ${formErrors.department ? 'is-invalid' : ''}`}
                                value={formValues.department}
                                onChange={handleChange}
                                    placeholder="Enter department"
                    />
                            {formErrors.department && (
                                <div className="invalid-feedback">
                                    {formErrors.department}
                </div>
                            )}
                </div>
                        <div className="form-group">
                            <label htmlFor="program">
                                <SchoolIcon /> Program
                            </label>
                    <input
                        type="text"
                        id="program"
                        name="program"
                                className={`form-control ${formErrors.program ? 'is-invalid' : ''}`}
                                value={formValues.program}
                                onChange={handleChange}
                                placeholder="Enter program"
                            />
                            {formErrors.program && (
                                <div className="invalid-feedback">
                                    {formErrors.program}
                </div>
                            )}
                        </div>
                <div className="form-group">
                    <label htmlFor="examYear">
                                <CalendarMonthIcon /> Exam Year
                    </label>
                    <input
                        type="text"
                        id="examYear"
                        name="examYear"
                                className={`form-control ${formErrors.examYear ? 'is-invalid' : ''}`}
                                value={formValues.examYear}
                                onChange={handleChange}
                        placeholder="Enter exam year"
                    />
                            {formErrors.examYear && (
                                <div className="invalid-feedback">
                                    {formErrors.examYear}
                </div>
                            )}
                        </div>
                <button 
                            type="button"
                            className="submit-blockchain-btn"
                    onClick={handleSubmit}
                            disabled={isLoading || !extractedData}
                >
                    {isLoading ? (
                                <span>
                                    Processing...
                                    <span className="spinner"></span>
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