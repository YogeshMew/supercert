const Jimp = require('jimp');
const tesseract = require('node-tesseract-ocr');
const path = require('path');
const fs = require('fs').promises;
const pdf = require('pdf-parse');

// Configuration for OCR
const config = {
    lang: "eng",
    oem: 1,
    psm: 3,
};

class CertificateVerificationService {
    constructor() {
        // Define regions of interest (ROI) for different elements
        // These values will be calibrated based on the template
        this.regions = {
            logo: { x: 35, y: 20, width: 120, height: 120 },
            universityName: { x: 180, y: 30, width: 500, height: 80 },
            degreeTitle: { x: 180, y: 200, width: 500, height: 100 },
            studentDetails: { x: 100, y: 300, width: 600, height: 300 }
        };

        // Define expected text patterns with more flexible matching
        this.expectedPatterns = {
            universityName: /\b(?:university|univ\.?)\s+(?:of|)\s*mumbai\b/i,
            degreeTitle: /\b(?:bachelor|b\.?)\s*(?:of|)\s*(?:commerce|com\.?)\b/i,
            date: /\b\d{1,2}(?:st|nd|rd|th)?\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{4}\b/i,
            registrationNumber: /\b\d{7,8}\b/
        };
    }

    async loadTemplate() {
        try {
            // First, try to load from assets directory
            const assetsPath = path.join(__dirname, '../assets/template.jpg');
            if (await this.fileExists(assetsPath)) {
                return await Jimp.read(assetsPath);
            }

            // If not found in assets, try the uploads/temp directory
            const uploadsPath = path.join(__dirname, '../uploads/temp/template.pdf');
            if (await this.fileExists(uploadsPath)) {
                return await Jimp.read(uploadsPath);
            }

            throw new Error('Template file not found in assets or uploads directory');
        } catch (error) {
            console.error('Failed to load template:', error);
            throw new Error('Failed to load certificate template');
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async extractTextFromPdf(pdfPath) {
        try {
            const dataBuffer = await fs.readFile(pdfPath);
            const data = await pdf(dataBuffer);
            return data.text;
        } catch (error) {
            console.error('PDF text extraction failed:', error);
            throw new Error('Failed to extract text from PDF');
        }
    }

    async verifyPdf(pdfPath, studentData) {
        try {
            const text = await this.extractTextFromPdf(pdfPath);
            console.log('Extracted text from PDF:', text); // Debug log
            
            // Verify text content with more flexible matching
            const hasUniversityName = this.expectedPatterns.universityName.test(text);
            const hasDegreeText = this.expectedPatterns.degreeTitle.test(text);
            const hasStudentName = text.toLowerCase().includes(studentData.name.toLowerCase());
            const hasValidDate = this.validateDate(text);
            const hasValidRegNo = this.validateRegistrationNumber(text);

            console.log('Verification results:', { // Debug log
                hasUniversityName,
                hasDegreeText,
                hasStudentName,
                hasValidDate,
                hasValidRegNo
            });

            return {
                universityNameVerification: hasUniversityName,
                degreeTextVerification: hasDegreeText,
                studentNameVerification: hasStudentName,
                dateVerification: hasValidDate,
                registrationNumberVerification: hasValidRegNo,
                details: { extractedText: text }
            };
        } catch (error) {
            console.error('PDF verification failed:', error);
            throw new Error('Failed to verify PDF');
        }
    }

    async preprocessImage(imagePath) {
        try {
            const image = await Jimp.read(imagePath);
            
            // Enhance image quality
            image
                .quality(100) // Set maximum quality
                .contrast(0.1) // Increase contrast slightly
                .brightness(0.05); // Increase brightness slightly

            // Save preprocessed image
            const preprocessedPath = imagePath.replace(/\.[^/.]+$/, '') + '_processed.jpg';
            await image.writeAsync(preprocessedPath);
            return preprocessedPath;
        } catch (error) {
            console.error('Image preprocessing failed:', error);
            throw new Error('Failed to preprocess image');
        }
    }

    async compareImages(img1, img2) {
        const width = Math.min(img1.bitmap.width, img2.bitmap.width);
        const height = Math.min(img1.bitmap.height, img2.bitmap.height);
        
        // Resize both images to the same dimensions
        img1.resize(width, height);
        img2.resize(width, height);
        
        let diff = 0;
        const numPixels = width * height;
        
        // Compare pixels
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const pixel1 = Jimp.intToRGBA(img1.getPixelColor(x, y));
                const pixel2 = Jimp.intToRGBA(img2.getPixelColor(x, y));
                
                // Calculate difference for each channel
                diff += Math.abs(pixel1.r - pixel2.r) / 255;
                diff += Math.abs(pixel1.g - pixel2.g) / 255;
                diff += Math.abs(pixel1.b - pixel2.b) / 255;
            }
        }
        
        // Calculate similarity percentage (100% = identical)
        const similarity = 100 - (diff / (numPixels * 3)) * 100;
        return similarity;
    }

