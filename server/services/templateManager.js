const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const imageExtractorService = require('./imageExtractor');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);
const unlink = promisify(fs.unlink);

class TemplateManagerService {
    constructor() {
        this.imageExtractor = imageExtractorService;
        this.templatesDir = path.join(__dirname, '../data/referenceTemplates');
        this.templateDataDir = path.join(__dirname, '../data/templateData');
        this.ensureDirectories();
    }

    async ensureDirectories() {
        try {
            // Create template directories if they don't exist
            await mkdir(this.templatesDir, { recursive: true });
            await mkdir(this.templateDataDir, { recursive: true });
            console.log('Template directories created or verified');
        } catch (error) {
            console.error('Error creating template directories:', error);
        }
    }

    async addReferenceTemplate(templateFile, boardName, programType, metadata = {}) {
        try {
            // Generate filename based on board and program
            const formattedBoardName = boardName.replace(/\s+/g, '_').toLowerCase();
            const formattedProgramType = programType.replace(/\s+/g, '_').toLowerCase();
            const timestamp = Date.now();
            const filename = `${formattedBoardName}_${formattedProgramType}_${timestamp}${path.extname(templateFile.path)}`;
            
            // Copy the uploaded file to the templates directory
            const targetPath = path.join(this.templatesDir, filename);
            await copyFile(templateFile.path, targetPath);
            
            // Extract data from the template image
            console.log('Extracting data from reference template:', targetPath);
            const extractedData = await this.imageExtractor.extractDataFromImage(targetPath);
            
            // Add metadata
            const templateData = {
                id: `${formattedBoardName}_${formattedProgramType}_${timestamp}`,
                filename,
                imagePath: targetPath,
                board: boardName,
                program: programType,
                timestamp,
                metadata,
                extractedData
            };
            
            // Save template data to JSON file
            const dataFilePath = path.join(this.templateDataDir, `${templateData.id}.json`);
            fs.writeFileSync(dataFilePath, JSON.stringify(templateData, null, 2));
            
            return templateData;
        } catch (error) {
            console.error('Error adding reference template:', error);
            throw error;
        }
    }

