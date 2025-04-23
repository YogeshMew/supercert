from flask import Flask, request, jsonify, send_from_directory
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
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
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
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(img):
    """
    Preprocess image for feature extraction
    Converts to grayscale, applies thresholding, etc.
    """
    try:
        # Convert numpy array to PIL Image if needed
        if isinstance(img, np.ndarray):
            # Convert BGR to RGB if needed (OpenCV uses BGR)
            if len(img.shape) == 3 and img.shape[2] == 3:  # If it has 3 channels
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(img_rgb)
            else:
                pil_img = Image.fromarray(img)
        else:
            pil_img = img
            
        # Ensure image is in RGB mode
        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
            
        # Convert back to numpy array for OpenCV operations
        img = np.array(pil_img)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Perform morphological operations to reduce noise
        kernel = np.ones((2, 2), np.uint8)
        processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return processed
    except Exception as e:
        app.logger.error(f"Error preprocessing image: {str(e)}")
        # Fallback to basic grayscale conversion
        if isinstance(img, np.ndarray):
            if len(img.shape) == 3:
                return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            return img  # Already grayscale
        else:
            return np.array(img.convert('L'))

def extract_text(image):
    """Extract text from image using OCR"""
    try:
        if not has_tesseract:
            return ""
            
        # Extract text with different configs for better coverage
        text1 = pytesseract.image_to_string(image)
        text2 = pytesseract.image_to_string(image, config='--psm 6')
        text3 = pytesseract.image_to_string(image, config='--psm 4')
        
        # Use the longest text as it likely has the most information
        text = max([text1, text2, text3], key=len)
        return text
    except Exception as e:
        app.logger.error(f"OCR error: {str(e)}")
        return ""

def calculate_edge_density(processed_img):
    """Calculate edge density for layout analysis"""
    # Apply Canny edge detection
    edges = cv2.Canny(processed_img, 50, 150)
    
    # Calculate edge density
    edge_pixels = np.sum(edges > 0)
    total_pixels = edges.shape[0] * edges.shape[1]
    edge_density = float(edge_pixels) / total_pixels if total_pixels > 0 else 0
    
    # Calculate edge density in different regions
    h, w = edges.shape
    regions = []
    region_size = 3  # 3x3 grid
    
    for i in range(region_size):
        for j in range(region_size):
            # Define region boundaries
            y1 = int(i * h / region_size)
            y2 = int((i + 1) * h / region_size)
            x1 = int(j * w / region_size)
            x2 = int((j + 1) * w / region_size)
            
            # Calculate density in this region
            region = edges[y1:y2, x1:x2]
            region_edge_pixels = np.sum(region > 0)
            region_total_pixels = region.shape[0] * region.shape[1]
            region_density = float(region_edge_pixels) / region_total_pixels if region_total_pixels > 0 else 0
            
            regions.append(region_density)
    
    # Return overall density and regional densities
    return {
        'overall': edge_density,
        'regions': regions
    }

def detect_maharashtra_ssc(text):
    """Detect if document is a Maharashtra SSC certificate based on text"""
    text_upper = text.upper()
    
    # Check for Maharashtra SSC specific text patterns
    is_maharashtra = 'MAHARASHTRA' in text_upper
    is_ssc = ('SECONDARY SCHOOL CERTIFICATE' in text_upper or 
              'S.S.C' in text_upper or 
              'SSC' in text_upper)
    
    # Check for Mumbai related keywords
    is_mumbai = ('MUMBAI' in text_upper or 
                'BOMBAY' in text_upper)
    
    # Check for typical Maharashtra SSC Board text
    is_board = ('STATE BOARD' in text_upper or 
               'DIVISIONAL BOARD' in text_upper)
    
    # Combined score
    score = sum([
        2 if is_maharashtra else 0,
        2 if is_ssc else 0,
        1 if is_mumbai else 0,
        1 if is_board else 0
    ])
    
    return {
        'is_maharashtra_ssc': score >= 3,
        'score': score,
        'is_maharashtra': is_maharashtra,
        'is_ssc': is_ssc,
        'is_mumbai': is_mumbai,
        'is_board': is_board
    }

def detect_maharashtra_hsc(text):
    """Detect if document is a Maharashtra HSC certificate based on text"""
    text_upper = text.upper()
    
    # Check for Maharashtra HSC specific text patterns
    is_maharashtra = 'MAHARASHTRA' in text_upper
    is_hsc = ('HIGHER SECONDARY CERTIFICATE' in text_upper or 
              'H.S.C' in text_upper or 
              'HSC' in text_upper)
    
    # Check for Mumbai related keywords
    is_mumbai = ('MUMBAI' in text_upper or 
                'BOMBAY' in text_upper)
    
    # Check for typical Maharashtra HSC Board text
    is_board = ('STATE BOARD' in text_upper or 
               'DIVISIONAL BOARD' in text_upper)
    
    # Combined score
    score = sum([
        2 if is_maharashtra else 0,
        2 if is_hsc else 0,
        1 if is_mumbai else 0,
        1 if is_board else 0
    ])
    
    return {
        'is_maharashtra_hsc': score >= 3,
        'score': score,
        'is_maharashtra': is_maharashtra,
        'is_hsc': is_hsc,
        'is_mumbai': is_mumbai,
        'is_board': is_board
    }

def extract_seal_positions(processed_img):
    """Extract seal/logo positions from processed image"""
    try:
        # Use Hough Circle Transform to detect circular patterns (seals/stamps)
        circles = cv2.HoughCircles(
            processed_img,
            cv2.HOUGH_GRADIENT,
            1,
            20,
            param1=50,
            param2=30,
            minRadius=20,
            maxRadius=100
        )
        
        # Check upper left for possible logo
        h, w = processed_img.shape
        upper_left = processed_img[:int(h/4), :int(w/4)]
        upper_left_density = np.sum(upper_left > 0) / (upper_left.shape[0] * upper_left.shape[1])
        
        # Check bottom for possible seal/stamp
        bottom = processed_img[int(3*h/4):, :]
        
        # Initialize return value
        result = {
            'circles': [],
            'upper_left_density': float(upper_left_density),
            'has_logo_pattern': upper_left_density > 0.1
        }
        
        # Add detected circles if any
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            result['circles'] = circles.tolist()
            
            # Check if any circles in bottom region (likely to be stamps/seals)
            bottom_circles = []
            for (x, y, r) in circles:
                # Adjust y to document coordinates
                adj_y = y
                if adj_y >= int(3*h/4):
                    bottom_circles.append([x, y, r])
            
            result['bottom_circles'] = bottom_circles
            result['has_seal_pattern'] = len(bottom_circles) > 0
        else:
            result['has_seal_pattern'] = False
        
        return result
    except Exception as e:
        app.logger.error(f"Error extracting seal positions: {str(e)}")
        return {
            'circles': [],
            'upper_left_density': 0.0,
            'has_logo_pattern': False,
            'has_seal_pattern': False
        }

