const fs = require('fs');
const path = require('path');

class TemplateValidator {
    constructor() {
        this.patternsPath = path.join(__dirname, '../data/templates/patterns.json');
        this.patterns = {};
        this.loadPatterns();
        
        // Configure debug mode
        this.debugMode = true;
    }
    
    loadPatterns() {
        try {
            if (fs.existsSync(this.patternsPath)) {
                this.patterns = JSON.parse(fs.readFileSync(this.patternsPath, 'utf8'));
                console.log(`Loaded ${Object.keys(this.patterns).length} pattern categories for validation`);
            } else {
                console.warn(`Patterns file not found at ${this.patternsPath}`);
            }
        } catch (error) {
            console.error('Error loading validation patterns:', error);
        }
    }
    
    validateWithPatterns(extractedData) {
        console.log(`Validating extracted data against patterns: ${JSON.stringify(extractedData, null, 2)}`);
        
        // Initialize validation results
        const validationResult = {
            isValid: false,
            matchedPatterns: [],
            missingPatterns: [],
            errorDetails: []
        };
        
        // Check if we need to apply Maharashtra board specific validation
        const isMaharashtraBoard = extractedData.board && 
            (extractedData.board.toUpperCase().includes('MAHARASHTRA') || 
             extractedData.board.toUpperCase().includes('MSBSHSE'));
        
        // Track errors for better debugging
        const validationErrors = [];
        
        // Validate student name
        this.validatePattern('studentName', extractedData.studentName, validationResult, isMaharashtraBoard);
        
        // Validate board name
        this.validatePattern('boardName', extractedData.board, validationResult, isMaharashtraBoard);
        
        // Validate program type (SSC, HSC)
        if (extractedData.program) {
            const programValid = extractedData.program.toUpperCase().includes('SSC') || 
                                extractedData.program.toUpperCase().includes('HSC') ||
                                extractedData.program.toUpperCase().includes('SECONDARY');
            
            if (programValid) {
                this.updateValidationResults(validationResult, 'program', true);
            } else {
                this.updateValidationResults(validationResult, 'program', false);
                validationErrors.push(`Program type "${extractedData.program}" not recognized`);
            }
        } else {
            this.updateValidationResults(validationResult, 'program', false);
            validationErrors.push('Program type missing');
        }
        
        // Validate seat number or roll number (only one is required)
        const hasSeatNumber = this.validatePattern('seatNumberPatterns', extractedData.seatNumber, validationResult, isMaharashtraBoard);
        const hasRollNumber = this.validatePattern('rollNumber', extractedData.rollNumber, validationResult, isMaharashtraBoard);
        
        if (!hasSeatNumber && !hasRollNumber) {
            validationErrors.push('Both seat number and roll number are missing or invalid');
        }
        
        // Apply special validation for Maharashtra SSC documents
        if (isMaharashtraBoard && extractedData.program && 
            (extractedData.program.toUpperCase().includes('SSC') || 
             extractedData.program.toUpperCase().includes('SECONDARY'))) {
            
            console.log("Applying special validation for Maharashtra SSC document");
            
            // More lenient validation for Maharashtra SSC
            const hasStudentName = extractedData.studentName && extractedData.studentName.trim().length > 0;
            const hasIdentifier = extractedData.seatNumber || extractedData.rollNumber;
            
            if (hasStudentName && hasIdentifier) {
                console.log("Maharashtra SSC document with student name and identifier - marking as valid");
                validationResult.isValid = true;
                
                // Add a special flag for Maharashtra SSC documents
                validationResult.isMaharashtraSSC = true;
                
                // If validation passed with special rules, remove missing patterns related to basics
                validationResult.missingPatterns = validationResult.missingPatterns
                    .filter(p => !['studentName', 'seatNumberPatterns', 'rollNumber', 'program', 'boardName'].includes(p));
            }
        } else {
            // Standard validation for other documents
            // Document is valid if it has matched more patterns than it's missing
            const validationScore = validationResult.matchedPatterns.length - validationResult.missingPatterns.length;
            validationResult.isValid = validationScore > 0;
        }
        
        // Add error details
        validationResult.errorDetails = validationErrors;
        
        console.log(`Validation result: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
        console.log(`Matched patterns: ${validationResult.matchedPatterns.join(', ')}`);
        console.log(`Missing patterns: ${validationResult.missingPatterns.join(', ')}`);
        
        return validationResult;
    }
    
    validatePattern(patternType, value, validationResult, isMaharashtraSSC = false) {
        // Helper method to log in debug mode
        const logDebug = (message) => {
            if (this.debugMode) {
                console.log(`[Validation] ${message}`);
            }
        };
        
        if (!value) {
            logDebug(`${patternType} validation failed: No value provided`);
            this.updateValidationResults(validationResult, patternType, false);
            return false;
        }
        
        // Check if we have patterns for this type
        if (!this.patterns[patternType] || this.patterns[patternType].length === 0) {
            logDebug(`${patternType} validation skipped: No patterns available`);
            // Be lenient if we don't have patterns
            return true;
        }
        
        // Convert value to string for comparison
        const valueStr = value.toString();
        
        // For Maharashtra SSC documents, be more lenient with validation
        if (isMaharashtraSSC) {
            logDebug(`${patternType} validation: Being lenient for Maharashtra SSC`);
            
            // For student names, basic check if it's two words or more
            if (patternType === 'studentName') {
                const isValidName = valueStr.trim().split(/\s+/).length >= 2;
                this.updateValidationResults(validationResult, patternType, isValidName);
                return isValidName;
            }
            
            // For identifiers, just check if they exist
            if (patternType === 'seatNumberPatterns' || patternType === 'rollNumber') {
                const isValidId = valueStr.trim().length > 0;
                this.updateValidationResults(validationResult, patternType, isValidId);
                return isValidId;
            }
        }
        
        // Standard pattern validation
        for (const pattern of this.patterns[patternType]) {
            try {
                const regex = new RegExp(pattern, 'i');
                
                logDebug(`Testing ${patternType} "${valueStr}" against pattern ${regex}`);
                
                if (regex.test(valueStr)) {
                    logDebug(`${patternType} validation PASSED with pattern ${regex}`);
                    this.updateValidationResults(validationResult, patternType, true);
                    return true;
                }
            } catch (error) {
                console.error(`Error in regex pattern '${pattern}':`, error);
            }
        }
        
        logDebug(`${patternType} validation FAILED`);
        this.updateValidationResults(validationResult, patternType, false);
        return false;
    }
    
    updateValidationResults(validationResult, patternType, isValid) {
        // Convert pattern type to a more readable form
        let displayPattern = patternType;
        if (patternType === 'seatNumberPatterns') displayPattern = 'seatNumber';
        if (patternType === 'rollNumber') displayPattern = 'rollNo';
        if (patternType === 'totalMarksPatterns') displayPattern = 'marks';
        
        console.log(`Validation result for ${displayPattern}: ${isValid ? 'PASSED' : 'FAILED'}`);
        
        if (isValid) {
            validationResult.matchedPatterns.push(displayPattern);
            // Remove from missing patterns if it was there before
            validationResult.missingPatterns = validationResult.missingPatterns
                .filter(p => p !== displayPattern);
        } else {
            validationResult.missingPatterns.push(displayPattern);
            // Remove from matched patterns if it was there before
            validationResult.matchedPatterns = validationResult.matchedPatterns
                .filter(p => p !== displayPattern);
        }
    }
}

module.exports = new TemplateValidator(); 