    async getAllReferenceTemplates() {
        try {
            const files = await readdir(this.templateDataDir);
            const templateDataFiles = files.filter(file => file.endsWith('.json'));
            
            const templates = [];
            for (const file of templateDataFiles) {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(this.templateDataDir, file), 'utf8'));
                    templates.push(data);
                } catch (e) {
                    console.error(`Error reading template data file ${file}:`, e);
                }
            }
            
            return templates;
        } catch (error) {
            console.error('Error getting reference templates:', error);
            return [];
        }
    }

    async getReferenceTemplateById(id) {
        try {
            const filePath = path.join(this.templateDataDir, `${id}.json`);
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
            return null;
        } catch (error) {
            console.error(`Error getting reference template with ID ${id}:`, error);
            return null;
        }
    }

    async deleteReferenceTemplate(id) {
        try {
            const templateData = await this.getReferenceTemplateById(id);
            if (!templateData) {
                throw new Error(`Template with ID ${id} not found`);
            }
            
            // Delete template data file
            const dataFilePath = path.join(this.templateDataDir, `${id}.json`);
            if (fs.existsSync(dataFilePath)) {
                await unlink(dataFilePath);
            }
            
            // Delete template image file
            if (templateData.imagePath && fs.existsSync(templateData.imagePath)) {
                await unlink(templateData.imagePath);
            }
            
            return { success: true, message: 'Template deleted successfully' };
        } catch (error) {
            console.error(`Error deleting reference template with ID ${id}:`, error);
            throw error;
        }
    }

    async updateReferenceTemplate(id, updates) {
        try {
            const templateData = await this.getReferenceTemplateById(id);
            if (!templateData) {
                throw new Error(`Template with ID ${id} not found`);
            }
            
            // Update fields
            const updatedTemplate = { ...templateData, ...updates };
            
            // Save updated data
            const dataFilePath = path.join(this.templateDataDir, `${id}.json`);
            fs.writeFileSync(dataFilePath, JSON.stringify(updatedTemplate, null, 2));
            
            return updatedTemplate;
        } catch (error) {
            console.error(`Error updating reference template with ID ${id}:`, error);
            throw error;
        }
    }

    // Create a template with predetermined extracted data (useful when OCR fails)
    async addBasicTemplate(templateFile, boardName, programType, metadata = {}, extractedData = {}) {
        try {
            console.log(`Adding basic template with predetermined data for ${boardName} - ${programType}`);
            
            // Generate filename based on board and program
            const formattedBoardName = boardName.replace(/\s+/g, '_').toLowerCase();
            const formattedProgramType = programType.replace(/\s+/g, '_').toLowerCase();
            const timestamp = Date.now();
            const filename = `${formattedBoardName}_${formattedProgramType}_${timestamp}${path.extname(templateFile.path)}`;
            
            // Copy the uploaded file to the templates directory
            const targetPath = path.join(this.templatesDir, filename);
            await copyFile(templateFile.path, targetPath);
            
            // No extraction - use provided data
            console.log('Using provided extracted data:', extractedData);
            
            // Add metadata
            const templateData = {
                id: `${formattedBoardName}_${formattedProgramType}_${timestamp}`,
                filename,
                imagePath: targetPath,
                board: boardName,
                program: programType,
                timestamp,
                metadata,
                extractedData: {
                    // Ensure at least these basic fields are present
                    board: extractedData.board || boardName,
                    program: extractedData.program || programType,
                    studentName: extractedData.studentName || null,
                    seatNumber: extractedData.seatNumber || null,
                    rollNumber: extractedData.rollNumber || null,
                    ...extractedData
                }
            };
            
            // Save template data to JSON file
            const dataFilePath = path.join(this.templateDataDir, `${templateData.id}.json`);
            fs.writeFileSync(dataFilePath, JSON.stringify(templateData, null, 2));
            
            console.log(`Basic template added successfully with ID: ${templateData.id}`);
            return templateData;
        } catch (error) {
            console.error('Error adding basic reference template:', error);
            throw error;
        }
    }

    // Compare uploaded document data with reference templates to find the best match
    async matchWithReferenceTemplates(extractedData) {
        try {
            // Get all reference templates
            const templates = await this.getAllReferenceTemplates();
            if (templates.length === 0) {
                return { 
                    matched: false, 
                    message: 'No reference templates available for matching'
                };
            }
            
            // Filter templates by board/program if available
            let potentialTemplates = templates;
            if (extractedData.board) {
                // Case-insensitive matching for board name
                const boardRegex = new RegExp(extractedData.board, 'i');
                potentialTemplates = potentialTemplates.filter(template => 
                    boardRegex.test(template.board) || 
                    (template.extractedData.board && boardRegex.test(template.extractedData.board))
                );
            }
            
            if (extractedData.program) {
                const programRegex = new RegExp(extractedData.program, 'i');
                potentialTemplates = potentialTemplates.filter(template => 
                    programRegex.test(template.program) || 
                    (template.extractedData.program && programRegex.test(template.extractedData.program))
                );
            }
            
            // If no potential matches after filtering, try all templates
            if (potentialTemplates.length === 0) {
                potentialTemplates = templates;
            }

            // Calculate matching score for each template
            const matchResults = potentialTemplates.map(template => {
                const score = this.calculateMatchScore(extractedData, template.extractedData);
                return {
                    templateId: template.id,
                    templateName: `${template.board} - ${template.program}`,
                    score,
                    template
                };
            });
            
            // Sort by score (highest first)
            matchResults.sort((a, b) => b.score - a.score);
            
            // Get the best match
            const bestMatch = matchResults[0];
            
            // Determine if it's a good match (score > 0.6 is considered good)
            const isGoodMatch = bestMatch.score > 0.6;
            
            return {
                matched: isGoodMatch,
                bestMatch: bestMatch.template,
                score: bestMatch.score,
                allMatches: matchResults,
                message: isGoodMatch 
                    ? `Matched with template: ${bestMatch.templateName} (Score: ${bestMatch.score.toFixed(2)})` 
                    : `No good match found. Best candidate: ${bestMatch.templateName} (Score: ${bestMatch.score.toFixed(2)})`
            };
        } catch (error) {
            console.error('Error matching with reference templates:', error);
            throw error;
        }
    }

    // Calculate a matching score between extracted data and a reference template
    calculateMatchScore(extractedData, templateData) {
        let matchScore = 0;
        let totalFields = 0;
        
        // Define weights for different fields
        const fieldWeights = {
            board: 0.2,
            program: 0.2,
            studentName: 0.1,  // Format matters more than content
            seatNumber: 0.05,  // Format matters more than content
            rollNumber: 0.05,  // Format matters more than content
            examYear: 0.1,
            subjects: 0.3      // Subject patterns are very important
        };
        
        // Check for board match
        if (extractedData.board && templateData.board) {
            const boardMatch = this.calculateStringMatchScore(extractedData.board, templateData.board);
            matchScore += boardMatch * fieldWeights.board;
            totalFields += fieldWeights.board;
        }
        
        // Check for program match
        if (extractedData.program && templateData.program) {
            const programMatch = this.calculateStringMatchScore(extractedData.program, templateData.program);
            matchScore += programMatch * fieldWeights.program;
            totalFields += fieldWeights.program;
        }
        
        // Check for format similarities in name (not the actual name)
        if (extractedData.studentName && templateData.studentName) {
            // Check if name formats are similar (number of words, capitalization pattern)
            const nameFormatMatch = this.compareNameFormats(extractedData.studentName, templateData.studentName);
            matchScore += nameFormatMatch * fieldWeights.studentName;
            totalFields += fieldWeights.studentName;
        }
        
        // Check for seat/roll number format similarities
        if ((extractedData.seatNumber || extractedData.rollNumber) && 
            (templateData.seatNumber || templateData.rollNumber)) {
            const extractedId = extractedData.seatNumber || extractedData.rollNumber;
            const templateId = templateData.seatNumber || templateData.rollNumber;
            
            // Compare ID formats (length, pattern of letters/numbers)
            const idFormatMatch = this.compareIdFormats(extractedId, templateId);
            matchScore += idFormatMatch * fieldWeights.seatNumber;
            totalFields += fieldWeights.seatNumber;
        }
        
        // Check for exam year format
        if (extractedData.examYear && templateData.examYear) {
            const yearFormatMatch = extractedData.examYear.length === templateData.examYear.length ? 1 : 0;
            matchScore += yearFormatMatch * fieldWeights.examYear;
            totalFields += fieldWeights.examYear;
        }
        
        // Check for similarity in subjects structure
        if (extractedData.subjects && templateData.subjects) {
            const subjectsFormatMatch = this.compareSubjectsFormat(
                extractedData.subjects, 
                templateData.subjects
            );
            matchScore += subjectsFormatMatch * fieldWeights.subjects;
            totalFields += fieldWeights.subjects;
        }
        
        // If raw text is available, do additional pattern matching
        if (extractedData.rawText && templateData.rawText) {
            const textPatternMatch = this.compareTextPatterns(extractedData.rawText, templateData.rawText);
            matchScore += textPatternMatch * 0.2;  // Add bonus for text pattern match
            totalFields += 0.2;
        }
        
        // Normalize score based on fields that were compared
        return totalFields > 0 ? (matchScore / totalFields) : 0;
    }

    // Helper methods for matching
    calculateStringMatchScore(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        // Simple case - exact match
        if (s1 === s2) return 1;
        
        // Check if one contains the other
        if (s1.includes(s2) || s2.includes(s1)) return 0.8;
        
        // Check for word overlap
        const words1 = s1.split(/\s+/);
        const words2 = s2.split(/\s+/);
        
        let matchedWords = 0;
        for (const word1 of words1) {
            if (word1.length < 3) continue; // Skip very short words
            
            if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
                matchedWords++;
            }
        }
        
        return words1.length > 0 ? matchedWords / words1.length : 0;
    }
    
    compareNameFormats(name1, name2) {
        const words1 = name1.split(/\s+/).length;
        const words2 = name2.split(/\s+/).length;
        
        // Compare number of words in name
        const wordCountMatch = 1 - Math.abs(words1 - words2) / Math.max(words1, words2);
        
        // Compare capitalization pattern
        const cap1 = name1.match(/[A-Z]/g)?.length || 0;
        const cap2 = name2.match(/[A-Z]/g)?.length || 0;
        const capMatch = 1 - Math.abs(cap1 - cap2) / Math.max(cap1, cap2, 1);
        
        return (wordCountMatch + capMatch) / 2;
    }
    
    compareIdFormats(id1, id2) {
        // Compare length
        const lengthMatch = 1 - Math.abs(id1.length - id2.length) / Math.max(id1.length, id2.length);
        
        // Compare pattern of letters and numbers
        const pattern1 = id1.replace(/[A-Za-z]/g, 'A').replace(/[0-9]/g, 'N');
        const pattern2 = id2.replace(/[A-Za-z]/g, 'A').replace(/[0-9]/g, 'N');
        
        let patternMatch = 0;
        const minLength = Math.min(pattern1.length, pattern2.length);
        for (let i = 0; i < minLength; i++) {
            if (pattern1[i] === pattern2[i]) patternMatch++;
        }
        patternMatch = patternMatch / minLength;
        
        return (lengthMatch + patternMatch) / 2;
    }
    
    compareSubjectsFormat(subjects1, subjects2) {
        // Convert both to arrays if they're objects
        const subjectArray1 = Array.isArray(subjects1) ? subjects1 : Object.values(subjects1);
        const subjectArray2 = Array.isArray(subjects2) ? subjects2 : Object.values(subjects2);
        
        // Compare number of subjects
        const countMatch = 1 - Math.abs(subjectArray1.length - subjectArray2.length) / 
                              Math.max(subjectArray1.length, subjectArray2.length, 1);
        
        // Check if they have similar structure (both have marks, subjects, etc.)
        let structureMatch = 0;
        
        // Sample first item from each
        const sample1 = subjectArray1[0];
        const sample2 = subjectArray2[0];
        
        if (sample1 && sample2) {
            const keys1 = Object.keys(sample1);
            const keys2 = Object.keys(sample2);
            
            // Count matching keys
            let matchingKeys = 0;
            for (const key1 of keys1) {
                if (keys2.some(key2 => key2.toLowerCase().includes(key1.toLowerCase()) || 
                                      key1.toLowerCase().includes(key2.toLowerCase()))) {
                    matchingKeys++;
                }
            }
            
            structureMatch = keys1.length > 0 ? matchingKeys / keys1.length : 0;
        }
        
        return (countMatch + structureMatch) / 2;
    }
    
    compareTextPatterns(text1, text2) {
        // Look for common section headers, labels, formats
        const patterns = [
            /STUDENT\s+NAME/i,
            /CANDIDATE/i,
            /ROLL\s+NO/i,
            /SEAT\s+NO/i,
            /TOTAL\s+MARKS/i,
            /PERCENTAGE/i,
            /GRADE/i,
            /DIVISION/i,
            /EXAMINATION/i,
            /CERTIFICATE/i,
            /RESULT/i
        ];
        
        let matchCount = 0;
        for (const pattern of patterns) {
            const match1 = pattern.test(text1);
            const match2 = pattern.test(text2);
            
            if (match1 === match2) {
                matchCount++;
            }
        }
        
        return patterns.length > 0 ? matchCount / patterns.length : 0;
    }
}

module.exports = new TemplateManagerService(); 