def extract_table_structure(processed_img):
    """Extract table structure from processed image"""
    try:
        # Create copies for horizontal and vertical line detection
        horizontal = np.copy(processed_img)
        vertical = np.copy(processed_img)
        
        # Get image dimensions
        img_height, img_width = horizontal.shape
        
        # Define kernel sizes based on image dimensions
        kernel_length_h = img_width // 30
        kernel_length_v = img_height // 30
        
        # Create horizontal kernel and apply morphology
        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_length_h, 1))
        horizontal = cv2.erode(horizontal, kernel_h)
        horizontal = cv2.dilate(horizontal, kernel_h)
        
        # Create vertical kernel and apply morphology
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, kernel_length_v))
        vertical = cv2.erode(vertical, kernel_v)
        vertical = cv2.dilate(vertical, kernel_v)
        
        # Detect lines using Hough transform
        horizontal_lines = cv2.HoughLinesP(
            horizontal, 1, np.pi/180, 100, 
            minLineLength=img_width//3, maxLineGap=20
        )
        
        vertical_lines = cv2.HoughLinesP(
            vertical, 1, np.pi/180, 100, 
            minLineLength=img_height//3, maxLineGap=20
        )
        
        h_lines_count = len(horizontal_lines) if horizontal_lines is not None else 0
        v_lines_count = len(vertical_lines) if vertical_lines is not None else 0
        
        # Convert lines to list format if they exist
        h_lines_list = []
        if horizontal_lines is not None:
            for line in horizontal_lines:
                h_lines_list.append(line[0].tolist())
                
        v_lines_list = []
        if vertical_lines is not None:
            for line in vertical_lines:
                v_lines_list.append(line[0].tolist())
        
        # Determine if image likely contains a table structure
        has_table = h_lines_count >= 5 and v_lines_count >= 3
        
        return {
            'horizontal_lines': h_lines_list,
            'vertical_lines': v_lines_list,
            'h_lines_count': h_lines_count,
            'v_lines_count': v_lines_count,
            'has_table': has_table
        }
    except Exception as e:
        app.logger.error(f"Error extracting table structure: {str(e)}")
        return {
            'horizontal_lines': [],
            'vertical_lines': [],
            'h_lines_count': 0,
            'v_lines_count': 0,
            'has_table': False
        }

def detect_signature_area(processed_img):
    """Detect signature area in the image"""
    try:
        # Get image dimensions
        img_height, img_width = processed_img.shape
        
        # Define potential signature regions (bottom right is most common)
        regions = {
            'bottom_right': processed_img[int(0.7*img_height):, int(0.7*img_width):],
            'bottom_left': processed_img[int(0.7*img_height):, :int(0.3*img_width)],
            'bottom_center': processed_img[int(0.7*img_height):, int(0.3*img_width):int(0.7*img_width)]
        }
        
        results = {}
        for region_name, region in regions.items():
            # Skip empty regions
            if region.size == 0:
                results[region_name] = {
                    'edge_density': 0,
                    'has_signature': False
                }
                continue
                
            # Calculate edge density in region
            region_edges = cv2.Canny(region, 30, 100)
            edge_count = np.sum(region_edges > 0)
            edge_density = float(edge_count) / region.size if region.size > 0 else 0
            
            # Signatures typically have moderate edge density
            has_signature = 0.05 <= edge_density <= 0.25
            
            results[region_name] = {
                'edge_density': float(edge_density),
                'has_signature': has_signature
            }
        
        # Overall determination
        has_signature = any(r['has_signature'] for r in results.values())
        
        return {
            'regions': results,
            'has_signature': has_signature
        }
    except Exception as e:
        app.logger.error(f"Error detecting signature area: {str(e)}")
        return {
            'regions': {},
            'has_signature': False
        }

