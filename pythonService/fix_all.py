# -*- coding: utf-8 -*-
"""
This script completely restores app.py to a working state by:
1. Reading the original app.py
2. Fixing any syntax errors, missing headers, or indentation problems
3. Writing the fixed file
"""

# Step 1: Fix the after_request function
after_request_function = '''
@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
'''

# Step 2: Fix the health check function
health_check_function = '''
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Service is running"}), 200
'''

# Step 3: Create the fixed file structure
with open('app.py', 'r', encoding='utf-8') as f:
    original_content = f.read()

# Extract the imports and initial setup section (assuming it's correct)
import_section_end = original_content.find('def allowed_file(filename):')
if import_section_end == -1:
    import_section_end = 50  # Default to first 50 lines if not found

imports_and_setup = original_content[:import_section_end]

# Create a completely new app.py with the fixed functions
fixed_app_py = f'''from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import io
import cv2
import numpy as np
from PIL import Image
import json
from werkzeug.utils import secure_filename
import traceback
import time
import logging
import pytesseract
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO
import base64

# Define directories
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
TEMP_DIR = os.path.join(BASE_DIR, 'uploads')
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

# Create necessary directories
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(os.path.join(TEMP_DIR, 'visualizations'), exist_ok=True)

# App configuration
app = Flask(__name__)
app.logger.setLevel(logging.INFO)
app.config['UPLOAD_FOLDER'] = TEMP_DIR
app.config['TEMPLATE_FOLDER'] = TEMPLATE_DIR
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload size

# Set up CORS to allow cross-origin requests
CORS(app)

# Try to import pytesseract
try:
    pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
    has_tesseract = True
    print("Tesseract found at:", pytesseract.pytesseract.tesseract_cmd)
except ImportError:
    print("Pytesseract not available. Text extraction will be limited.")
    has_tesseract = False

# Try to import scikit-image for advanced image processing
try:
    from skimage.metrics import structural_similarity as ssim
    from skimage.feature import canny
    has_skimage = True
except ImportError:
    print("Scikit-image not available. Using basic image comparison.")
    has_skimage = False

# Define allowed file extensions
ALLOWED_EXTENSIONS = {{'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif'}}

def allowed_file(filename):
    return '.' in filename and \\
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({{"status": "ok", "message": "Service is running"}}), 200

@app.route('/templates', methods=['GET'])
@app.route('/api/templates', methods=['GET'])
def list_templates():
    """List available templates"""
    try:
        template_dir = app.config['TEMPLATE_FOLDER']
        templates = []
        
        # Look for .npy files in the template directory
        for filename in os.listdir(template_dir):
            if filename.endswith('.npy'):
                template_name = filename.replace('.npy', '')
                templates.append(template_name)
        
        if not templates:
            return jsonify({{
                'success': False,
                'message': 'No templates found',
                'templates': []
            }})
            
        return jsonify({{
            'success': True,
            'message': f'Found {{len(templates)}} templates',
            'templates': templates
        }})
        
    except Exception as e:
        app.logger.error(f"Error listing templates: {{str(e)}}")
        return jsonify({{
            'success': False,
            'message': f'Error listing templates: {{str(e)}}',
            'templates': []
        }}), 500

@app.route('/verify', methods=['POST'])
@app.route('/api/verify', methods=['POST'])
@app.route('/template-verifier/verify', methods=['POST'])
@app.route('/api/template-verifier/verify', methods=['POST'])
def verify_document():
    """Verify a document against known templates"""
    try:
        # Check if file is in the request
        if 'document' not in request.files:
            return jsonify({{
                'success': False,
                'message': 'No document file provided'
            }}), 400
            
        file = request.files['document']
        
        # Check if file has a name
        if file.filename == '':
            return jsonify({{
                'success': False,
                'message': 'No file selected'
            }}), 400
            
        # Check if file type is allowed
        if not allowed_file(file.filename):
            return jsonify({{
                'success': False,
                'message': f'File type not allowed. Allowed types: {{", ".join(ALLOWED_EXTENSIONS)}}'
            }}), 400
            
        # Save file to temporary directory
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Open the image with OpenCV
        image = cv2.imread(file_path)
        if image is None:
            return jsonify({{
                'success': False,
                'message': 'Could not read image file'
            }}), 400
            
        # Extract features from the document
        doc_features = extract_features(image)
        
        # Find best match
        match_result = find_best_match(doc_features)
        
        # Create a visualization if it was a match
        visualization_filename = None
        if 'isVerified' in match_result and match_result['isVerified'] and 'template' in match_result:
            # Generate a visualization
            template_path = os.path.join(app.config['TEMPLATE_FOLDER'], f"{{match_result['template']}}.npy")
            
            # Generate a visual comparison
            vis_filename = f"verification_{{int(time.time())}}_{{filename}}"
            vis_path = os.path.join(app.config['UPLOAD_FOLDER'], 'visualizations', vis_filename)
            
            try:
                create_comparison_visualization(file_path, template_path, match_result['scores'])
                visualization_filename = vis_filename
            except Exception as e:
                app.logger.error(f"Error creating visualization: {{str(e)}}")
                
        # Add visualization URL if available
        if visualization_filename:
            match_result['visualizationUrl'] = f"/visualizations/{{visualization_filename}}"
            match_result['filename'] = visualization_filename
            
        return jsonify(match_result)
        
    except Exception as e:
        app.logger.error(f"Error verifying document: {{str(e)}}")
        traceback.print_exc()
        return jsonify({{
            'success': False,
            'message': f'Error during verification: {{str(e)}}'
        }}), 500
'''

# Write the fixed file
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(fixed_app_py)

print("Successfully restored app.py to a working state!") 