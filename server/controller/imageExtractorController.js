const path = require('path');
const asyncHandler = require('express-async-handler');
const imageExtractorService = require('../services/imageExtractor');
const multer = require('multer');
const os = require('os');
const PDFDocument = require('pdfkit');
const fs = require('fs'); // Keep fs import for potential other uses, but we avoid fs.createWriteStream

// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.join(__dirname, '../uploads');
      const transcriptsDir = path.join(uploadDir, 'transcripts');
      
      // Create directories if they don't exist
      await fs.promises.mkdir(uploadDir, { recursive: true });
      await fs.promises.mkdir(transcriptsDir, { recursive: true });
      
      cb(null, transcriptsDir);
    } catch (error) {
      console.error('Error creating directories:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg'; // Default to jpg if no extension
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Check if file is an image
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/tiff'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create upload middleware with error handling
const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
}).single('image');

// Wrapped middleware to handle multer errors
const uploadMiddleware = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File is too large (max 10MB)',
          troubleshooting: ['Try compressing the image', 'Use a smaller image']
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
        troubleshooting: ['Try a different image', 'Make sure the file is a valid image']
      });
    } else if (err) {
      // Other errors
      return res.status(500).json({
        success: false,
        message: `Upload error: ${err.message}`,
        troubleshooting: ['Check file permissions', 'Try a different image']
      });
    }
    next();
  });
};

