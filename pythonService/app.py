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

# Define directories
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(SCRIPT_DIR, 'templates')
UPLOADS_DIR = os.path.join(SCRIPT_DIR, 'uploads')
TEMP_DIR = os.path.join(SCRIPT_DIR, 'temp')

# Create necessary directories
os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Try to import pytesseract
try:
    import pytesseract
    # For Windows - update this to your installation path
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

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image):
    """
    Preprocess the image for better feature extraction.
    Args:
        image: PIL Image or path to image
    Returns:
        dict: Processed images in different formats
    """
    if isinstance(image, str):
        # Load image from path
        img = Image.open(image)
    else:
        img = image
    
    # Convert to RGB if needed
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Convert to grayscale
    gray = img.convert('L')
    
    # Create OpenCV versions for processing
    img_cv = np.array(img)
    if len(img_cv.shape) == 3:
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_RGB2BGR)
    gray_cv = np.array(gray)
    
    # Apply different preprocessing steps
    # 1. Blur to reduce noise
    blurred = cv2.GaussianBlur(gray_cv, (5, 5), 0)
    
    # 2. Edge detection
    edges = cv2.Canny(blurred, 50, 150)
    
    # 3. Thresholding for binary image
    _, threshold = cv2.threshold(gray_cv, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    return {
        'original': img,
        'gray': gray,
        'gray_cv': gray_cv,
        'blurred': blurred,
        'edges': edges,
        'threshold': threshold,
        'img_cv': img_cv
    }

def extract_features(image):
    """
    Extract features from an image
    Args:
        image: PIL Image or path to image
    Returns:
        dict: Extracted features
    """
    processed = preprocess_image(image)
    features = {}
    
    # Extract text using OCR if available
    if has_tesseract:
        try:
            # Extract text with different configs for better coverage
            text1 = pytesseract.image_to_string(processed['gray'])
            text2 = pytesseract.image_to_string(processed['gray'], config='--psm 6')
            text3 = pytesseract.image_to_string(processed['gray'], config='--psm 4')
            
            # Use the longest text as it likely has the most information
            text = max([text1, text2, text3], key=len)
            features['text'] = text
            
            # Check for Maharashtra SSC specific text patterns
            if 'MAHARASHTRA' in text.upper() and ('SECONDARY SCHOOL CERTIFICATE' in text.upper() or 'S.S.C' in text.upper()):
                features['is_maharashtra_ssc'] = True
                
                # Extract logo/seal positions more precisely for Maharashtra certificates
                try:
                    # The Maharashtra SSC certificate has a specific logo position in upper left
                    logo_region = processed['gray_cv'][:150, :150]  # Adjust these values based on templates
                    logo_edges = cv2.Canny(logo_region, 50, 150)
                    logo_edge_count = np.sum(logo_edges > 0)
                    features['logo_edge_density'] = float(logo_edge_count) / (150 * 150)
                    
                    # Find seal position - typically in bottom section
                    seal_region = processed['gray_cv'][-250:, :]
                    circles = cv2.HoughCircles(
                        seal_region,
                        cv2.HOUGH_GRADIENT,
                        1,
                        20,
                        param1=50,
                        param2=30,
                        minRadius=20,
                        maxRadius=100
                    )
                    
                    if circles is not None:
                        circles = np.round(circles[0, :]).astype("int")
                        features['seal_positions_bottom'] = circles.tolist()
                    else:
                        features['seal_positions_bottom'] = []
                except Exception as e:
                    print(f"Error analyzing Maharashtra regions: {str(e)}")
            else:
                features['is_maharashtra_ssc'] = False
        except Exception as e:
            print(f"OCR error: {str(e)}")
            features['text'] = ""
    else:
        features['text'] = "OCR not available"
    
    # Extract structural features
    # 1. Edge density
    edge_pixels = np.sum(processed['edges'] > 0)
    total_pixels = processed['edges'].shape[0] * processed['edges'].shape[1]
    features['edge_density'] = float(edge_pixels) / total_pixels if total_pixels > 0 else 0
    
    # 2. Find contours for layout analysis
    contours, _ = cv2.findContours(processed['edges'], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    features['contours'] = len(contours)
    
    # 3. Extract regions of interest (ROIs)
    rois = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w > 50 and h > 20:  # Filter out small noise
            rois.append([x, y, w, h])
    features['rois'] = rois
    
    # 4. Detect circular patterns (potential seals/logos)
    try:
        circles = cv2.HoughCircles(
            processed['blurred'],
            cv2.HOUGH_GRADIENT,
            1,
            20,
            param1=50,
            param2=30,
            minRadius=10,
            maxRadius=100
        )
        
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            features['seal_positions'] = circles.tolist()
        else:
            features['seal_positions'] = []
    except Exception as e:
        print(f"Error detecting circles: {str(e)}")
        features['seal_positions'] = []
    
    # 5. Analyze table structure for Maharashtra SSC certificates
    try:
        # Use horizontal and vertical lines to detect table structure
        horizontal = np.copy(processed['threshold'])
        vertical = np.copy(processed['threshold'])
        
        # Define kernel size based on image dimensions
        img_height, img_width = horizontal.shape
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
        
        # Count horizontal and vertical lines
        horizontal_lines = cv2.HoughLinesP(horizontal, 1, np.pi/180, 100, minLineLength=img_width//3, maxLineGap=20)
        vertical_lines = cv2.HoughLinesP(vertical, 1, np.pi/180, 100, minLineLength=img_height//3, maxLineGap=20)
        
        features['horizontal_lines'] = len(horizontal_lines) if horizontal_lines is not None else 0
        features['vertical_lines'] = len(vertical_lines) if vertical_lines is not None else 0
        
        # Detect if the document has a grid/table pattern typical of SSC marksheets
        if horizontal_lines is not None and vertical_lines is not None:
            if len(horizontal_lines) >= 5 and len(vertical_lines) >= 3:
                features['has_marksheet_table'] = True
            else:
                features['has_marksheet_table'] = False
        else:
            features['has_marksheet_table'] = False
    except Exception as e:
        print(f"Error analyzing table structure: {str(e)}")
        features['has_marksheet_table'] = False
    
    # 6. Check for signature area in Maharashtra SSC certificates
    try:
        # The signature is typically in the bottom right area
        img_height, img_width = processed['gray_cv'].shape
        signature_region = processed['gray_cv'][img_height-150:, img_width-250:]
        
        # Apply edge detection to signature region
        signature_edges = cv2.Canny(signature_region, 50, 150)
        signature_edge_count = np.sum(signature_edges > 0)
        
        # If edge density in signature region is within typical range
        signature_area = signature_region.shape[0] * signature_region.shape[1]
        signature_edge_density = float(signature_edge_count) / signature_area if signature_area > 0 else 0
        
        features['signature_edge_density'] = signature_edge_density
        
        # Typically signatures have moderate edge density in a specific range
        if 0.05 <= signature_edge_density <= 0.25:
            features['has_signature_pattern'] = True
        else:
            features['has_signature_pattern'] = False
    except Exception as e:
        print(f"Error detecting signature: {str(e)}")
        features['has_signature_pattern'] = False
    
    return features

def compare_features(doc_features, template_features):
    """
    Compare features between document and template
    Args:
        doc_features: Features from the document
        template_features: Features from the template
    Returns:
        dict: Similarity scores
    """
    scores = {}
    
    # 1. Text similarity
    doc_text = doc_features.get('text', '').lower()
    template_text = template_features.get('text', '').lower()
    
    # Simple text matching using word overlap (Jaccard similarity)
    if doc_text and template_text:
        import re
        # Extract words from both texts
        doc_words = set(re.findall(r'\b\w+\b', doc_text))
        template_words = set(re.findall(r'\b\w+\b', template_text))
        
        if doc_words and template_words:
            # Calculate Jaccard similarity
            intersection = len(doc_words.intersection(template_words))
            union = len(doc_words.union(template_words))
            scores['text_similarity'] = intersection / union if union > 0 else 0
            
            # Check for key Maharashtra SSC terms
            key_terms = ['maharashtra', 'secondary', 'school', 'certificate', 'examination']
            key_term_matches = sum(1 for term in key_terms if term in doc_text) / len(key_terms)
            scores['key_terms_match'] = key_term_matches
        else:
            scores['text_similarity'] = 0
            scores['key_terms_match'] = 0
    else:
        scores['text_similarity'] = 0
        scores['key_terms_match'] = 0
    
    # 2. Layout similarity
    # Compare ROIs
    doc_rois = doc_features.get('rois', [])
    template_rois = template_features.get('rois', [])
    
    if doc_rois and template_rois:
        # Compare counts - simple approach
        max_rois = max(len(doc_rois), len(template_rois))
        min_rois = min(len(doc_rois), len(template_rois))
        count_similarity = min_rois / max_rois if max_rois > 0 else 0
        
        # Compare edge density
        doc_edge = doc_features.get('edge_density', 0)
        template_edge = template_features.get('edge_density', 0)
        edge_diff = abs(doc_edge - template_edge)
        edge_similarity = max(0, 1 - edge_diff * 5)  # Scale difference
        
        # Combined layout similarity
        scores['layout_similarity'] = 0.5 * count_similarity + 0.5 * edge_similarity
    else:
        scores['layout_similarity'] = 0
    
    # 3. Seal/Logo similarity
    doc_seals = doc_features.get('seal_positions', [])
    template_seals = template_features.get('seal_positions', [])
    
    if doc_seals and template_seals:
        # Compare counts
        max_seals = max(len(doc_seals), len(template_seals))
        min_seals = min(len(doc_seals), len(template_seals))
        seal_count_similarity = min_seals / max_seals if max_seals > 0 else 0
        
        # Check Maharashtra SSC-specific seal positions
        doc_bottom_seals = doc_features.get('seal_positions_bottom', [])
        template_bottom_seals = template_features.get('seal_positions_bottom', [])
        
        if doc_bottom_seals and template_bottom_seals:
            seal_position_match = 1.0  # Perfect match by default
        elif (not doc_bottom_seals) and (not template_bottom_seals):
            seal_position_match = 1.0  # Both have no seals - also a match
        else:
            seal_position_match = 0.0  # Mismatch
        
        scores['seal_similarity'] = 0.5 * seal_count_similarity + 0.5 * seal_position_match
    else:
        # If both empty, give a score of 1
        if not doc_seals and not template_seals:
            scores['seal_similarity'] = 1
        else:
            scores['seal_similarity'] = 0
    
    # 4. Table/Grid structure similarity for marksheets
    doc_has_table = doc_features.get('has_marksheet_table', False)
    template_has_table = template_features.get('has_marksheet_table', False)
    
    if doc_has_table == template_has_table:
        scores['table_similarity'] = 1.0
    else:
        scores['table_similarity'] = 0.0
    
    # 5. Signature pattern similarity
    doc_sig_density = doc_features.get('signature_edge_density', 0)
    template_sig_density = template_features.get('signature_edge_density', 0)
    
    if doc_sig_density > 0 and template_sig_density > 0:
        sig_diff = abs(doc_sig_density - template_sig_density) / max(doc_sig_density, template_sig_density)
        scores['signature_similarity'] = max(0, 1 - sig_diff)
    else:
        if doc_sig_density == 0 and template_sig_density == 0:
            scores['signature_similarity'] = 1.0  # Both have no signature - also a match
        else:
            scores['signature_similarity'] = 0.0  # One has signature, other doesn't
    
    # Calculate overall score with weighted components for Maharashtra SSC certificates
    if doc_features.get('is_maharashtra_ssc', False) and template_features.get('is_maharashtra_ssc', False):
        # For SSC certificates, prioritize layout and table structure
        weights = {
            'text_similarity': 0.25,
            'key_terms_match': 0.10,
            'layout_similarity': 0.25,
            'seal_similarity': 0.15,
            'table_similarity': 0.15,
            'signature_similarity': 0.10
        }
    else:
        # Generic weights for other document types
        weights = {
            'text_similarity': 0.5,
            'layout_similarity': 0.3,
            'seal_similarity': 0.2
        }
    
    # Calculate overall score using available components
    total_weight = 0
    weighted_sum = 0
    
    for key, weight in weights.items():
        if key in scores:
            weighted_sum += scores[key] * weight
            total_weight += weight
    
    scores['overall'] = weighted_sum / total_weight if total_weight > 0 else 0
    
    return scores

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
    # Load images
    doc_img = cv2.imread(doc_path)
    template_img = cv2.imread(template_path)
    
    if doc_img is None or template_img is None:
        return None
    
    # Create analysis image with verification results
    # Resize both images to have the same height for comparison
    height = 500
    doc_aspect = doc_img.shape[1] / doc_img.shape[0]
    templ_aspect = template_img.shape[1] / template_img.shape[0]
    
    doc_resized = cv2.resize(doc_img, (int(height * doc_aspect), height))
    templ_resized = cv2.resize(template_img, (int(height * templ_aspect), height))
    
    # Create canvas for results visualization
    # Include header space for verification status and scores
    header_height = 130
    footer_height = 40
    total_width = max(doc_resized.shape[1] + templ_resized.shape[1], 1200)
    result_img = np.ones((height + header_height + footer_height, total_width, 3), dtype=np.uint8) * 255
    
    # Add verification status in header
    verified = scores.get('overall', 0) >= 0.65
    status_text = "VERIFIED" if verified else "NOT VERIFIED"
    status_color = (0, 200, 0) if verified else (0, 0, 200)  # Green or Red (BGR format)
    
    cv2.putText(
        result_img,
        f"Document Verification: {status_text}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.2,
        status_color,
        2
    )
    
    # Add scores in header
    cv2.putText(
        result_img,
        f"Overall Score: {scores.get('overall', 0) * 100:.2f}%",
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 0, 0),
        2
    )
    
    # Add key score components in a row
    score_y = 110
    score_items = [
        ("Text", scores.get('text_similarity', 0)),
        ("Layout", scores.get('layout_similarity', 0)), 
        ("Seal", scores.get('seal_similarity', 0)),
        ("Table", scores.get('table_similarity', 0)),
        ("Signature", scores.get('signature_similarity', 0))
    ]
    
    x_pos = 20
    for name, score in score_items:
        if name in ["Table", "Signature"] and name.lower() + "_similarity" not in scores:
            continue  # Skip scores that don't exist
            
        # Background rectangle for score
        score_width = 150
        score_height = 20
        score_color = (0, 0, 0)  # Default black
        
        # Determine color based on score
        if score >= 0.7:
            score_color = (0, 200, 0)  # Green (BGR)
        elif score >= 0.4:
            score_color = (0, 165, 255)  # Orange (BGR)
        else:
            score_color = (0, 0, 200)  # Red (BGR)
        
        score_percentage = int(score * 100)
        score_fill_width = int(score_width * score)
        
        # Draw background bar
        cv2.rectangle(result_img, (x_pos, score_y), (x_pos + score_width, score_y + score_height), (220, 220, 220), -1)
        
        # Draw filled score bar
        cv2.rectangle(result_img, (x_pos, score_y), (x_pos + score_fill_width, score_y + score_height), score_color, -1)
        
        # Add label
        cv2.putText(
            result_img,
            f"{name}: {score_percentage}%",
            (x_pos, score_y - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 0, 0),
            1
        )
        
        x_pos += score_width + 30
    
    # Place images side by side
    img_y = header_height
    
    # Center the images if total width is larger
    doc_x = (total_width - (doc_resized.shape[1] + templ_resized.shape[1])) // 2
    templ_x = doc_x + doc_resized.shape[1]
    
    # Place document image
    result_img[img_y:img_y+doc_resized.shape[0], doc_x:doc_x+doc_resized.shape[1]] = doc_resized
    
    # Place template image
    result_img[img_y:img_y+templ_resized.shape[0], templ_x:templ_x+templ_resized.shape[1]] = templ_resized
    
    # Add labels
    cv2.putText(
        result_img,
        "Uploaded Document",
        (doc_x + 10, img_y - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 0, 0),
        2
    )
    
    cv2.putText(
        result_img,
        "Template Reference",
        (templ_x + 10, img_y - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 0, 0),
        2
    )
    
    # Add feature analysis markers
    # 1. Highlight logo region (upper left)
    logo_rect_size = 150
    cv2.rectangle(result_img, 
                 (doc_x, img_y), 
                 (doc_x + logo_rect_size, img_y + logo_rect_size), 
                 (255, 0, 0), 2)  # Blue rectangle
    
    cv2.rectangle(result_img, 
                 (templ_x, img_y), 
                 (templ_x + logo_rect_size, img_y + logo_rect_size), 
                 (255, 0, 0), 2)  # Blue rectangle
    
    cv2.putText(
        result_img,
        "Logo",
        (doc_x + 5, img_y + 15),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (255, 0, 0),
        1
    )
    
    # 2. Highlight signature region (bottom right)
    sig_height = 100
    sig_width = 200
    
    cv2.rectangle(result_img, 
                 (doc_x + doc_resized.shape[1] - sig_width, img_y + doc_resized.shape[0] - sig_height), 
                 (doc_x + doc_resized.shape[1], img_y + doc_resized.shape[0]), 
                 (0, 165, 255), 2)  # Orange rectangle
    
    cv2.rectangle(result_img, 
                 (templ_x + templ_resized.shape[1] - sig_width, img_y + templ_resized.shape[0] - sig_height), 
                 (templ_x + templ_resized.shape[1], img_y + templ_resized.shape[0]), 
                 (0, 165, 255), 2)  # Orange rectangle
    
    cv2.putText(
        result_img,
        "Signature",
        (doc_x + doc_resized.shape[1] - sig_width + 5, img_y + doc_resized.shape[0] - sig_height + 15),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (0, 165, 255),
        1
    )
    
    # 3. Highlight table region (center area)
    # Find approximate position of the marks table in Maharashtra SSC certificates
    table_y_start = int(height * 0.4)
    table_height = int(height * 0.4)
    
    cv2.rectangle(result_img, 
                 (doc_x + int(doc_resized.shape[1] * 0.1), img_y + table_y_start), 
                 (doc_x + int(doc_resized.shape[1] * 0.9), img_y + table_y_start + table_height), 
                 (0, 200, 0), 2)  # Green rectangle
    
    cv2.rectangle(result_img, 
                 (templ_x + int(templ_resized.shape[1] * 0.1), img_y + table_y_start), 
                 (templ_x + int(templ_resized.shape[1] * 0.9), img_y + table_y_start + table_height), 
                 (0, 200, 0), 2)  # Green rectangle
    
    cv2.putText(
        result_img,
        "Table Structure",
        (doc_x + int(doc_resized.shape[1] * 0.1) + 5, img_y + table_y_start + 15),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (0, 200, 0),
        1
    )
    
    # Add footer explanation
    footer_y = img_y + height + 25
    cv2.putText(
        result_img,
        "Verification analysis highlights key layout components: Logo (Blue), Table Structure (Green), Signature (Orange)",
        (20, footer_y),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (0, 0, 0),
        1
    )
    
    # Save result
    output_path = os.path.join(TEMP_DIR, "comparison_analysis.jpg")
    cv2.imwrite(output_path, result_img)
    
    return output_path

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Service is running"}), 200

@app.route('/templates', methods=['GET'])
def list_templates():
    """List all available templates"""
    templates = []
    try:
        for file in os.listdir(TEMPLATE_DIR):
            if file.endswith('.jpg') or file.endswith('.jpeg') or file.endswith('.png'):
                templates.append({
                    "name": file,
                    "path": file
                })
        return jsonify({"templates": templates}), 200
    except Exception as e:
        app.logger.error(f"Error listing templates: {str(e)}")
        return jsonify({"error": "Failed to list templates", "details": str(e)}), 500

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
def verify_document():
    """
    Verify a document against a template
    If template_name is provided, verify against that template
    Otherwise, verify against all templates and return best match
    """
    # Check if image was uploaded (support both 'image' and 'document' field names)
    image_field = None
    if 'image' in request.files:
        image_field = 'image'
    elif 'document' in request.files:
        image_field = 'document'
    
    if not image_field:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files[image_field]
    if image_file.filename == '':
        return jsonify({"error": "No image selected"}), 400
    
    # Save uploaded image to temp directory
    doc_filename = f"upload_{int(time.time())}.jpg"
    doc_path = os.path.join(TEMP_DIR, doc_filename)
    
    try:
        # Ensure temp directory exists
        os.makedirs(TEMP_DIR, exist_ok=True)
        image_file.save(doc_path)
        
        # Get template name from form data (support both names)
        template_name = request.form.get('template_name') or request.form.get('template')
        auto_match = template_name is None or template_name == ''
        
        # Read uploaded document
        doc_img = cv2.imread(doc_path)
        if doc_img is None:
            return jsonify({"error": "Failed to read uploaded image"}), 500
            
        # Extract features from document
        doc_features = extract_features(doc_img)
        
        if auto_match:
            # Match against all templates
            app.logger.info("Auto-matching against all templates")
            return find_best_match(doc_path, doc_features)
        else:
            # Match against specific template
            app.logger.info(f"Verifying against template: {template_name}")
            return verify_against_template(doc_path, doc_features, template_name)
    
    except Exception as e:
        app.logger.error(f"Verification error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "verified": False,
            "error": "Verification failed",
            "details": str(e)
        }), 500

def find_best_match(doc_path, doc_features):
    """Find the best matching template for a document"""
    best_score = 0
    best_template = None
    best_scores = {}
    
    templates = []
    try:
        # Get list of template files
        for file in os.listdir(TEMPLATE_DIR):
            if file.endswith('.jpg') or file.endswith('.jpeg') or file.endswith('.png'):
                if not file.endswith('_features.json'):
                    templates.append(file)
        
        if not templates:
            return jsonify({
                "verified": False,
                "error": "No templates available for matching"
            }), 404
        
        # Compare with each template
        for template_name in templates:
            result = verify_against_template(doc_path, doc_features, template_name, return_response=False)
            
            if result and 'scores' in result and 'overall' in result['scores']:
                score = result['scores']['overall']
                if score > best_score:
                    best_score = score
                    best_template = template_name
                    best_scores = result['scores']
                    best_visualization = result.get('visualization', None)
        
        # Return verification result
        verified = best_score >= 0.65
        
        if best_template:
            app.logger.info(f"Best matching template: {best_template} with score {best_score}")
            
            result = {
                "verified": verified,
                "template_name": best_template,
                "scores": best_scores,
                "visualization_url": f"/visualizations/{os.path.basename(best_visualization)}" if best_visualization else None,
            }
            
            return jsonify(result), 200
        else:
            return jsonify({
                "verified": False,
                "error": "No matching template found"
            }), 404
    
    except Exception as e:
        app.logger.error(f"Error finding best match: {str(e)}")
        return jsonify({
            "verified": False,
            "error": "Failed to find matching template",
            "details": str(e)
        }), 500

def verify_against_template(doc_path, doc_features, template_name, return_response=True):
    """Verify document against a specific template"""
    template_path = os.path.join(TEMPLATE_DIR, template_name)
    features_path = os.path.join(TEMPLATE_DIR, f"{os.path.splitext(template_name)[0]}_features.json")
    
    # Check if template exists
    if not os.path.exists(template_path):
        if return_response:
            return jsonify({
                "verified": False,
                "error": f"Template {template_name} not found"
            }), 404
        return None
    
    # Read template features or extract them if not available
    if os.path.exists(features_path):
        with open(features_path, 'r') as f:
            template_features = json.load(f)
    else:
        # Extract template features on the fly
        template_img = cv2.imread(template_path)
        if template_img is None:
            if return_response:
                return jsonify({
                    "verified": False,
                    "error": f"Failed to read template image: {template_name}"
                }), 500
            return None
        
        template_features = extract_features(template_img)
        
        # Save features for future use
        with open(features_path, 'w') as f:
            json.dump(template_features, f)
    
    # Compare features
    scores = compare_features(doc_features, template_features)
    verified = scores['overall'] >= 0.65
    
    # Create visualization
    visualization_path = create_comparison_visualization(doc_path, template_path, scores)
    
    result = {
        "verified": verified,
        "template_name": template_name,
        "scores": scores,
        "visualization": visualization_path,
    }
    
    if return_response:
        return jsonify({
            **result,
            "visualization_url": f"/visualizations/{os.path.basename(visualization_path)}" if visualization_path else None,
        }), 200
    
    return result

@app.route('/visualizations/<filename>')
def serve_visualization(filename):
    """Serve visualization images"""
    return send_from_directory(TEMP_DIR, filename)

if __name__ == '__main__':
    # Start server
    app.run(host='0.0.0.0', port=5000, debug=True) 