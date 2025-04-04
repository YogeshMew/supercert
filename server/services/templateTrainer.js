const fs = require('fs');
const path = require('path');
const imageExtractor = require('./imageExtractor');
const tesseract = require('node-tesseract-ocr');
const { mkdir } = require('fs/promises');

class TemplateTrainerService {
    constructor() {
        this.templatesPath = path.join(__dirname, '../data/templates');
        this.patterns = {
            studentName: [],
            dateOfBirth: [],
            examDate: [],
            boardName: [],
            subjects: {},
            gradePatterns: [],
            totalMarksPatterns: [],
            centerPatterns: [],
            seatNumberPatterns: []
        };
        this.initialize();
    }

    initialize() {
        // Create templates directory if it doesn't exist
        if (!fs.existsSync(this.templatesPath)) {
            fs.mkdirSync(this.templatesPath, { recursive: true });
        }

        // Load existing patterns if any
        try {
            const patternsFile = path.join(this.templatesPath, 'patterns.json');
            if (fs.existsSync(patternsFile)) {
                this.patterns = JSON.parse(fs.readFileSync(patternsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading existing patterns:', error);
        }
    }

    async trainFromImage(imagePath, templateType) {
        try {
            console.log(`Training from image: ${imagePath}, template type: ${templateType}`);
            
            // First, apply enhanced preprocessing to the image
            const preprocessedImagePath = await imageExtractor.preprocessImage(imagePath);
            console.log(`Template image preprocessed: ${preprocessedImagePath}`);
            
            // Extract text with multiple OCR configurations for best results
            // Try both general and single-column settings
            let extractedText = '';
            try {
                // Try general text extraction (multiple columns)
                const generalConfig = {
                    lang: 'eng',
                    oem: 1,
                    psm: 4,
                    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;%()- /",
                };
                const generalText = await tesseract.recognize(preprocessedImagePath, generalConfig);
                console.log(`General extraction for template: ${generalText.length} chars`);
                
                // Try single-column extraction
                const singleColumnConfig = {
                    lang: 'eng',
                    oem: 1,
                    psm: 6,
                    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;%()- /",
                };
                const singleColumnText = await tesseract.recognize(preprocessedImagePath, singleColumnConfig);
                console.log(`Single column extraction for template: ${singleColumnText.length} chars`);
                
                // Use the one with more content
                extractedText = generalText.length > singleColumnText.length ? generalText : singleColumnText;
            } catch (ocrError) {
                console.error('OCR error during template training:', ocrError);
                // Fallback to standard extraction
                extractedText = await imageExtractor.extractTextFromImage(preprocessedImagePath);
            }
            
            console.log(`Text extracted from template (${extractedText.length} chars):`);
            console.log(`Sample: ${extractedText.substring(0, 300)}...`);
            
            // Clean the extracted text
            const cleanedText = imageExtractor.cleanOCRText(extractedText);
            console.log(`Text cleaned for template training`);
            
            // Extract comprehensive data using the imageExtractor service
            // This will give us more metadata about the certificate
            const extractedData = await imageExtractor.extractDataFromImage(preprocessedImagePath);
            console.log(`Extracted detailed data for template:`, 
                JSON.stringify({
                    board: extractedData.board,
                    program: extractedData.program,
                    studentName: extractedData.studentName,
                    foundSubjects: extractedData.subjects ? Object.keys(extractedData.subjects).length : 0 
                }, null, 2)
            );
            
            // Extract and store patterns from the more detailed extraction
            const standardPatterns = await this.extractAndStorePatterns(cleanedText, templateType);
            
            // Additional storage for template-specific patterns
            // This includes subject formats, name formats, and other template-specific details
            await this.storeTemplateMetadata(templateType, extractedData);
            
            return {
                success: true,
                patternsExtracted: standardPatterns.count,
                extractedData: {
                    board: extractedData.board,
                    program: extractedData.program,
                    studentName: extractedData.studentName,
                    subjectsExtracted: extractedData.subjects ? Object.keys(extractedData.subjects).length : 0
                },
                message: 'Template patterns extracted and stored successfully'
            };
        } catch (error) {
            console.error('Template training failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async extractAndStorePatterns(text, templateType) {
        // Extract student name pattern
        const studentNameMatch = text.match(/(?:CANDIDATES?\s*(?:FULL|MOT)?\s*(?:NAME|MOT)|NAME\s*OF\s*CANDIDATE)[^\d\n]*?([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (studentNameMatch) {
            const pattern = this.generatePatternFromExample(studentNameMatch[0]);
            this.addUniquePattern('studentName', pattern);
        }

        // Extract date patterns
        const datePatterns = text.match(/(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/g);
        if (datePatterns) {
            datePatterns.forEach(pattern => {
                this.addUniquePattern('dateOfBirth', this.generateDatePattern(pattern));
                this.addUniquePattern('examDate', this.generateDatePattern(pattern));
            });
        }

        // Extract board name pattern
        const boardMatch = text.match(/(?:MAHARASHTRA|MUMBAI|PUNE|STATE)\s*(?:DIVISIONAL|STATE)?\s*BOARD/i);
        if (boardMatch) {
            const pattern = this.generatePatternFromExample(boardMatch[0]);
            this.addUniquePattern('boardName', pattern);
        }

        // Extract subject patterns
        const subjectLines = text.match(/(?:[0-9]{2})\s+([A-Z][A-Z&\s]+)\s+([0-9]{2,3})\s+([0-9]{1,3})/g);
        if (subjectLines) {
            subjectLines.forEach(line => {
                const subjectPattern = this.generateSubjectPattern(line);
                this.addUniquePattern('subjects', subjectPattern);
            });
        }

        // Extract grade patterns
        const gradeMatch = text.match(/(?:DISTINCTION|FIRST CLASS|SECOND CLASS|PASS CLASS)/i);
        if (gradeMatch) {
            const pattern = this.generatePatternFromExample(gradeMatch[0]);
            this.addUniquePattern('gradePatterns', pattern);
        }

        // Extract total marks pattern
        const totalMarksMatch = text.match(/Total\s*Marks\s*([0-9]+)\s*[\/\s]\s*([0-9]+)/i);
        if (totalMarksMatch) {
            const pattern = this.generatePatternFromExample(totalMarksMatch[0]);
            this.addUniquePattern('totalMarksPatterns', pattern);
        }

        // Save updated patterns
        await this.savePatterns();

        return {
            count: Object.keys(this.patterns).length
        };
    }

    generatePatternFromExample(example) {
        return example
            .replace(/[0-9]+/g, '\\d+')
            .replace(/[A-Z]+/g, '[A-Z]+')
            .replace(/[a-z]+/g, '[a-z]+')
            .replace(/\s+/g, '\\s+');
    }

    generateDatePattern(dateStr) {
        const format = dateStr.replace(/[0-9]+/g, (match) => {
            if (match.length === 4) return 'YYYY';
            return match.length === 2 ? 'DD' : 'D';
        });
        return format.replace(/[\/\.-]/g, (separator) => `\\${separator}`);
    }

    generateSubjectPattern(subjectLine) {
        const parts = subjectLine.match(/([0-9]{2})\s+([A-Z][A-Z&\s]+)\s+([0-9]{2,3})\s+([0-9]{1,3})/);
        if (parts) {
            return {
                code: '\\d{2}',
                name: parts[2].trim().replace(/\s+/g, '\\s+'),
                maxMarks: '\\d{2,3}',
                obtainedMarks: '\\d{1,3}'
            };
        }
        return null;
    }

    addUniquePattern(category, pattern) {
        if (!pattern) return;

        if (Array.isArray(this.patterns[category])) {
            if (!this.patterns[category].includes(pattern)) {
                this.patterns[category].push(pattern);
            }
        } else if (typeof this.patterns[category] === 'object' && pattern) {
            const key = pattern.name || Object.keys(pattern)[0];
            this.patterns[category][key] = pattern;
        }
    }

    async savePatterns() {
        try {
            const patternsFile = path.join(this.templatesPath, 'patterns.json');
            await fs.promises.writeFile(patternsFile, JSON.stringify(this.patterns, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving patterns:', error);
            return false;
        }
    }

    getPatterns() {
        return this.patterns;
    }

    async storeTemplateMetadata(templateType, extractedData) {
        try {
            // Create a directory for template metadata if it doesn't exist
            const templateMetadataDir = path.join(__dirname, '../data/templateMetadata');
            await mkdir(templateMetadataDir, { recursive: true });
            
            // Create a file with template-specific metadata
            const metadataPath = path.join(templateMetadataDir, `${templateType.toLowerCase()}.json`);
            
            // Read existing metadata if available
            let existingMetadata = {};
            try {
                if (fs.existsSync(metadataPath)) {
                    existingMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                }
            } catch (readError) {
                console.warn(`Unable to read existing metadata for ${templateType}:`, readError);
            }
            
            // Update metadata with new extraction
            const updatedMetadata = {
                ...existingMetadata,
                lastUpdated: new Date().toISOString(),
                boardName: extractedData.board || existingMetadata.boardName,
                programName: extractedData.program || existingMetadata.programName,
                // Store subject pattern examples if available
                subjects: extractedData.subjects || existingMetadata.subjects,
                // Store name and identifier patterns for reference
                namePatterns: {
                    ...existingMetadata.namePatterns,
                    [Date.now()]: extractedData.studentName
                },
                idPatterns: {
                    ...existingMetadata.idPatterns,
                    [Date.now()]: extractedData.seatNumber || extractedData.rollNumber
                }
            };
            
            // Save updated metadata
            fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));
            console.log(`Template metadata stored for ${templateType}`);
            
            return true;
        } catch (error) {
            console.error('Error storing template metadata:', error);
            return false;
        }
    }
}

module.exports = new TemplateTrainerService(); 