// @desc    Upload and extract data from transcript image
// @route   POST /api/extract/image
// @access  Public (No auth required for extraction)
const extractImageData = async (req, res) => {
  try {
    console.log('Processing image upload request');
    
    // Check if an image file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded',
        troubleshooting: [
          'Please select an image file to upload',
          'Ensure the file is a valid image (JPG, PNG, or PDF)',
          'Try a different file if the issue persists'
        ]
      });
    }
    
    // Log the uploaded file
    console.log('Uploaded file:', req.file);
    
    try {
      // Add more detailed logging
      console.log(`Processing uploaded file: ${req.file.path}`);
      console.log(`Original file name: ${req.file?.originalname || 'unknown'}`);
      
      // Extract data from the uploaded image
      const extractedData = await imageExtractorService.extractDataFromImage(req.file.path);
      
      console.log("Successfully extracted data:", JSON.stringify(extractedData, null, 2));
      
      // Special handling for the raw text extraction to fix student name issues
      // Look for name patterns in the raw extracted text if student name is still not detected
      if ((!extractedData.studentName || extractedData.studentName === 'Not detected') && 
           extractedData.rawText) {
        // Try to find the name directly in the raw text
        const nameMatch = extractedData.rawText.match(/CANDIDATE(?:'|')?S\s+FULL\s+NAME[^:]*?(?:SURNAME\s+FIRST)?[^:]*?:?\s*([^\r\n]+)/i);
        if (nameMatch && nameMatch[1]) {
          console.log("Found name in raw text:", nameMatch[1]);
          const cleanName = nameMatch[1].trim()
            .replace(/\s+/g, ' ')
            .replace(/at\s+No\.?.*$/i, '')
            .replace(/at\s+seat\.?.*$/i, '')
            .replace(/^(?:Shri|Sri|Smt|Mr|Ms|Mrs|Miss)\s+/i, '')
            .trim();
          
          if (cleanName.length >= 3) {
            extractedData.studentName = cleanName;
            console.log("Updated student name from raw text:", extractedData.studentName);
          }
        } else {
          // Try looking for any line that might be a name
          const lines = extractedData.rawText.split('\n');
          for (let i = 0; i < Math.min(20, lines.length); i++) {
            const line = lines[i].trim();
            if (line && line.length >= 5 && line.length <= 50 && 
                !line.includes('CANDIDATE') && !line.includes('MAHARASHTRA') &&
                !line.includes('BOARD') && !line.includes('CERTIFICATE')) {
              
              extractedData.studentName = line;
              console.log("Found potential name in line:", extractedData.studentName);
              break;
            }
          }
        }
      }
      
      // Check if we need to update the board field
      if (!extractedData.board && extractedData.rawText) {
        if (extractedData.rawText.includes('MAHARASHTRA') || 
            extractedData.rawText.includes('PUNE') ||
            extractedData.rawText.includes('DIVISIONAL BOARD') ||
            extractedData.rawText.match(/SECONDARY\s+SCHOOL\s+CERTIFI(?:CATE)?/i) ||
            extractedData.rawText.match(/SECONDARY\s+(?:AND\s+HIGHER\s+SECONDARY\s+)?EDUCATION/i)) {
          
          extractedData.board = 'MAHARASHTRA STATE BOARD';
          console.log("Board set to Maharashtra State Board based on text content");
        }
      }
      
      // Check if we need to update the year field
      if ((!extractedData.examYear || !extractedData.batch) && extractedData.rawText) {
        // Try to find year in specific patterns
        const yearPatterns = [
          /(?:\d+\.\d+\.\d+\s+)?(?:JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)[- ](\d{4})/i,
          /(?:MARCH|MAY|JUNE|JULY|OCTOBER|NOVEMBER|DECEMBER)[-\s]+(\d{4})/gi,
          /\b(20\d{2})\b/g
        ];
        
        let yearFound = false;
        
        for (const pattern of yearPatterns) {
          const yearMatch = extractedData.rawText.match(pattern);
          if (yearMatch) {
            // Different handling based on regex type
            if (pattern.toString().includes('g')) {
              // Global pattern might return multiple matches
              const years = [];
              let match;
              // Clone the regex to reset lastIndex
              const patternClone = new RegExp(pattern);
              while ((match = patternClone.exec(extractedData.rawText)) !== null) {
                if (match[1]) years.push(match[1]);
              }
              
              if (years.length > 0) {
                // Use most recent year
                years.sort((a, b) => parseInt(b) - parseInt(a));
                extractedData.examYear = years[0];
                if (!extractedData.batch) extractedData.batch = years[0];
                yearFound = true;
                console.log(`Year found from global pattern: ${extractedData.examYear}`);
                break;
              }
            } else if (yearMatch[1]) {
              // Non-global pattern with capture group
              extractedData.examYear = yearMatch[1];
              if (!extractedData.batch) extractedData.batch = yearMatch[1];
              yearFound = true;
              console.log(`Year found from specific pattern: ${extractedData.examYear}`);
              break;
            }
          }
        }
        
        // If still not found, look for any 4-digit number that could be a year
        if (!yearFound) {
          const anyYearMatch = extractedData.rawText.match(/\b((?:19|20)\d{2})\b/);
          if (anyYearMatch && anyYearMatch[1]) {
            const year = anyYearMatch[1];
            // Validate it's a reasonable year
            const yearNum = parseInt(year);
            const currentYear = new Date().getFullYear();
            if (yearNum >= 1990 && yearNum <= currentYear) {
              extractedData.examYear = year;
              if (!extractedData.batch) extractedData.batch = year;
              console.log(`Year found from generic number: ${extractedData.examYear}`);
            }
          }
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Data extracted successfully',
        data: extractedData
      });
    } catch (error) {
      console.error('Error in image extraction:', error);
      
      // Send more detailed error information
      let errorMessage = error.message || 'Failed to extract data';
      let partialData = error.partialData || null;
      
      // Try to extract student name from error.extractedText if it exists
      if (error.extractedText && (!partialData || !partialData.studentName || partialData.studentName === 'Not detected')) {
        if (!partialData) partialData = {};
        
        // Try to find student name in extractedText
        const nameMatch = error.extractedText.match(/CANDIDATE(?:'|')?S\s+FULL\s+NAME[^:]*?(?:SURNAME\s+FIRST)?[^:]*?:?\s*([^\r\n]+)/i);
        if (nameMatch && nameMatch[1]) {
          const cleanName = nameMatch[1].trim();
          if (cleanName.length >= 3) {
            partialData.studentName = cleanName;
            console.log("Extracted student name from error text:", partialData.studentName);
          }
        }
        
        // Set board if not set or explicitly check for Maharashtra
        const hasBoardText = error.extractedText && (
          error.extractedText.includes('MAHARASHTRA') || 
          error.extractedText.includes('STATE BOARD') ||
          error.extractedText.includes('DIVISIONAL BOARD') ||
          error.extractedText.includes('SECONDARY SCHOOL') ||
          error.extractedText.includes('EDUCATION, PUNE')
        );
        
        if (!partialData.board && hasBoardText) {
          partialData.board = 'MAHARASHTRA STATE BOARD';
          console.log("Set board to Maharashtra State Board based on text content");
          
          // If this field was in missingFields, remove it
          if (partialData.missingFields && partialData.missingFields.includes('board/university')) {
            const index = partialData.missingFields.indexOf('board/university');
            if (index > -1) {
              partialData.missingFields.splice(index, 1);
              console.log("Removed board/university from missing fields after detection");
            }
          }
        }
        
        // If missing fields were reported, include them for frontend handling
        if (error.message && error.message.includes('Missing required fields')) {
          partialData.missingFields = error.message.replace('Missing required fields: ', '').split(', ');
          console.log("Included missing fields for frontend handling:", partialData.missingFields);
          
          // Special flag for fields that are detected but still marked as missing
          partialData.detectedButMissing = [];
          
          // Check if board is included in missing fields but actually exists
          if (partialData.missingFields.includes('board/university') && partialData.board) {
            partialData.detectedButMissing.push('board/university');
            console.log("Board is detected but still marked as missing");
          }
        }
      }
      
      // Even if validation failed, still return the partial data
      // This allows the frontend to display what was extracted
      if (partialData) {
        console.log("Returning partial data despite validation failure:", JSON.stringify(partialData, null, 2));
        
        // If we have a board and it's Maharashtra, include special message
        if (partialData.board && partialData.board.includes('MAHARASHTRA STATE BOARD')) {
          return res.status(200).json({
            success: true,
            message: 'Data extracted but some fields might be incomplete',
            warning: errorMessage,
            data: partialData
          });
        }
      }
      
      // If we couldn't return partial data, return an error
      res.status(400).json({
        success: false,
        message: errorMessage,
        partialData: partialData,
        error: {
          message: errorMessage,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  } catch (error) {
    console.error('Unexpected error in image extraction controller:', error);
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during image processing',
      troubleshootingTips: [
        'Please try again later',
        'If the issue persists, contact support'
      ]
    });
  } finally {
    // Cleanup: remove the uploaded file
    if (req.file && req.file.path) {
      try {
        // Use the correct fs module approach for deletion
        fs.unlinkSync(req.file.path);
        console.log('Temporary file removed:', req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to remove temporary file:', cleanupError);
      }
    }
  }
};

// @desc    Test the extraction on a sample image
// @route   POST /api/extract/test
// @access  Private (Admin)
const testImageExtraction = asyncHandler(async (req, res) => {
  try {
    const sampleImagePath = path.join(__dirname, '../assets/sample_transcript.jpg');
    
    // Check if sample image exists
    try {
      await fs.promises.access(sampleImagePath);
    } catch (error) {
      res.status(404);
      throw new Error('Sample image not found');
    }
    
    const result = await imageExtractorService.extractDataFromImage(sampleImagePath);
    
    if (!result.success) {
      res.status(500);
      throw new Error(`Test extraction failed: ${result.error}`);
    }
    
    res.status(200).json({
      success: true,
      message: 'Test extraction completed successfully',
      extractedData: result.data
    });
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
});

// Add this new method for PDF generation
const generatePdfFromData = async (req, res) => {
    try {
        const extractedData = req.body;
        
        if (!extractedData) {
            return res.status(400).json({
                success: false,
                error: 'No data provided for PDF generation'
            });
        }
        
        console.log('Generating PDF for data:', JSON.stringify(extractedData, null, 2));
        
        // Set the response headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=transcript_${Date.now()}.pdf`);
        
        // Create a PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: 'Student Transcript',
                Author: 'SuperCert System',
                Subject: 'Educational Certificate',
            }
        });
        
        // Pipe the PDF directly to the response
        doc.pipe(res);
        
        // Determine if this is a Maharashtra SSC document
        const isMaharashtraSSC = 
            extractedData.board && 
            extractedData.board.includes('MAHARASHTRA') && 
            extractedData.program === 'SSC';
        
        // Add header with logo and title based on document type
        if (isMaharashtraSSC) {
            doc.fontSize(20).font('Helvetica-Bold').text('MAHARASHTRA SSC CERTIFICATE', { align: 'center' });
        } else {
            doc.fontSize(20).font('Helvetica-Bold').text('STUDENT TRANSCRIPT', { align: 'center' });
        }
        doc.moveDown();
        
        // Add divider
        doc.moveTo(50, doc.y)
           .lineTo(doc.page.width - 50, doc.y)
           .stroke();
        doc.moveDown();
        
        // Student details section
        doc.fontSize(14).font('Helvetica-Bold').text('STUDENT DETAILS', { underline: true });
        doc.moveDown(0.5);
        
        // Create a table-like structure for student details
        const details = [
            { label: 'Name', value: extractedData.studentName || 'N/A' },
            { label: 'Seat/Roll Number', value: extractedData.seatNumber || extractedData.rollNumber || 'N/A' },
            { label: 'Date of Birth', value: extractedData.dateOfBirth || 'N/A' },
            { label: 'Board/University', value: extractedData.board || extractedData.university || 'N/A' },
            { label: 'Program', value: extractedData.program || 'N/A' },
            { label: 'Exam Year', value: extractedData.examYear || extractedData.batch || 'N/A' }
        ];
        
        // Add Maharashtra-specific fields if available
        if (isMaharashtraSSC) {
            if (extractedData.motherName || extractedData.mothersName) {
                details.push({ label: 'Mother\'s Name', value: extractedData.motherName || extractedData.mothersName || 'N/A' });
            }
            if (extractedData.schoolNumber) {
                details.push({ label: 'School Number', value: extractedData.schoolNumber || 'N/A' });
            }
            if (extractedData.centerNumber) {
                details.push({ label: 'Center Number', value: extractedData.centerNumber || 'N/A' });
            }
        }
        
        details.forEach(detail => {
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .text(`${detail.label}: `, { continued: true })
               .font('Helvetica')
               .text(detail.value);
            doc.moveDown(0.5);
        });
        
        doc.moveDown();
        
        // Add marks section if available
        if (extractedData.grades || extractedData.subjects || extractedData.sscMarks || extractedData.percentage) {
            // Add divider
            doc.moveTo(50, doc.y)
               .lineTo(doc.page.width - 50, doc.y)
               .stroke();
            doc.moveDown();
            
            doc.fontSize(14).font('Helvetica-Bold').text('ACADEMIC PERFORMANCE', { underline: true });
            doc.moveDown(0.5);
            
            // If we have subject-wise marks
            if (extractedData.subjects) {
                // Create table header
                const tableTop = doc.y;
                const tableWidth = doc.page.width - 100;
                
                doc.fontSize(10).font('Helvetica-Bold');
                doc.text('Subject', 50, tableTop, { width: tableWidth * 0.5, align: 'left' });
                doc.text('Marks', 50 + tableWidth * 0.5, tableTop, { width: tableWidth * 0.25, align: 'center' });
                doc.text('Out Of', 50 + tableWidth * 0.75, tableTop, { width: tableWidth * 0.25, align: 'center' });
                
                doc.moveTo(50, doc.y + 5)
                   .lineTo(doc.page.width - 50, doc.y + 5)
                   .stroke();
                doc.moveDown();
                
                // Add table rows - handle both array and object formats of subjects
                let currentY = doc.y;
                let subjectsArray = [];
                
                if (Array.isArray(extractedData.subjects)) {
                    subjectsArray = extractedData.subjects;
                } else if (typeof extractedData.subjects === 'object') {
                    // Convert subjects object to array
                    subjectsArray = Object.values(extractedData.subjects);
                }
                
                // Render subject rows
                subjectsArray.forEach(subject => {
                    doc.fontSize(10).font('Helvetica');
                    
                    // Handle different subject data structures
                    const subjectName = subject.subject || (typeof subject === 'string' ? subject : Object.keys(extractedData.subjects).find(key => extractedData.subjects[key] === subject) || 'N/A');
                    const marks = subject.obtainedMarks || subject.marks || 'N/A';
                    const outOf = subject.maxMarks || subject.outOf || '100';
                    
                    doc.text(subjectName, 50, currentY, { width: tableWidth * 0.5, align: 'left' });
                    doc.text(marks, 50 + tableWidth * 0.5, currentY, { width: tableWidth * 0.25, align: 'center' });
                    doc.text(outOf, 50 + tableWidth * 0.75, currentY, { width: tableWidth * 0.25, align: 'center' });
                    currentY = doc.y + 10;
                    doc.moveDown();
                });
                
                doc.moveTo(50, currentY)
                   .lineTo(doc.page.width - 50, currentY)
                   .stroke();
                doc.moveDown();
            }
            
            // Add total marks if available
            if (extractedData.totalMarks || extractedData.sscMarks) {
                doc.fontSize(12).font('Helvetica-Bold')
                   .text('Total Marks: ', { continued: true })
                   .font('Helvetica')
                   .text(`${extractedData.totalMarks || extractedData.sscMarks || 'N/A'}`);
            }
            
            // Add percentage if available
            if (extractedData.percentage || extractedData.sscPercentage) {
                doc.fontSize(12).font('Helvetica-Bold')
                   .text('Percentage: ', { continued: true })
                   .font('Helvetica')
                   .text(`${extractedData.percentage || extractedData.sscPercentage || 'N/A'}`);
            }
            
            // Add division or grade if available
            if (extractedData.division || extractedData.grade) {
                doc.fontSize(12).font('Helvetica-Bold')
                   .text('Division/Grade: ', { continued: true })
                   .font('Helvetica')
                   .text(`${extractedData.division || extractedData.grade || 'N/A'}`);
            }
        }

        // Add a new page for the original image
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('ORIGINAL DOCUMENT IMAGE', { align: 'center' });
        doc.moveDown();
        
        // Check if we have the image source in the data
        if (extractedData.imageSource) {
            try {
                // If the image is a base64 string
                if (extractedData.imageSource.startsWith('data:image')) {
                    // Extract base64 data from data URI
                    const base64Data = extractedData.imageSource.split(',')[1];
                    const imgBuffer = Buffer.from(base64Data, 'base64');
                    
                    // Calculate image dimensions to fit the page
                    const maxWidth = doc.page.width - 100;
                    const maxHeight = doc.page.height - 150;
                    
                    // Add the image to the PDF
                    doc.image(imgBuffer, {
                        fit: [maxWidth, maxHeight],
                        align: 'center',
                        valign: 'center'
                    });
                    
                    doc.moveDown();
                    doc.fontSize(10).font('Helvetica-Italic').text('Original uploaded document image', { align: 'center' });
                } else {
                    // If it's a URL or file path
                    const imageUrl = extractedData.imageSource;
                    doc.image(imageUrl, {
                        fit: [doc.page.width - 100, doc.page.height - 150],
                        align: 'center',
                        valign: 'center'
                    });
                    
                    doc.moveDown();
                    doc.fontSize(10).font('Helvetica-Italic').text('Original uploaded document image', { align: 'center' });
                }
            } catch (imgError) {
                console.error('Error adding image to PDF:', imgError);
                doc.fontSize(12).font('Helvetica').text('Error displaying original image.', { align: 'center' });
            }
        } else {
            doc.fontSize(12).font('Helvetica').text('Original image not available.', { align: 'center' });
        }
        
        // Add verification information
        doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('VERIFICATION INFORMATION', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(10).font('Helvetica')
           .text('This document has been generated by the SuperCert Blockchain Certification System. ' +
                'The information contained in this document can be verified through the SuperCert verification portal.');
        
        // Add QR code placeholder text
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica')
           .text('Scan the QR code below or visit the SuperCert website to verify this certificate:');
        
        // Add footer
        doc.moveDown(4);
        doc.fontSize(9).font('Helvetica-Oblique').text('This document is computer-generated and does not require a signature.', { align: 'center' });
        doc.moveDown(0.5);
        doc.text('Powered by SuperCert Blockchain Certification System', { align: 'center' });
        doc.moveDown(0.5);
        if (isMaharashtraSSC) {
            doc.text('Maharashtra State Board of Secondary & Higher Secondary Education', { align: 'center' });
        }
        
        // Add generation timestamp
        const now = new Date();
        doc.fontSize(8).text(`Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, { align: 'center' });
        
        // Finalize the document
        doc.end();
        
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate PDF'
        });
    }
};

// Export the methods
module.exports = {
  uploadMiddleware,
  extractImageData,
  testImageExtraction,
  generatePdfFromData
}; 