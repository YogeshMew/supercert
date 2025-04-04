#!/usr/bin/env python3
"""
Script to train a new document template by extracting and saving its features
"""

import os
import sys
import json
import cv2
import numpy as np
from PIL import Image
import pytesseract
import re
import argparse
from pathlib import Path

# Constants
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'server')
TEMPLATE_DIR = os.path.join(SERVER_DIR, 'uploads', 'templates')
FEATURES_DIR = os.path.join(SERVER_DIR, 'data', 'features')
TEMP_DIR = os.path.join(SERVER_DIR, 'uploads', 'temp')

# Make sure directories exist
os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(FEATURES_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def preprocess_image(image_path):
    """Preprocess the image for better feature extraction."""
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image from {image_path}")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply thresholding to handle variations in brightness
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Additional preprocessing
    # Noise reduction
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    
    return {
        'original': img,
        'gray': gray,
        'thresh': thresh,
        'blur': blur
    }

def extract_features(image_path):
    """Extract features from the image."""
    processed = preprocess_image(image_path)
    features = {}
    
    # Extract text using OCR with multiple configurations
    try:
        # Configuration 1: Basic
        text1 = pytesseract.image_to_string(processed['gray'])
        
        # Configuration 2: With layout analysis
        custom_config = r'--oem 3 --psm 6'
        text2 = pytesseract.image_to_string(processed['gray'], config=custom_config)
        
        # Configuration 3: Optimized for structured documents
        custom_config = r'--oem 3 --psm 4'
        text3 = pytesseract.image_to_string(processed['gray'], config=custom_config)
        
        # Use the longest text result, as it likely has the most information
        text = max([text1, text2, text3], key=len)
        features['text'] = text
        
        # Extract named entities and potential fields
        # Look for patterns that could be field labels
        field_patterns = [
            (r'(?:STUDENT|NAME)[:\s]+([A-Za-z\s.]+)', 'student_name_pattern'),
            (r'(?:ROLL|SEAT)[:\s]*(?:NO|NUMBER|#)[:\s]*([A-Z0-9]+)', 'roll_number_pattern'),
            (r'(?:BOARD|UNIVERSITY)[:\s]+([A-Za-z\s.]+)', 'board_pattern'),
            (r'BATCH|YEAR[:\s]+(\d{4})', 'year_pattern'),
            (r'EXAM[:\s]+([A-Za-z\s.]+\d{4})', 'exam_pattern')
        ]
        
        patterns_found = {}
        for pattern, label in field_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                patterns_found[label] = matches[0].strip()
        
        features['field_patterns'] = patterns_found
        
    except Exception as e:
        print(f"OCR extraction error: {e}", file=sys.stderr)
        features['text'] = ""
    
    # Extract structural features
    try:
        # Edge detection
        edges = cv2.Canny(processed['blur'], 50, 150)
        
        # Store edge descriptor
        edge_count = np.sum(edges > 0)
        features['edge_density'] = float(edge_count) / (edges.shape[0] * edges.shape[1])
        
        # Extract contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        features['num_contours'] = len(contours)
        
        # Extract logo and seal positions - look for circular patterns
        circles = cv2.HoughCircles(
            processed['blur'],
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
        
        # Layout detection - detect horizontal and vertical lines
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 1))
        horizontal_lines = cv2.morphologyEx(processed['thresh'], cv2.MORPH_OPEN, horizontal_kernel)
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 50))
        vertical_lines = cv2.morphologyEx(processed['thresh'], cv2.MORPH_OPEN, vertical_kernel)
        
        # Get line positions
        h_lines, _ = cv2.findContours(horizontal_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        v_lines, _ = cv2.findContours(vertical_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        features['layout'] = {
            'h_lines': len(h_lines),
            'v_lines': len(v_lines),
        }
        
        # Extract regions of interest - look for rectangular sections
        combined_lines = cv2.addWeighted(horizontal_lines, 0.5, vertical_lines, 0.5, 0)
        rect_contours, _ = cv2.findContours(combined_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        rois = []
        for contour in rect_contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w > 50 and h > 20:  # Filter out small noise
                rois.append([x, y, w, h])
        
        features['rois'] = rois
        
    except Exception as e:
        print(f"Feature extraction error: {e}", file=sys.stderr)
    
    return features

def create_template_visualization(image_path, features, template_name):
    """Create a visualization of the template with detected features highlighted"""
    img = cv2.imread(image_path)
    if img is None:
        return None
    
    # Create a visualization image
    viz_img = img.copy()
    
    # Draw annotated regions
    if 'rois' in features:
        for roi in features['rois']:
            x, y, w, h = roi
            cv2.rectangle(viz_img, (x, y), (x + w, y + h), (0, 255, 0), 2)  # Green
    
    # Draw circles for detected seals/logos
    if 'seal_positions' in features:
        for circle in features['seal_positions']:
            x, y, r = circle
            cv2.circle(viz_img, (x, y), r, (255, 0, 0), 2)  # Blue
    
    # Highlight text regions using PyTesseract
    try:
        # Get word boxes with PyTesseract
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        boxes = pytesseract.image_to_data(gray_img, output_type=pytesseract.Output.DICT)
        
        for i in range(len(boxes['text'])):
            # Only process non-empty text entries
            if boxes['text'][i].strip() and int(boxes['conf'][i]) > 30:
                x = boxes['left'][i]
                y = boxes['top'][i]
                w = boxes['width'][i]
                h = boxes['height'][i]
                
                cv2.rectangle(viz_img, (x, y), (x + w, y + h), (0, 0, 255), 1)  # Red, thin line
    except Exception as e:
        print(f"Error highlighting text regions: {e}", file=sys.stderr)
    
    # Add template name as text
    cv2.putText(
        viz_img,
        f"Template: {template_name}",
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 0, 255),  # Red
        2
    )
    
    # Save the visualization image
    viz_path = os.path.join(TEMP_DIR, f"{template_name}_analysis.jpg")
    cv2.imwrite(viz_path, viz_img)
    
    return viz_path

def train_template(template_path, template_name):
    """Train a template by extracting and saving its features"""
    try:
        # Extract features
        features = extract_features(template_path)
        
        # Add metadata
        features['metadata'] = {
            'name': template_name,
            'created_at': Path(template_path).stat().st_mtime,
            'original_path': template_path
        }
        
        # Save features to JSON file
        features_path = os.path.join(FEATURES_DIR, f"{template_name}.json")
        os.makedirs(os.path.dirname(features_path), exist_ok=True)
        
        with open(features_path, 'w') as f:
            json.dump(features, f, indent=2)
        
        # Create a visualization of detected features
        viz_path = create_template_visualization(template_path, features, template_name)
        
        return {
            "success": True,
            "message": f"Template '{template_name}' trained successfully",
            "features": features,
            "visualization": viz_path
        }
        
    except Exception as e:
        print(f"Error training template: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Error training template: {str(e)}",
            "error": str(e)
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Train a document template by extracting features.')
    parser.add_argument('template_path', help='Path to the template image')
    parser.add_argument('template_name', help='Name to assign to the template')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    
    args = parser.parse_args()
    
    try:
        # Train template
        result = train_template(args.template_path, args.template_name)
        
        # Print result as JSON
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": f"Error training template: {str(e)}"
        }))
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1) 