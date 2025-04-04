// Test script to check templateRoutes
const express = require('express');
const app = express();
const port = 5555;

// Mock controller functions
const templateController = {
  trainTemplate: (req, res) => res.json({ message: 'Train template mock called' }),
  getTemplatePatterns: (req, res) => res.json({ message: 'Get patterns mock called' }),
  validateExtractedData: (req, res) => res.json({ message: 'Validate mock called' })
};

const templateManagerController = {
  uploadMiddleware: (req, res, next) => next(),
  addReferenceTemplate: (req, res) => res.json({ message: 'Add template mock called' }),
  getAllReferenceTemplates: (req, res) => res.json({ message: 'Get all templates mock called' }),
  getReferenceTemplateById: (req, res) => res.json({ message: 'Get template by ID mock called' }),
  updateReferenceTemplate: (req, res) => res.json({ message: 'Update template mock called' }),
  deleteReferenceTemplate: (req, res) => res.json({ message: 'Delete template mock called' }),
  getTemplateImage: (req, res) => res.json({ message: 'Get image mock called' }),
  matchWithReferenceTemplates: (req, res) => res.json({ message: 'Match templates mock called' })
};

// Mock multer middleware
const upload = {
  single: () => (req, res, next) => next()
};

// Set up the routes
const router = express.Router();

// Routes
router.post('/train', upload.single('template'), templateController.trainTemplate);
router.get('/patterns', templateController.getTemplatePatterns);
router.post('/validate', templateController.validateExtractedData);

// New routes for reference template management
router.route('/reference')
    .post(templateManagerController.uploadMiddleware, templateManagerController.addReferenceTemplate)
    .get(templateManagerController.getAllReferenceTemplates);

router.route('/reference/:id')
    .get(templateManagerController.getReferenceTemplateById)
    .put(templateManagerController.updateReferenceTemplate)
    .delete(templateManagerController.deleteReferenceTemplate);

router.get('/reference/:id/image', templateManagerController.getTemplateImage);

// Route for matching uploaded document with reference templates
router.post('/match', templateManagerController.uploadMiddleware, templateManagerController.matchWithReferenceTemplates);

// Use the router
app.use('/api/templates', router);

// Start server
app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log('Routes should be properly configured');
}); 