def extract_features(image):
    """
    Extract document features for verification
    Args:
        image: PIL Image, OpenCV image or path to image
    Returns:
        dict: Extracted features
    """
    try:
        # Convert image to proper format for processing if needed
        if isinstance(image, str):
            # It's a file path
            image = cv2.imread(image)
        
        # Store original image for some processing
        original_image = image.copy() if isinstance(image, np.ndarray) else image
        
        # Make sure we have a numpy array
        if not isinstance(original_image, np.ndarray):
            original_image = np.array(original_image)
        
        # Preprocess image
        processed = preprocess_image(original_image)
        
        # Initialize features dictionary
        features = {}
        
        # Get image dimensions from original image
        if len(original_image.shape) == 3:
            height, width = original_image.shape[:2]
            # Convert BGR to RGB for text extraction
            rgb_image = cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB)
        else:
            height, width = original_image.shape
            # Convert grayscale to RGB
            rgb_image = cv2.cvtColor(original_image, cv2.COLOR_GRAY2RGB)
        
        # Store document dimensions
        features['dimensions'] = {
            'width': width,
            'height': height,
            'aspect_ratio': width / height if height > 0 else 0
        }
        
        # Extract text using OCR
        text = extract_text(rgb_image)
        features['text'] = text
        features['text_len'] = len(text)
        
        # Calculate edge density for layout analysis
        edge_density_data = calculate_edge_density(processed)
        features['edge_density'] = edge_density_data
        
        # Calculate grid features (8x8 grid of average intensity values)
        grid_features = []
        edge_density = []
        
        grid_size = 8
        cell_width = width // grid_size
        cell_height = height // grid_size
        
        for y in range(grid_size):
            for x in range(grid_size):
                # Calculate cell boundaries
                x1 = x * cell_width
                y1 = y * cell_height
                x2 = min((x + 1) * cell_width, width)
                y2 = min((y + 1) * cell_height, height)
                
                # Extract cell from the image
                if isinstance(rgb_image, np.ndarray) and len(rgb_image.shape) == 3:
                    cell = rgb_image[y1:y2, x1:x2]
                    # Calculate average intensity
                    if cell.size > 0:
                        avg_intensity = np.mean(cell)
                    else:
                        avg_intensity = 255
                    
                    # Calculate edge density in the cell
                    edges = cv2.Canny(cv2.cvtColor(cell, cv2.COLOR_RGB2GRAY), 50, 150)
                    cell_edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1]) * 100 if edges.size > 0 else 0
                else:
                    # Fallback if we don't have a proper color image
                    avg_intensity = 255
                    cell_edge_density = 0
                
                grid_features.append(float(avg_intensity))
                edge_density.append(float(cell_edge_density))
        
        features['grid_features'] = grid_features
        features['edge_density'] = edge_density
        
        # Detect Maharashtra SSC specific features
        features['is_maharashtra_ssc'] = detect_maharashtra_ssc(text)
        
        # Detect Maharashtra HSC specific features
        features['is_maharashtra_hsc'] = detect_maharashtra_hsc(text)
        
        # Extract logo/seal positions
        seal_positions = extract_seal_positions(processed)
        features['seal_positions'] = seal_positions
        
        # Extract table structure
        table_structure = extract_table_structure(processed)
        features['table_structure'] = table_structure
        
        # Extract signature area
        signature_area = detect_signature_area(processed)
        features['signature_area'] = signature_area
        
        # Detect and extract key features (seal, logo, text blocks)
        detected_features = []
        
        # Add detected seals
        if 'circles' in seal_positions and seal_positions['circles']:
            for circle in seal_positions['circles']:
                if isinstance(circle, (list, np.ndarray)) and len(circle) >= 3:
                    x, y, r = circle[:3]
                    detected_features.append({
                        'type': 'seal',
                        'x': int(x - r),
                        'y': int(y - r),
                        'width': int(r * 2),
                        'height': int(r * 2)
                    })
        
        # Add logo area (upper left corner)
        h_quarter, w_quarter = height // 4, width // 4
        if seal_positions.get('has_logo_pattern', False):
            detected_features.append({
                'type': 'logo',
                'x': 9,  # Adjust as needed
                'y': 9,  # Adjust as needed
                'width': width - 18,  # Full width minus padding
                'height': height - 18  # Full height minus padding
            })
        
        # Detect text blocks using contours
        gray = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY) if len(rgb_image.shape) == 3 else rgb_image
        _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours to find text blocks
        min_text_area = (width * height) * 0.002  # Reduced minimum area for HSC/SSC certificates
        max_text_area = (width * height) * 0.25   # Increased maximum area
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if min_text_area < area < max_text_area:
                x, y, w, h = cv2.boundingRect(contour)
                # Check aspect ratio to ensure it's not too narrow or wide
                aspect = w / h if h > 0 else 0
                if 0.1 < aspect < 10:  # More permissive aspect ratio for HSC
                    detected_features.append({
                        'type': 'text_block',
                        'x': int(x),
                        'y': int(y),
                        'width': int(w),
                        'height': int(h)
                    })
        
        features['detected_features'] = detected_features
        
        # Define regions of interest
        regions = {
            'top_left_corner': {
                'x': 0,
                'y': 0,
                'width': width // 4,
                'height': height // 4
            },
            'top_right_corner': {
                'x': width - (width // 4),
                'y': 0,
                'width': width // 4,
                'height': height // 4
            },
            'bottom_left_corner': {
                'x': 0,
                'y': height - (height // 4),
                'width': width // 4,
                'height': height // 4
            },
            'bottom_right_corner': {
                'x': width - (width // 4),
                'y': height - (height // 4),
                'width': width // 4,
                'height': height // 4
            }
        }
        features['regions'] = regions
        
        # Add text patterns
        features['text_patterns'] = {
            'required_text': [],
            'format_patterns': []
        }
        
        # For Maharashtra SSC certificates, add specific text patterns
        if features['is_maharashtra_ssc'].get('is_maharashtra_ssc', False):
            features['text_patterns']['required_text'] = [
                'MAHARASHTRA', 'SECONDARY', 'CERTIFICATE', 'EXAMINATION'
            ]
            features['text_patterns']['format_patterns'] = [
                'STATEMENT OF MARKS', 'DIVISIONAL BOARD'
            ]
        
        # For Maharashtra HSC certificates, add specific text patterns
        if features['is_maharashtra_hsc'].get('is_maharashtra_hsc', False):
            features['text_patterns']['required_text'] = [
                'MAHARASHTRA', 'HIGHER SECONDARY', 'CERTIFICATE', 'EXAMINATION'
            ]
            features['text_patterns']['format_patterns'] = [
                'STATEMENT OF MARKS', 'DIVISIONAL BOARD'
            ]
        
        # Default similarity threshold
        features['similarity_threshold'] = 0.75
        
        return features
    except Exception as e:
        app.logger.error(f"Feature extraction error: {str(e)}")
        # Return minimal features set on error
        return {
            'dimensions': {'width': 0, 'height': 0, 'aspect_ratio': 0},
            'text': '',
            'text_len': 0,
            'grid_features': [],
            'edge_density': [],
            'detected_features': [],
            'regions': {},
            'text_patterns': {'required_text': [], 'format_patterns': []},
            'similarity_threshold': 0.75
        }

def compare_features(doc_features, template_features):
    """Compare document features to template features"""
    try:
        # Initialize scores dictionary
        similarity_scores = {
            'edge_similarity': 0,
            'layout_similarity': 0,  
            'text_similarity': 0,
            'structure_similarity': 0,
            'seal_similarity': 0,
            'logo_similarity': 0,
            'overall': 0
        }
        
        # Check if this is an HSC document based on template name
        is_hsc_template = False
        if isinstance(template_features, dict) and 'is_maharashtra_hsc' in template_features:
            is_hsc_template = template_features['is_maharashtra_hsc'].get('is_maharashtra_hsc', False)
        
        # Compare edge density if available in both
        if 'edge_density' in doc_features and 'edge_density' in template_features:
            doc_density = doc_features['edge_density']
            template_density = template_features['edge_density']
            
            # Calculate overall density similarity
            if 'overall' in doc_density and 'overall' in template_density:
                overall_similarity = 1 - abs(doc_density['overall'] - template_density['overall'])
                
                # Compare regional densities if available
                region_similarity = 0
                if 'regions' in doc_density and 'regions' in template_density:
                    doc_regions = doc_density['regions']
                    template_regions = template_density['regions']
                    
                    # Only compare regions if both have the same number
                    if len(doc_regions) == len(template_regions):
                        region_diffs = [abs(d - t) for d, t in zip(doc_regions, template_regions)]
                        region_similarity = 1 - (sum(region_diffs) / len(region_diffs))
                
                # Combine overall and regional similarity
                edge_similarity = (overall_similarity + region_similarity) / 2 if region_similarity > 0 else overall_similarity
                similarity_scores['edge_similarity'] = edge_similarity
        
        # Compare document dimensions and aspect ratio
        if 'dimensions' in doc_features and 'dimensions' in template_features:
            doc_dims = doc_features['dimensions']
            template_dims = template_features['dimensions']
            
            # Calculate aspect ratio similarity
            if 'aspect_ratio' in doc_dims and 'aspect_ratio' in template_dims:
                aspect_similarity = 1 - min(abs(doc_dims['aspect_ratio'] - template_dims['aspect_ratio']) / max(doc_dims['aspect_ratio'], template_dims['aspect_ratio']), 1)
                similarity_scores['layout_similarity'] = aspect_similarity
        
        # Compare text features - more lenient for HSC
        # For HSC, we'll do special text pattern matching
        if is_hsc_template:
            # Check for HSC-specific text patterns in the document
            doc_text = doc_features.get('text', '').upper()
            hsc_indicators = [
                'HIGHER SECONDARY', 'HSC', 'H.S.C.', 
                'STATEMENT OF MARKS', 'MAHARASHTRA STATE BOARD',
                'MUMBAI DIVISIONAL BOARD'
            ]
            
            # Count matches
            matches = sum(1 for pattern in hsc_indicators if pattern in doc_text)
            text_sim_score = min(matches / len(hsc_indicators), 1.0)  # Normalize to 0-1
            
            similarity_scores['text_similarity'] = text_sim_score
        else:
            # Standard text comparison for non-HSC documents
        if 'text_features' in doc_features and 'text_features' in template_features:
                doc_text = doc_features['text_features']
                template_text = template_features['text_features']
                
                # Compare key phrases if available
                text_sim_score = 0
                if 'key_phrases' in doc_text and 'key_phrases' in template_text:
                    # Count matching phrases
                    doc_phrases = set(doc_text['key_phrases'])
                    template_phrases = set(template_text['key_phrases'])
                    
                    if len(template_phrases) > 0:
                        matches = doc_phrases.intersection(template_phrases)
                        text_sim_score = len(matches) / len(template_phrases)
                
                similarity_scores['text_similarity'] = text_sim_score
        
        # Compare document type indicators
        if 'is_maharashtra_hsc' in doc_features and 'is_maharashtra_hsc' in template_features:
            # For HSC docs, check HSC indicators
            doc_is_hsc = doc_features['is_maharashtra_hsc'].get('is_maharashtra_hsc', False)
            template_is_hsc = template_features['is_maharashtra_hsc'].get('is_maharashtra_hsc', False)
            
            # Match if both are HSC
            type_match_hsc = 1 if doc_is_hsc and template_is_hsc else 0
            
            if type_match_hsc > 0:
                similarity_scores['structure_similarity'] = type_match_hsc
        
        if 'is_maharashtra_ssc' in doc_features and 'is_maharashtra_ssc' in template_features:
            # For SSC docs, check SSC indicators
            doc_is_ssc = doc_features['is_maharashtra_ssc'].get('is_maharashtra_ssc', False)
            template_is_ssc = template_features['is_maharashtra_ssc'].get('is_maharashtra_ssc', False)
            
            # Match if both are SSC
            type_match_ssc = 1 if doc_is_ssc and template_is_ssc else 0
            
            if type_match_ssc > 0:
                similarity_scores['structure_similarity'] = type_match_ssc
        
        # Compare seal positions
        if 'seal_positions' in doc_features and 'seal_positions' in template_features:
            doc_seals = doc_features['seal_positions']
            template_seals = template_features['seal_positions']
            
            # Check if both have circles
            seal_similarity = 0
            if 'circles' in doc_seals and 'circles' in template_seals:
                doc_circles = doc_seals['circles']
                template_circles = template_seals['circles']
                
                # If both have circles, compare counts (more lenient for HSC)
                if doc_circles and template_circles:
                    min_count = min(len(doc_circles), len(template_circles))
                    max_count = max(len(doc_circles), len(template_circles))
                    count_ratio = min_count / max_count if max_count > 0 else 0
                    
                    # For HSC, we're more concerned about having any seals than exact count match
                    if is_hsc_template:
                        seal_similarity = max(0.8 if min_count > 0 else 0, count_ratio)
                else:
                        seal_similarity = count_ratio
            
            similarity_scores['seal_similarity'] = seal_similarity
        
        # Compare logo presence (more important for HSC)
        if 'seal_positions' in doc_features and 'seal_positions' in template_features:
            doc_logo = doc_features['seal_positions'].get('has_logo_pattern', False)
            template_logo = template_features['seal_positions'].get('has_logo_pattern', False)
            
                # Simple match - both have or don't have logo
            logo_match = 1 if doc_logo == template_logo else 0
            
            # For HSC, logo presence is very indicative
            logo_weight = 1.0 if is_hsc_template else 0.8
            similarity_scores['logo_similarity'] = logo_match * logo_weight
        
        # Adjust weights based on document type
        if is_hsc_template:
            # HSC weights - rely more on text patterns and less on structure
            weights = {
                'edge_similarity': 0.15,   
                'layout_similarity': 0.15,
                'text_similarity': 0.40,    # Text patterns are more important for HSC
                'structure_similarity': 0.1,
                'seal_similarity': 0.1,
                'logo_similarity': 0.1
            }
        else:
            # Standard weights
            weights = {
                'edge_similarity': 0.3,
                'layout_similarity': 0.25,
                'text_similarity': 0.3,
                'structure_similarity': 0.05,
                'seal_similarity': 0.05,
                'logo_similarity': 0.05
            }
        
        # Only use scores that have values (not zeros from missing features)
        valid_scores = {}
        valid_weights = {}
        
        for key, score in similarity_scores.items():
            if key != 'overall' and score > 0:
                # Lower thresholds for HSC documents
                if is_hsc_template:
                    if key == 'text_similarity' and score < 0.5:  # Less strict text match for HSC
                        score = 0
                    elif key == 'edge_similarity' and score < 0.5:  # Less strict edge match for HSC
                        score = 0
                    elif key == 'layout_similarity' and score < 0.6:  # Less strict layout match for HSC
                        score = 0
                else:
                    # Standard thresholds for other documents
                    if key == 'text_similarity' and score < 0.7:
                        score = 0
                    elif key == 'edge_similarity' and score < 0.65:
                        score = 0
                    elif key == 'layout_similarity' and score < 0.7:
                        score = 0
                
                valid_scores[key] = score
                valid_weights[key] = weights.get(key, 0)
        
        # If we have valid scores, calculate weighted average
        if valid_scores:
            total_weight = sum(valid_weights.values())
            
            if total_weight > 0:
                weighted_sum = sum(score * valid_weights.get(key, 0) for key, score in valid_scores.items())
                overall_score = weighted_sum / total_weight
                
                # Require fewer comparison points for HSC
                min_required_keys = 2 if is_hsc_template else 3
                
                # Require at least minimum valid comparison points
                if len(valid_scores) < min_required_keys:
                    overall_score = 0
            else:
                overall_score = 0
        else:
            overall_score = 0
        
        similarity_scores['overall'] = overall_score
        
        return similarity_scores
        
    except Exception as e:
        app.logger.error(f"Error comparing features: {str(e)}")
        traceback.print_exc()
        return {'overall': 0}

def get_confidence_level(score):
    """Convert numerical score to confidence level string"""
    if score >= 0.9:
        return "Very High"
    elif score >= 0.8:
        return "High"
    elif score >= 0.7:
        return "Medium"
    elif score >= 0.5:
        return "Low"
    else:
        return "Very Low"

def find_best_match(doc_features):
    """Find the best matching template for the document features"""
    try:
        # Get list of template files
        template_dir = TEMPLATE_DIR
        template_files = []
        
        # Search in template_dir for .npy files containing features
        for filename in os.listdir(template_dir):
            if filename.endswith('.npy'):
                template_files.append(os.path.join(template_dir, filename))
        
        if not template_files:
            return {
                'error': 'No templates found',
                'details': 'No templates are available for verification'
            }
        
        # Compare with each template
        best_match = None
        best_score = 0
        best_template_name = None
        best_similarity_scores = None
        document_type = None
        
        for template_file in template_files:
            # Load template features
            try:
                template_features = np.load(template_file, allow_pickle=True).item()
                template_name = os.path.basename(template_file).replace('.npy', '')
                
                # Special handling for HSC templates
                is_hsc_template = 'hsc' in template_name.lower()
                
                # Compare features
                similarity_scores = compare_features(doc_features, template_features)
                overall_score = similarity_scores.get('overall', 0)
                
                # Debug log
                app.logger.info(f"Template {template_name}: Score {overall_score}")
                
                # Update best match if this is better
                if overall_score > best_score:
                    best_score = overall_score
                    best_match = template_features
                    best_template_name = template_name
                    best_similarity_scores = similarity_scores
                    document_type = "HSC" if is_hsc_template else "SSC"
                    
            except Exception as e:
                app.logger.error(f"Error comparing with template {template_file}: {str(e)}")
                continue
        
        # Adjust verification threshold based on template type
        # HSC templates may need a lower threshold due to greater variability
        verification_threshold = 0.70 if 'hsc' in best_template_name.lower() else 0.85
        
        # Prepare results
        if best_match and best_score >= verification_threshold:
            # Format scores for readability - Convert numpy types to Python native types
            formatted_scores = {}
            for k, v in best_similarity_scores.items():
                # Convert any numpy values to Python native types
                if hasattr(v, 'item'):
                    formatted_scores[k] = round(float(v.item()) * 100, 1)
                else:
                    formatted_scores[k] = round(float(v) * 100, 1)
            
            # Make sure all values are Python native types
            result = {
                'success': True,
                'isVerified': True,
                'matchScore': round(float(best_score) * 100, 1),
                'matchConfidence': get_confidence_level(best_score),
                'template': str(best_template_name),
                'documentType': document_type,
                'board': 'Maharashtra State Board',
                'scores': formatted_scores,
                'message': f"Document verified as {document_type} {best_template_name} with {formatted_scores['overall']}% match"
            }
            
            # Log successful verification for admin dashboard
            app.logger.info(f"VERIFICATION_SUCCESS: Template: {best_template_name}, Type: {document_type}, Score: {formatted_scores['overall']}%, Document Features: {list(doc_features.keys())}")
            
            return result
        elif best_match:
            # Low score match - Convert numpy types to Python native types
            formatted_scores = {}
            for k, v in best_similarity_scores.items():
                # Convert any numpy values to Python native types
                if hasattr(v, 'item'):
                    formatted_scores[k] = round(float(v.item()) * 100, 1)
                else:
                    formatted_scores[k] = round(float(v) * 100, 1)
            
            # Make sure all values are Python native types
            result = {
                'success': True,
                'isVerified': False,
                'matchScore': round(float(best_score) * 100, 1),
                'matchConfidence': get_confidence_level(best_score),
                'template': str(best_template_name),
                'documentType': document_type,
                'board': 'Maharashtra State Board',
                'scores': formatted_scores,
                'message': f"Document appears similar to {document_type} {best_template_name} but with low confidence ({formatted_scores['overall']}% match)"
            }
            
            # Log failed verification for admin dashboard
            threshold_text = "70%" if 'hsc' in best_template_name.lower() else "85%"
            app.logger.warning(f"VERIFICATION_FAILED: Template: {best_template_name}, Type: {document_type}, Score: {formatted_scores['overall']}% (below {threshold_text} threshold), Document Features: {list(doc_features.keys())}")
            
            return result
        else:
            # No match
            app.logger.warning(f"VERIFICATION_NO_MATCH: No matching template found for document with features: {list(doc_features.keys())}")
            
            return {
                'success': True,
                'isVerified': False,
                'matchScore': 0,
                'matchConfidence': "None",
                'message': "No matching template found for this document"
            }
            
    except Exception as e:
        app.logger.error(f"Error finding best match: {str(e)}")
        traceback.print_exc()
        return {
            'error': 'Matching error',
            'details': str(e)
        }

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
    
# Enhanced visualization with more detailed analysis
def create_comparison_visualization(doc_path, template_path, scores):
    """
    Create a visual comparison of verification results
    Args:
        doc_path: Path to document image
        template_path: Path to template image
        scores: Similarity scores
    Returns:
        str: Path to output visualization
    """
    try:
        # Load images
        doc_img = cv2.imread(doc_path)
        if doc_img is None:
            app.logger.error(f"Could not read document image: {doc_path}")
            return None
            
        # Get verification status
        overall_score = scores.get('overall', 0)
        is_verified = overall_score >= 50.0  # Use 75% threshold
        status_text = "VERIFIED" if is_verified else "NOT VERIFIED"
        
        # Create a copy of the document image for drawing
        result_img = doc_img.copy()
        
        # Get dimensions for adjustments
        height, width = result_img.shape[:2]
        
        # Process the document for feature detection
        processed_img = preprocess_image(doc_img)
        
        # Find text blocks using contours
        contours, _ = cv2.findContours(processed_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Draw rectangles around detected regions (blue overlay)
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            # Filter out very small contours
            if area > 100 and area < (width * height * 0.4):  # Don't highlight entire document
                cv2.rectangle(result_img, (x, y), (x + w, y + h), (255, 0, 0), 1)
                
        # Add a colored border based on verification status
        border_size = 10
        border_color = (0, 255, 0) if is_verified else (0, 0, 255)  # Green if verified, red if not
        result_img = cv2.copyMakeBorder(
            result_img, 
            border_size, border_size, border_size, border_size, 
            cv2.BORDER_CONSTANT, 
            value=border_color
        )
        
        # Calculate new dimensions after border
        height, width = result_img.shape[:2]
        
        # Create dark overlay for text at the top
        overlay = result_img.copy()
        bar_height = 40
        cv2.rectangle(overlay, (0, 0), (width, bar_height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, result_img, 0.3, 0, result_img)
        
        # Add verification status text
        font = cv2.FONT_HERSHEY_SIMPLEX
        text_color = (0, 255, 0) if is_verified else (0, 0, 255)  # Green if verified, red if not
        
        cv2.putText(
            result_img, 
            status_text, 
            (10, 30), 
            font, 
            1, 
            text_color, 
            2
        )
        
        # Add overall score
        score_text = f"Match: {overall_score:.1f}%"
        cv2.putText(
            result_img,
            score_text,
            (width - 200, 30),
            font,
            0.7,
            (255, 255, 255),
            1
        )
        
        # Create overlay for detailed scores at the bottom
        score_bar_height = 180  # Space for 6 scores + overall
        overlay = result_img.copy()
        cv2.rectangle(overlay, (0, height - score_bar_height), (width, height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.8, result_img, 0.2, 0, result_img)
        
        # Add detailed score components
        score_components = [
            ("Edge", scores.get("edge_similarity", 0)),
            ("Layout", scores.get("layout_similarity", 0)),
            ("Text", scores.get("text_similarity", 0)),
            ("Structure", scores.get("structure_similarity", 0)),
            ("Seal", scores.get("seal_similarity", 0)),
            ("Logo", scores.get("logo_similarity", 0)),
        ]
        
        # Add component scores
        y_position = height - score_bar_height + 30
        title_position = 20
        value_position = 180
        bar_start = 250
        bar_width = 300
        bar_height = 15
        
        # Add title
        cv2.putText(
            result_img,
            "Similarity Scores",
            (title_position, y_position - 10),
            font,
            0.7,
            (255, 255, 255),
            1
        )
        
        for label, value in score_components:
            # Format score
            score_value = value
            if isinstance(score_value, float):
                score_value = score_value * 100
            
            # Set color based on score
            if score_value >= 70:
                color = (0, 255, 0)  # Green
            elif score_value >= 40:
                color = (0, 165, 255)  # Orange
            else:
                color = (0, 0, 255)  # Red
            
            # Draw label
            cv2.putText(
                result_img,
                f"{label}:",
                (title_position, y_position),
                font,
                0.6,
                (255, 255, 255),
                1
            )
            
            # Draw value
            cv2.putText(
                result_img,
                f"{score_value:.1f}%",
                (value_position, y_position),
                font,
                0.6,
                color,
                1
            )
            
            # Draw progress bar background
            cv2.rectangle(
                result_img,
                (bar_start, y_position - bar_height + 3),
                (bar_start + bar_width, y_position - 3),
                (100, 100, 100),
                -1
            )
            
            # Draw progress bar filled portion
            filled_width = int(bar_width * (score_value / 100))
            cv2.rectangle(
                result_img,
                (bar_start, y_position - bar_height + 3),
                (bar_start + filled_width, y_position - 3),
                color,
                -1
            )
            
            y_position += 25
        
        # Add overall score at bottom
        cv2.putText(
            result_img,
            "Overall:",
            (title_position, y_position + 10),
            font,
            0.7,
            (255, 255, 255),
            1
        )
        
        cv2.putText(
            result_img,
            f"{overall_score:.1f}%",
            (value_position, y_position + 10),
            font,
            0.7,
            text_color,
            1
        )
        
        # Draw overall progress bar background
        cv2.rectangle(
            result_img,
            (bar_start, y_position - bar_height + 13),
            (bar_start + bar_width, y_position + 7),
            (100, 100, 100),
            -1
        )
        
        # Draw overall progress bar filled portion
        filled_width = int(bar_width * (overall_score / 100))
        cv2.rectangle(
            result_img,
            (bar_start, y_position - bar_height + 13),
            (bar_start + filled_width, y_position + 7),
            text_color,
            -1
        )
        
        # Save the visualization image
        os.makedirs(os.path.join(TEMP_DIR, "visualizations"), exist_ok=True)
        timestamp = int(time.time())
        output_filename = f"analysis_{timestamp}.jpg"
        output_path = os.path.join(TEMP_DIR, "visualizations", output_filename)
        
        cv2.imwrite(output_path, result_img)
        return output_path
        
    except Exception as e:
        app.logger.error(f"Error creating visualization: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Service is running"}), 200

@app.route('/templates', methods=['GET'])
@app.route('/api/templates', methods=['GET'])
def list_templates():
    """List all available templates"""
    try:
        templates = []
        # Get list of template files from the templates directory
        for filename in os.listdir(TEMPLATE_DIR):
            if filename.endswith(('.jpg', '.jpeg', '.png')):
                template_name = os.path.splitext(filename)[0]
                template_path = os.path.join(TEMPLATE_DIR, filename)
                
                # Only include if template exists
                if os.path.exists(template_path):
                    templates.append({
                        'id': template_name,
                        'name': template_name,
                        'type': 'template'
                    })
        
        # Log the found templates
        app.logger.info(f"Found {len(templates)} templates: {[t['name'] for t in templates]}")
        
        return jsonify({
            'success': True,
            'templates': templates,
            'count': len(templates)
        })
    except Exception as e:
        app.logger.error(f"Error listing templates: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to list templates: {str(e)}'
        }), 500

@app.route('/train', methods=['POST'])
def train_template():
    """Train a new template from an image"""
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({"error": "No image selected"}), 400
    
    # Get template name from form or use filename
    template_name = request.form.get('template_name', os.path.splitext(image_file.filename)[0])
    
    # Ensure template name has proper extension
    if not template_name.lower().endswith(('.jpg', '.jpeg', '.png')):
        template_name += '.jpg'
    
    template_path = os.path.join(TEMPLATE_DIR, template_name)
    
    try:
        # Save uploaded image as template
        image_file.save(template_path)
        app.logger.info(f"Template saved: {template_path}")
        
        # Extract and store features
        template_img = cv2.imread(template_path)
        if template_img is None:
            return jsonify({"error": "Failed to read template image"}), 500
        
        template_features = extract_features(template_img)
        
        # Save features to JSON file with same name as template
        features_path = os.path.join(TEMPLATE_DIR, f"{os.path.splitext(template_name)[0]}_features.json")
        with open(features_path, 'w') as f:
            json.dump(template_features, f)
        
        app.logger.info(f"Template features extracted and saved: {features_path}")
        
        return jsonify({
            "success": True,
            "message": f"Template {template_name} trained successfully",
            "template_name": template_name
        }), 201
    except Exception as e:
        app.logger.error(f"Error training template: {str(e)}")
        return jsonify({"error": "Failed to train template", "details": str(e)}), 500

@app.route('/verify', methods=['POST'])
@app.route('/api/verify', methods=['POST'])
@app.route('/template-verifier/verify', methods=['POST'])
@app.route('/api/template-verifier/verify', methods=['POST'])
def verify_document():
    """Verify uploaded document against template database"""
    try:
    # Check for uploaded file
    if 'image' not in request.files and 'document' not in request.files:
        return jsonify({
                'success': False,
                'message': 'No file provided'
            })

        # Get the file from either field
        file = request.files.get('image') or request.files.get('document')
        if not file or file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No selected file'
            })

        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(TEMP_DIR, filename)
        file.save(filepath)

        try:
            # Read the image
            image = cv2.imread(filepath)
            if image is None:
                return jsonify({
                    'success': False,
                    'message': 'Could not read image file'
                })

            # Extract features from the document
            doc_features = extract_features(image)
            
            # Find best matching template and get verification results
            verification_results = find_best_match(doc_features)
            
            # If verification succeeded, determine document type (HSC/SSC)
            if verification_results.get('isVerified', False):
                # Get template name
                template_name = verification_results.get('template', '').lower()
                
                # Create visualization
                visualization_path = create_comparison_visualization(filepath, template_name, verification_results.get('scores', {}))
                
                    if visualization_path:
                    # Add visualization URL to response
                    visualization_filename = os.path.basename(visualization_path)
                    verification_results['visualizationUrl'] = f"/visualizations/{visualization_filename}"
            
            app.logger.info(f"Verification response: {verification_results}")
            return jsonify(verification_results)
            
        except Exception as e:
            app.logger.error(f"Verification processing error: {str(e)}")
            return jsonify({
                'success': False,
                'isVerified': False,
                'message': f'Verification processing failed: {str(e)}'
            })

        finally:
            # Clean up uploaded file
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
    except Exception as e:
                app.logger.warning(f"Failed to clean up uploaded file: {str(e)}")

    except Exception as e:
        app.logger.error(f"Verification request error: {str(e)}")
        return jsonify({
            'success': False,
            'isVerified': False,
            'message': f'Verification request failed: {str(e)}'
        })

@app.route('/visualizations/<filename>')
def serve_visualization(filename):
    """Serve visualization images"""
    visualizations_dir = os.path.join(TEMP_DIR, "visualizations")
    return send_from_directory(visualizations_dir, filename)

def generate_comparison_visualization(document_image, template_name, similarity_scores):
    """
    Generate a visual comparison between the document and the template
    Returns the path to the saved visualization image
    """
    try:
        # Load template image
        template_path = os.path.join(TEMPLATE_DIR, f"{template_name}.jpg")
        if not os.path.exists(template_path):
            template_path = os.path.join(TEMPLATE_DIR, f"{template_name}.png")
        
        if not os.path.exists(template_path):
            app.logger.warning(f"Template image not found for {template_name}")
            return None
            
        template_image = cv2.imread(template_path)
        if template_image is None:
            app.logger.warning(f"Failed to read template image for {template_name}")
            return None
        
        # Load template features
        feature_path = os.path.join(TEMPLATE_DIR, f"{template_name}.npy")
        if os.path.exists(feature_path):
            template_features = np.load(feature_path, allow_pickle=True).item()
        else:
            app.logger.warning(f"Template features not found for {template_name}")
            template_features = {}
        
        # Extract features from document for visualization
        processed_doc = preprocess_image(document_image)
        doc_features = extract_features(document_image)
        
        # Resize both to the same height while maintaining aspect ratio
        target_height = 800
        doc_aspect = document_image.shape[1] / document_image.shape[0]
        template_aspect = template_image.shape[1] / template_image.shape[0]
        
        doc_resized = cv2.resize(document_image, (int(target_height * doc_aspect), target_height))
        template_resized = cv2.resize(template_image, (int(target_height * template_aspect), target_height))
        
        # Create canvas for side-by-side comparison
        canvas_width = doc_resized.shape[1] + template_resized.shape[1] + 40  # Add padding
        canvas_height = target_height + 200  # Add space for text
        canvas = np.ones((canvas_height, canvas_width, 3), dtype=np.uint8) * 255
        
        # Place images side by side
        doc_x_offset = 20
        template_x_offset = doc_x_offset + doc_resized.shape[1] + 20
        
        canvas[50:50+target_height, doc_x_offset:doc_x_offset+doc_resized.shape[1]] = doc_resized
        canvas[50:50+target_height, template_x_offset:template_x_offset+template_resized.shape[1]] = template_resized
        
        # Add labels
        cv2.putText(canvas, "Uploaded Document", (doc_x_offset, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        cv2.putText(canvas, f"Template: {template_name}", (template_x_offset, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        
        # Draw detected features on document
        doc_features_list = doc_features.get('detected_features', [])
        
        # Colors for different feature types
        feature_colors = {
            'seal': (0, 0, 255),      # Red for seals
            'logo': (0, 255, 0),      # Green for logos
            'text_block': (255, 0, 0)  # Blue for text blocks
        }
        
        # Draw detected features on document
        for feature in doc_features_list:
            feature_type = feature.get('type', 'unknown')
            x, y = feature.get('x', 0), feature.get('y', 0)
            w, h = feature.get('width', 0), feature.get('height', 0)
            
            # Scale coordinates to resized image
            x_scaled = int(x * doc_resized.shape[1] / doc_features['dimensions']['width'])
            y_scaled = int(y * doc_resized.shape[0] / doc_features['dimensions']['height'])
            w_scaled = int(w * doc_resized.shape[1] / doc_features['dimensions']['width'])
            h_scaled = int(h * doc_resized.shape[0] / doc_features['dimensions']['height'])
            
            # Draw rectangle on document
            color = feature_colors.get(feature_type, (125, 125, 125))
            cv2.rectangle(canvas, 
                         (doc_x_offset + x_scaled, 50 + y_scaled), 
                         (doc_x_offset + x_scaled + w_scaled, 50 + y_scaled + h_scaled), 
                         color, 2)
            
            # Add feature type label
            cv2.putText(canvas, 
                       feature_type, 
                       (doc_x_offset + x_scaled, 50 + y_scaled - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 
                       0.5, color, 1)
        
        # Draw template features
        template_features_list = template_features.get('detected_features', [])
        
        for feature in template_features_list:
            feature_type = feature.get('type', 'unknown')
            x, y = feature.get('x', 0), feature.get('y', 0)
            w, h = feature.get('width', 0), feature.get('height', 0)
            
            # Scale coordinates to resized image
            template_width = template_features.get('dimensions', {}).get('width', template_image.shape[1])
            template_height = template_features.get('dimensions', {}).get('height', template_image.shape[0])
            
            x_scaled = int(x * template_resized.shape[1] / template_width)
            y_scaled = int(y * template_resized.shape[0] / template_height)
            w_scaled = int(w * template_resized.shape[1] / template_width)
            h_scaled = int(h * template_resized.shape[0] / template_height)
            
            # Draw rectangle on template
            color = feature_colors.get(feature_type, (125, 125, 125))
            cv2.rectangle(canvas, 
                         (template_x_offset + x_scaled, 50 + y_scaled), 
                         (template_x_offset + x_scaled + w_scaled, 50 + y_scaled + h_scaled), 
                         color, 2)
            
            # Add feature type label
            cv2.putText(canvas, 
                       feature_type, 
                       (template_x_offset + x_scaled, 50 + y_scaled - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 
                       0.5, color, 1)
        
        # Add match percentage
        verified = similarity_scores.get('verified', False)
        overall_score = similarity_scores.get('overall', 0) * 100
        verification_text = "VERIFIED" if verified else "NOT VERIFIED"
        color = (0, 200, 0) if verified else (0, 0, 255)  # Green if verified, red if not
        
        score_text = f"Match Score: {overall_score:.1f}%"
        verification_text = f"Status: {verification_text}"
        
        y_pos = target_height + 90
        cv2.putText(canvas, verification_text, (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 2)
        y_pos += 40
        cv2.putText(canvas, score_text, (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 1)
        
        # Add confidence level
        confidence = get_confidence_level(similarity_scores.get('overall', 0))
        confidence_text = f"Confidence: {confidence}"
        
        # Color code by confidence
        if confidence in ["High", "Very High"]:
            color = (0, 200, 0)  # Green
        elif confidence == "Medium":
            color = (0, 165, 255)  # Orange
        else:
            color = (0, 0, 255)  # Red
            
        y_pos += 40
        cv2.putText(canvas, confidence_text, (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
        
        # Add individual scores in a compact format
        x_pos = canvas_width // 2
        y_pos = target_height + 90
        cv2.putText(canvas, "Component Scores:", (x_pos, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
        y_pos += 30
        
        # Score display order and labels
        score_display = [
            ('text_similarity', 'Text Match'),
            ('grid_similarity', 'Grid Match'),
            ('edge_similarity', 'Edge Match'),
            ('layout_similarity', 'Layout Match'),
            ('seal_similarity', 'Seal Match'),
            ('table_similarity', 'Table Match'),
            ('signature_similarity', 'Signature Match')
        ]
        
        for score_key, score_label in score_display:
            if score_key in similarity_scores:
                score_value = similarity_scores[score_key] * 100
                score_text = f"{score_label}: {score_value:.1f}%"
                
                # Determine color based on score
                if score_value >= 80:
                    bar_color = (0, 200, 0)  # Green
                elif score_value >= 60:
                    bar_color = (0, 165, 255)  # Orange
                else:
                    bar_color = (0, 0, 255)  # Red
                
                # Draw score text
                cv2.putText(canvas, score_text, (x_pos, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 1)
                
                # Draw score bar
                bar_length = 200
                bar_height = 15
                bar_fill = int(bar_length * similarity_scores[score_key])
                
                # Draw background bar
                cv2.rectangle(canvas, 
                             (x_pos + 200, y_pos - 15), 
                             (x_pos + 200 + bar_length, y_pos), 
                             (220, 220, 220), -1)
                
                # Draw filled portion
                cv2.rectangle(canvas, 
                             (x_pos + 200, y_pos - 15), 
                             (x_pos + 200 + bar_fill, y_pos), 
                             bar_color, -1)
                
                y_pos += 30
                
        # Save visualization
        output_dir = os.path.join(TEMP_DIR, "visualizations")
        os.makedirs(output_dir, exist_ok=True)
        
        # Create unique filename
        timestamp = int(time.time())
        result_filename = f"comparison_{template_name}_{timestamp}.jpg"
        result_path = os.path.join(output_dir, result_filename)
        
        # Save the visualization
        cv2.imwrite(result_path, canvas)
        return result_path
        
    except Exception as e:
        app.logger.error(f"Error generating visualization: {str(e)}")
        return None

@app.route('/upload_template', methods=['POST'])
def upload_template():
    """Upload a new template document"""
    # Check for uploaded file
    if 'template' not in request.files:
        return jsonify({
            'error': 'No file provided',
            'details': 'Please upload a template image file'
        }), 400
    
    try:
        # Get file and name
        template_file = request.files['template']
        template_name = request.form.get('name')
        
        if not template_file or not template_file.filename:
            return jsonify({
                'error': 'Invalid file',
                'details': 'The provided template file is invalid'
            }), 400
            
        if not template_name:
            # Use filename without extension as template name
            template_name = os.path.splitext(template_file.filename)[0]
        
        # Sanitize the template name
        template_name = secure_filename(template_name)
        
        # Save the template image
        file_ext = os.path.splitext(template_file.filename)[1].lower()
        if file_ext not in ['.jpg', '.jpeg', '.png']:
            file_ext = '.jpg'  # Default to jpg
            
        template_path = os.path.join(app.config['TEMPLATE_FOLDER'], f"{template_name}{file_ext}")
        template_file.save(template_path)
        
        # Load the template and extract features
        template_img = cv2.imread(template_path)
        if template_img is None:
            return jsonify({
                'error': 'Invalid template image',
                'details': 'Could not process the uploaded template'
            }), 400
        
        # Process the image
        processed_img = preprocess_image(template_img)
        
        # Extract features
        template_features = extract_features(processed_img)
        
        # Save features to a file
        feature_path = os.path.join(app.config['TEMPLATE_FOLDER'], f"{template_name}.npy")
        np.save(feature_path, template_features)
        
        return jsonify({
            'success': True,
            'template_name': template_name,
            'message': f"Template '{template_name}' uploaded and processed successfully"
        })
        
    except Exception as e:
        app.logger.error(f"Error uploading template: {str(e)}")
        return jsonify({
            'error': 'Template upload failed',
            'details': str(e)
        }), 500

@app.route('/api/extract/generate-pdf', methods=['POST'])
def generate_pdf():
    """Handle verification data submission"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        # Just return success with the data
        return jsonify({
            'success': True,
            'data': data,
            'message': 'Data processed successfully'
        })
        
    except Exception as e:
        app.logger.error(f"Data processing error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to process data: {str(e)}'
        }), 500

if __name__ == '__main__':
    # Start server
    print("Starting document verification service on port 5000...")
    
    # Extract features from template files
    try:
        print("Checking for existing templates...")
        template_dir = app.config['TEMPLATE_FOLDER']
        template_files = []
        
        for filename in os.listdir(template_dir):
            if filename.endswith('.jpg') or filename.endswith('.jpeg') or filename.endswith('.png'):
                template_name = os.path.splitext(filename)[0]
                template_path = os.path.join(template_dir, filename)
                feature_path = os.path.join(template_dir, f"{template_name}.npy")
                
                template_files.append(filename)
                
                # Extract features if .npy file doesn't exist
                if not os.path.exists(feature_path):
                    print(f"Extracting features for template: {filename}")
                    try:
                        # Load the template image
                        template_img = cv2.imread(template_path)
                        if template_img is None:
                            print(f"Error: Could not read template image: {filename}")
                            continue
                        
                        # Process the template image
                        processed_img = preprocess_image(template_img)
                        
                        # Extract features
                        template_features = extract_features(processed_img)
                        
                        # Save features to .npy file
                        np.save(feature_path, template_features)
                        print(f"Features extracted and saved for {filename}")
                    except Exception as e:
                        print(f"Error extracting features for {filename}: {str(e)}")
                else:
                    print(f"Using existing features for template: {filename}")
        
        if template_files:
            print(f"Found {len(template_files)} templates: {', '.join(template_files)}")
        else:
            print("No template files found in the templates directory.")
            print("Please add template images (.jpg, .jpeg, .png) to the templates directory.")
    except Exception as e:
        print(f"Error processing templates: {str(e)}")
    
    # Run the app
    app.run(host='0.0.0.0', port=5000, debug=True) 
