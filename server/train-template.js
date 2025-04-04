const path = require('path');
const templateTrainer = require('./services/templateTrainer');

async function trainTemplateFromSample() {
    try {
        // Path to the sample marksheet
        const samplePath = path.join(__dirname, 'uploads/templates/template-ssc.jpg');
        
        console.log('Starting template training with sample marksheet...');
        const result = await templateTrainer.trainFromImage(samplePath, 'SSC');
        
        if (result.success) {
            console.log('Template training successful!');
            console.log('Extracted patterns:', JSON.stringify(templateTrainer.getPatterns(), null, 2));
        } else {
            console.error('Template training failed:', result.error);
        }
    } catch (error) {
        console.error('Error during template training:', error);
    }
}

// Run the training
trainTemplateFromSample(); 