    async verifyLogo(inputImage, templateImage) {
        try {
            // Extract logo region from both images
            const inputLogo = await inputImage.clone().crop(
                this.regions.logo.x,
                this.regions.logo.y,
                this.regions.logo.width,
                this.regions.logo.height
            );
            
            const templateLogo = await templateImage.clone().crop(
                this.regions.logo.x,
                this.regions.logo.y,
                this.regions.logo.width,
                this.regions.logo.height
            );

            // Compare logos
            const similarity = await this.compareImages(inputLogo, templateLogo);
            return similarity > 80; // 80% similarity threshold
        } catch (error) {
            console.error('Logo verification failed:', error);
            return false;
        }
    }

    async extractText(image, region) {
        try {
            // Create a temporary file for the cropped region
            const tempPath = path.join(__dirname, '../uploads/temp', `region-${Date.now()}.png`);
            
            // Crop and save the region
            await image.clone()
                .crop(region.x, region.y, region.width, region.height)
                .writeAsync(tempPath);
            
            // Extract text using Tesseract
            const text = await tesseract.recognize(tempPath);
            
            // Clean up temporary file
            await fs.unlink(tempPath);
            
            return text;
        } catch (error) {
            console.error('Text extraction failed:', error);
            return '';
        }
    }

    validateDate(text) {
        const dateMatch = text.match(this.expectedPatterns.date);
        return dateMatch !== null;
    }

    validateRegistrationNumber(text) {
        const regNoMatch = text.match(this.expectedPatterns.registrationNumber);
        return regNoMatch !== null;
    }

    async verifyCertificate(certificatePath, studentData) {
        try {
            let verificationResults;

            if (certificatePath.toLowerCase().endsWith('.pdf')) {
                // Handle PDF verification
                const pdfResults = await this.verifyPdf(certificatePath, studentData);
                verificationResults = {
                    ...pdfResults,
                    logoVerification: false, // Can't verify logo in PDF
                    overallScore: 0,
                    isValid: false
                };

                // Calculate weighted score for PDF (without logo verification)
                verificationResults.overallScore = 
                    (verificationResults.universityNameVerification ? 25 : 0) +
                    (verificationResults.degreeTextVerification ? 25 : 0) +
                    (verificationResults.studentNameVerification ? 25 : 0) +
                    (verificationResults.dateVerification ? 12.5 : 0) +
                    (verificationResults.registrationNumberVerification ? 12.5 : 0);
            } else {
                // Handle image verification with more detailed logging
                console.log('Processing image certificate:', certificatePath);
                const processedImagePath = await this.preprocessImage(certificatePath);
                console.log('Preprocessed image path:', processedImagePath);

                // Load the input certificate and template
                const [inputImage, templateImage] = await Promise.all([
                    Jimp.read(processedImagePath),
                    this.loadTemplate()
                ]);

                console.log('Images loaded successfully');

                // Verify logo
                const logoValid = await this.verifyLogo(inputImage, templateImage);
                console.log('Logo verification result:', logoValid);

                // Extract and verify text from different regions
                const universityText = await this.extractText(inputImage, this.regions.universityName);
                const degreeText = await this.extractText(inputImage, this.regions.degreeTitle);
                const studentText = await this.extractText(inputImage, this.regions.studentDetails);

                console.log('Extracted text:', {
                    university: universityText,
                    degree: degreeText,
                    student: studentText
                });

                // Verify text content
                const hasUniversityName = this.expectedPatterns.universityName.test(universityText);
                const hasDegreeText = this.expectedPatterns.degreeTitle.test(degreeText);
                const hasStudentName = studentText.toLowerCase().includes(studentData.name.toLowerCase());
                const hasValidDate = this.validateDate(studentText);
                const hasValidRegNo = this.validateRegistrationNumber(studentText);

                console.log('Text verification results:', {
                    hasUniversityName,
                    hasDegreeText,
                    hasStudentName,
                    hasValidDate,
                    hasValidRegNo
                });

                verificationResults = {
                    logoVerification: logoValid,
                    universityNameVerification: hasUniversityName,
                    degreeTextVerification: hasDegreeText,
                    studentNameVerification: hasStudentName,
                    dateVerification: hasValidDate,
                    registrationNumberVerification: hasValidRegNo,
                    overallScore: 0,
                    isValid: false,
                    details: {
                        extractedText: {
                            university: universityText,
                            degree: degreeText,
                            student: studentText
                        }
                    }
                };

                // Calculate weighted score
                verificationResults.overallScore = 
                    (logoValid ? 20 : 0) +
                    (hasUniversityName ? 20 : 0) +
                    (hasDegreeText ? 20 : 0) +
                    (hasStudentName ? 20 : 0) +
                    (hasValidDate ? 10 : 0) +
                    (hasValidRegNo ? 10 : 0);

                // Clean up processed image
                try {
                    await fs.unlink(processedImagePath);
                } catch (error) {
                    console.error('Error cleaning up temporary files:', error);
                }
            }

            // Determine if certificate is valid based on overall score
            if (!verificationResults.isValid) {
                verificationResults.isValid = verificationResults.overallScore >= 40;
            }

            console.log('Final verification results:', verificationResults);
            return verificationResults;
        } catch (error) {
            console.error('Certificate verification failed:', error);
            throw new Error(`Certificate verification failed: ${error.message}`);
        }
    }
}

module.exports = new CertificateVerificationService(); 