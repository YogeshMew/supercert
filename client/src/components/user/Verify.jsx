import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../../config';
import contractABI from '../../contractJson/Lock.json';
import paymentContractABI from '../../contractJson/PaymentContract.json';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEthereum, FaFileAlt, FaSearch, FaUserGraduate, FaBuilding, FaEnvelope, FaGraduationCap } from 'react-icons/fa';

const PAYMENT_CONTRACT_ADDRESS = "0x3881E900B1C7aBb49705ab9Aceb2Aab399002a62";

const Verify = () => {
    const navigate = useNavigate();
    const [stateAcc, setStateAcc] = useState({});
    const [account, setAccount] = useState('Not connected');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [present, setPresent] = useState('');
    const [result, setResult] = useState('');
    const [isChecked, setIsChecked] = useState(false);
    const [formValues, setFormValues] = useState({
        Name: "",
        email: "",
        emailOfStudent: "",
        batch: "",
        CID: "",
        organizationName: ""
    });

    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setIsChecked(checked);
        } else {
            setFormValues({ ...formValues, [name]: value });
        }
    };

    useEffect(() => {
        const initializeBlockchain = async () => {
            try {
                const { ethereum } = window;
                if (!ethereum) {
                    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
                }

                const accounts = await ethereum.request({
                    method: "eth_requestAccounts"
                });

                if (!accounts || accounts.length === 0) {
                    throw new Error("No accounts found. Please connect your MetaMask wallet.");
                }

                setAccount(accounts[0]);

                const provider = new ethers.providers.Web3Provider(ethereum);
                const signer = provider.getSigner();

                const network = await provider.getNetwork();
                if (network.chainId !== 11155111) {
                    throw new Error("Please connect to Sepolia test network");
                }

                console.log('Contract address:', CONTRACT_ADDRESS);
                
                const code = await provider.getCode(CONTRACT_ADDRESS);
                if (code === "0x") {
                    throw new Error("No contract found at the specified address");
                }

                const contract = new ethers.Contract(
                    CONTRACT_ADDRESS,
                    contractABI.abi,
                    signer
                );

                try {
                    const isInitialized = await contract.isInitialized();
                    if (!isInitialized) {
                        throw new Error("Contract is not properly initialized");
                    }
                    console.log("Contract initialized successfully");
                    setStateAcc({ provider, signer, contract });
                } catch (error) {
                    console.error("Contract initialization error:", error);
                    throw error;
                }

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormErrors(validate(formValues));
        setIsSubmit(true);
        console.log(formValues);

        try {
            const { ethereum } = window;
            if (!ethereum) {
                throw new Error("Please install MetaMask!");
            }

            const provider = new ethers.providers.Web3Provider(ethereum);
            const signer = provider.getSigner();

            // Initialize contracts
            const verificationContract = new ethers.Contract(
                CONTRACT_ADDRESS,
                contractABI.abi,
                signer
            );

            // Get the proper checksum address for payment contract
            let paymentContractAddress = PAYMENT_CONTRACT_ADDRESS;

            // Verify the contract exists at this address
            const code = await provider.getCode(paymentContractAddress);
            if (code === '0x') {
                throw new Error('No contract found at the payment address');
            }

            const paymentContract = new ethers.Contract(
                paymentContractAddress,
                paymentContractABI.abi,
                signer
            );

            // First verify the document
            console.log("Verifying document with CID:", formValues.CID);
            const isValid = await verificationContract.hashExists(formValues.CID);
            console.log("Document verification result:", isValid);

            if (isValid) {
                try {
                    // Process payment - 0.01 ETH
                    const paymentAmount = ethers.utils.parseEther("0.01");
                    console.log("Processing payment of", ethers.utils.formatEther(paymentAmount), "ETH");
                    
                    const paymentTx = await paymentContract.fund({ 
                        value: paymentAmount,
                        gasLimit: 100000
                    });
                    
                    console.log("Payment transaction sent:", paymentTx.hash);
                    await paymentTx.wait();
                    console.log("Payment confirmed!");

                    // Save verification details
                    const postData = {
                        name: formValues.Name,
                        email: formValues.email,
                        emailOfStudent: formValues.emailOfStudent,
                        batch: formValues.batch,
                        CID: formValues.CID,
                        organizationName: formValues.organizationName,
                        transactionHash: paymentTx.hash
                    };

                    try {
                        // Send to backend with timeout
                        const response = await axios.post('http://localhost:5001/transactionInfo', postData, {
                            timeout: 10000, // 10 second timeout
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        console.log('Backend response:', response.data);
                        
                        // Open document in IPFS - Fix link opening
                        try {
                            console.log('Opening document in IPFS with CID:', formValues.CID);
                            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${formValues.CID}`;
                            console.log('IPFS URL:', ipfsUrl);
                            const newWindow = window.open(ipfsUrl, "_blank");
                            
                            // Check if the window was actually opened
                            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                                console.warn('Popup was blocked or failed to open');
                                setPresent("Document verified and payment processed successfully! Click here to view the document: " + 
                                    `<a href="${ipfsUrl}" target="_blank" style="color: blue; text-decoration: underline;">Open Document</a>`);
                            } else {
                                setPresent("Document verified and payment processed successfully!");
                            }
                        } catch (windowError) {
                            console.error('Error opening document:', windowError);
                            // Provide link as text that user can click manually
                            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${formValues.CID}`;
                            setPresent("Document verified and payment processed successfully! Click here to view the document: " + 
                                `<a href="${ipfsUrl}" target="_blank" style="color: blue; text-decoration: underline;">Open Document</a>`);
                        }
                    } catch (backendError) {
                        console.error("Backend communication error:", backendError);
                        // Even if backend communication fails, the transaction was successful on the blockchain
                        // So we still consider this a success but log the backend error
                        
                        // Open document in IPFS anyway - with same improved pattern
                        try {
                            console.log('Opening document in IPFS with CID (after backend error):', formValues.CID);
                            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${formValues.CID}`;
                            console.log('IPFS URL:', ipfsUrl);
                            const newWindow = window.open(ipfsUrl, "_blank");
                            
                            // Check if the window was actually opened
                            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                                console.warn('Popup was blocked or failed to open');
                                setPresent("Document verified and payment processed successfully! Click here to view the document: " + 
                                    `<a href="${ipfsUrl}" target="_blank" style="color: blue; text-decoration: underline;">Open Document</a>`);
                            } else {
                                setPresent("Document verified and payment processed successfully! (Note: Transaction record may not have been saved to the server)");
                            }
                        } catch (windowError) {
                            console.error('Error opening document:', windowError);
                            // Provide link as text that user can click manually
                            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${formValues.CID}`;
                            setPresent("Document verified and payment processed successfully! Click here to view the document: " + 
                                `<a href="${ipfsUrl}" target="_blank" style="color: blue; text-decoration: underline;">Open Document</a>`);
                        }
                    }
                } catch (paymentError) {
                    console.error("Payment failed:", paymentError);
                    setError(`Payment failed: ${paymentError.message}`);
                }
            } else {
                setPresent("Document verification failed - invalid or non-existent document");
            }

        } catch (error) {
            console.error("Verification process failed:", error);
            setError(error.message || "An error occurred during verification");
        }
    };

    const validate = (values) => {
        const errors = {};
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

        if (!values.Name) {
            errors.Name = "Name is required!";
        }
        if (!values.email) {
            errors.email = "Email is required!";
        } else if (!regex.test(values.email)) {
            errors.email = "This is not a valid email format!";
        }
        if (!values.emailOfStudent) {
            errors.emailOfStudent = "Student email is required!";
        } else if (!regex.test(values.emailOfStudent)) {
            errors.emailOfStudent = "This is not a valid email format!";
        }
        if (!values.batch) {
            errors.batch = "Batch is required!";
        }
        if (!values.CID) {
            errors.CID = "CID is required!";
        }
        if (!values.organizationName) {
            errors.organizationName = "Organization name is required!";
        }
        if (!isChecked) {
            errors.checkError = "Please agree to the payment terms";
        }
        return errors;
    };

    return (
        <div className="container mt-5">
            <div className="page-title" style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
                <h1 className="verify-document-title" style={{ color: "#111827", fontSize: "2.5rem", fontWeight: "700" }}>Verify Document</h1>
            </div>
            <div className="verify-document-container">
                <form onSubmit={handleSubmit}>
                    <div className="row mb-3">
                        <label className="col-sm-2 col-form-label">Name Of Verifer :</label>
                        <div className="col-sm-10">
                            <input type="text" className="form-control" name="Name" value={formValues.Name} onChange={handleChange} />
                            {formErrors.Name && <p className="text-red-500 text-xs italic">{formErrors.Name}</p>}
                        </div>
                    </div>
                    <div className="row mb-3">
                        <label className="col-sm-2 col-form-label">Email Of Verifer :</label>
                        <div className="col-sm-10">
                            <input type="email" className="form-control" name="email" value={formValues.email} onChange={handleChange} />
                            {formErrors.email && <p className="text-red-500 text-xs italic">{formErrors.email}</p>}
                        </div>
                    </div>
                    <div className="row mb-3">
                        <label className="col-sm-2 col-form-label">Email of Student:</label>
                        <div className="col-sm-10">
                            <input type="email" className="form-control" name="emailOfStudent" value={formValues.emailOfStudent} onChange={handleChange} />
                            {formErrors.emailOfStudent && <p className="text-red-500 text-xs italic">{formErrors.emailOfStudent}</p>}
                        </div>
                    </div>
                    <div className="row mb-3">
                        <label className="col-sm-2 col-form-label">Batch:</label>
                        <div className="col-sm-10">
                            <input type="text" className="form-control" name="batch" value={formValues.batch} onChange={handleChange} />
                            {formErrors.batch && <p className="text-red-500 text-xs italic">{formErrors.batch}</p>}
                            <p className="text-gray-600 text-xs italic">Batch year is year of graduation.</p>
                        </div>
                    </div>
                    <div className="row mb-3">
                        <label className="col-sm-2 col-form-label">CID(HASH):</label>
                        <div className="col-sm-10">
                            <input type="text" className="form-control" name="CID" value={formValues.CID} onChange={handleChange} />
                            {formErrors.CID && <p className="text-red-500 text-xs italic">{formErrors.CID}</p>}
                            <p className="text-gray-600 text-xs italic">CID is the unique identifier for the student.</p>
                        </div>
                    </div>
                    <div className="row mb-3">
                        <label className="col-sm-2 col-form-label">Organization Name:</label>
                        <div className="col-sm-10">
                            <input type="text" className="form-control" name="organizationName" value={formValues.organizationName} onChange={handleChange} />
                            {formErrors.organizationName && <p className="text-red-500 text-xs italic">{formErrors.organizationName}</p>}
                            <p className="text-gray-600 text-xs italic">Name of the university or college</p>
                        </div>
                    </div>
                    <div className="row mb-3">
                        <label className="col-sm-2 col-form-label">
                            <input
                                type='checkbox'
                                name='agreement'
                                checked={isChecked}
                                onChange={handleChange}
                            />
                            <span className='text-gray-700 text-sm'>I agree to pay 0.01 ETH for document verification</span>
                        </label>
                        {formErrors.checkError && <p className="text-red-500 text-xs italic">{formErrors.checkError}</p>}
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Processing...' : 'Verify Document'}</button>
                </form>
                {error && <p className="text-red-500 mt-4">{error}</p>}
                {present && <p className="text-green-500 mt-4" dangerouslySetInnerHTML={{ __html: present }}></p>}
            </div>
        </div>
    );
};

export default Verify;
