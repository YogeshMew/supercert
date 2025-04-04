#!/usr/bin/env python3
"""
Script to verify a document against a trained template
"""

import os
import sys
import json
import cv2
import numpy as np
from PIL import Image
import pytesseract
import re
from pathlib import Path
import argparse

# Constants
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'server')
TEMPLATE_DIR = os.path.join(SERVER_DIR, 'uploads', 'templates')
FEATURES_DIR = os.path.join(SERVER_DIR, 'data', 'features')
TEMP_DIR = os.path.join(SERVER_DIR, 'uploads', 'temp')

# Debug flag
DEBUG = False

# Make sure directories exist
os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(FEATURES_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def debug_print(message):
    """Print a debug message only if DEBUG is True"""
    if DEBUG:
        print(f"DEBUG: {message}", file=sys.stderr)

def preprocess_image(image_path):
    """Preprocess the image for better feature extraction."""
    try:
        # Read image
        debug_print(f"Reading image from {image_path}")
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
        
        debug_print("Image preprocessing completed successfully")
        return {
            'original': img,
            'gray': gray,
            'thresh': thresh,
            'blur': blur
        }
    except Exception as e:
        debug_print(f"Error in preprocess_image: {str(e)}")
        raise

def extract_features(image_path):
    """Extract features from the document image."""
    try:
        debug_print(f"Extracting features from {image_path}")
        processed = preprocess_image(image_path)
        features = {}
        
        # Extract text using OCR
        try:
            debug_print("Running OCR...")
            # Configuration for detailed OCR
            custom_config = r'--oem 3 --psm 6 -l eng'
            text = pytesseract.image_to_string(processed['gray'], config=custom_config)
            features['text'] = text
            debug_print(f"OCR text length: {len(text)}")
        except Exception as e:
            debug_print(f"OCR error: {str(e)}")
            features['text'] = ""
        
        # Extract structural features
        try:
            debug_print("Extracting structural features...")
            # Edge detection
            edges = cv2.Canny(processed['blur'], 50, 150)
            
            # Extract edge density
            edge_pixels = np.sum(edges > 0)
            total_pixels = edges.shape[0] * edges.shape[1]
            features['edge_density'] = float(edge_pixels) / total_pixels if total_pixels > 0 else 0
            debug_print(f"Edge density: {features['edge_density']}")
            
            # Extract contours for layout analysis
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            features['contours'] = len(contours)
            debug_print(f"Number of contours: {features['contours']}")
            
            # Extract regions of interest (ROIs)
            rois = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                if w > 50 and h > 20:  # Filter out small noise
                    rois.append([x, y, w, h])
            features['rois'] = rois
            debug_print(f"Number of ROIs: {len(rois)}")
            
            # Detect seals/logos (circular patterns)
            circles = None
            try:
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
            except Exception as e:
                debug_print(f"Circle detection error: {str(e)}")
                
            if circles is not None:
                circles = np.round(circles[0, :]).astype("int")
                features['seal_positions'] = circles.tolist()
                debug_print(f"Number of seals/logos detected: {len(features['seal_positions'])}")
            else:
                features['seal_positions'] = []
                debug_print("No seals/logos detected")
            
        except Exception as e:
            debug_print(f"Structural feature extraction error: {str(e)}")
            features['edge_density'] = 0
            features['contours'] = 0
            features['rois'] = []
            features['seal_positions'] = []
        
        debug_print("Feature extraction completed")
        return features
    except Exception as e:
        debug_print(f"Error in extract_features: {str(e)}")
        raise

def compare_features(doc_features, template_features):
    """Compare features between document and template."""
    try:
        debug_print("Starting feature comparison")
        if not template_features:
            debug_print("Template features are empty or invalid")
            return {
                'text_similarity': 0,
                'layout_similarity': 0,
                'seal_similarity': 0,
                'overall': 0
            }
            
        scores = {}
        
        # Compare text similarity
        try:
            debug_print("Comparing text similarity")
            doc_text = doc_features.get('text', '').lower()
            template_text = template_features.get('text', '').lower()
            
            # Simple text matching for testing
            if doc_text and template_text:
                # Generate word sets from both texts
                doc_words = set(re.findall(r'\b\w+\b', doc_text))
                template_words = set(re.findall(r'\b\w+\b', template_text))
                
                # Calculate Jaccard similarity
                if doc_words and template_words:
                    intersection = len(doc_words.intersection(template_words))
                    union = len(doc_words.union(template_words))
                    word_similarity = intersection / union if union > 0 else 0
                else:
                    word_similarity = 0
                
                # Calculate overall similarity with more emphasis on word matching
                scores['text_similarity'] = word_similarity
            else:
                scores['text_similarity'] = 0
                
            debug_print(f"Text similarity score: {scores['text_similarity']}")
        except Exception as e:
            debug_print(f"Text comparison error: {str(e)}")
            scores['text_similarity'] = 0
        
        # Compare layout similarity
        try:
            debug_print("Comparing layout similarity")
            # Compare ROIs (Regions of Interest)
            doc_rois = doc_features.get('rois', [])
            template_rois = template_features.get('rois', [])
            
            # Simple count-based similarity for testing
            max_rois = max(len(doc_rois), len(template_rois))
            if max_rois > 0:
                roi_count_similarity = min(len(doc_rois), len(template_rois)) / max_rois
            else:
                roi_count_similarity = 0
                
            # Edge density similarity
            doc_edge_density = doc_features.get('edge_density', 0)
            template_edge_density = template_features.get('edge_density', 0)
            
            edge_density_diff = abs(doc_edge_density - template_edge_density)
            edge_density_similarity = max(0, 1 - edge_density_diff * 5)  # Scale difference
            
            # Combine layout similarities
            scores['layout_similarity'] = (roi_count_similarity * 0.5) + (edge_density_similarity * 0.5)
            debug_print(f"Layout similarity score: {scores['layout_similarity']}")
        except Exception as e:
            debug_print(f"Layout comparison error: {str(e)}")
            scores['layout_similarity'] = 0
        
        # Compare seal positions
        try:
            debug_print("Comparing seal positions")
            doc_seals = doc_features.get('seal_positions', [])
            template_seals = template_features.get('seal_positions', [])
            
            # Simple count-based similarity for testing
            max_seals = max(len(doc_seals), len(template_seals))
            if max_seals > 0:
                seal_count_similarity = min(len(doc_seals), len(template_seals)) / max_seals
            else:
                seal_count_similarity = 0
            
            scores['seal_similarity'] = seal_count_similarity
            debug_print(f"Seal similarity score: {scores['seal_similarity']}")
        except Exception as e:
            debug_print(f"Seal comparison error: {str(e)}")
            scores['seal_similarity'] = 0
        
        # Calculate overall score with custom weights
        try:
            # Weight text most highly, then layout, then seals
            weights = {
                'text_similarity': 0.5,
                'layout_similarity': 0.3,
                'seal_similarity': 0.2
            }
            
            scores['overall'] = (
                scores['text_similarity'] * weights['text_similarity'] +
                scores['layout_similarity'] * weights['layout_similarity'] +
                scores['seal_similarity'] * weights['seal_similarity']
            )
            debug_print(f"Overall similarity score: {scores['overall']}")
        except Exception as e:
            debug_print(f"Overall score calculation error: {str(e)}")
            scores['overall'] = 0
        
        return scores
    except Exception as e:
        debug_print(f"Error in compare_features: {str(e)}")
        # Return zero scores on error
        return {
            'text_similarity': 0,
            'layout_similarity': 0,
            'seal_similarity': 0,
            'overall': 0
        }

def analyze_document(doc_path, template_path, features_path, scores):
    """Create visual analysis of verification results."""
    try:
        debug_print("Creating visual analysis")
        # Read images
        doc_img = cv2.imread(doc_path)
        template_img = cv2.imread(template_path)
        
        if doc_img is None:
            debug_print(f"Could not read document image from {doc_path}")
            return None
            
        if template_img is None:
            debug_print(f"Could not read template image from {template_path}")
            return None
        
        # Create analysis image by drawing verification results
        analysis_img = doc_img.copy()
        
        # Add header with verification status
        verified = scores['overall'] >= 0.65
        status_text = "VERIFIED" if verified else "NOT VERIFIED"
        status_color = (0, 255, 0) if verified else (0, 0, 255)  # Green or Red
        
        # Add verification status to the top
        cv2.rectangle(analysis_img, (0, 0), (analysis_img.shape[1], 60), (255, 255, 255), -1)
        cv2.putText(
            analysis_img,
            f"Verification Status: {status_text}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            status_color,
            2
        )
        
        # Add scores
        y_pos = 100
        for name, score in scores.items():
            pretty_name = ' '.join(name.split('_')).title()
            score_pct = f"{score * 100:.2f}%"
            cv2.putText(
                analysis_img,
                f"{pretty_name}: {score_pct}",
                (20, y_pos),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 0),
                2
            )
            y_pos += 30
        
        # Load template features if available
        template_features = None
        try:
            if os.path.exists(features_path):
                with open(features_path, 'r') as f:
                    template_features = json.load(f)
        except Exception as e:
            debug_print(f"Error loading template features: {str(e)}")
        
        # Draw comparison if we have template features
        if template_features and 'rois' in template_features:
            # Get document features
            doc_features = extract_features(doc_path)
            
            # Highlight ROIs on the document
            for roi in doc_features.get('rois', []):
                x, y, w, h = roi
                cv2.rectangle(analysis_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Highlight seals/logos on the document
            for circle in doc_features.get('seal_positions', []):
                if len(circle) >= 3:  # Make sure we have enough elements
                    x, y, r = circle
                    cv2.circle(analysis_img, (x, y), r, (255, 0, 0), 2)
        
        # Save analysis image
        analysis_path = os.path.join(TEMP_DIR, 'analysis.jpg')
        cv2.imwrite(analysis_path, analysis_img)
        debug_print(f"Analysis image saved to {analysis_path}")
        
        return analysis_path
    except Exception as e:
        debug_print(f"Error in analyze_document: {str(e)}")
        return None

def verify_document(doc_path, template_name):
    """Verify a document against a trained template."""
    try:
        debug_print(f"Starting verification of {doc_path} against template {template_name}")
        
        # Check if document exists
        if not os.path.exists(doc_path):
            debug_print(f"Document file does not exist: {doc_path}")
            return {
                "success": False,
                "message": f"Document file not found: {doc_path}"
            }
        
        # Check template exists
        template_path = None
        for ext in ['.jpg', '.jpeg', '.png']:
            temp_path = os.path.join(TEMPLATE_DIR, f"{template_name}{ext}")
            if os.path.exists(temp_path):
                template_path = temp_path
                break
        
        if not template_path:
            debug_print(f"Template {template_name} not found in {TEMPLATE_DIR}")
            return {
                "success": False,
                "message": f"Template {template_name} not found"
            }
        
        debug_print(f"Template path: {template_path}")
        
        # Check for features file
        features_path = os.path.join(FEATURES_DIR, f"{template_name}.json")
        template_features = None
        
        if os.path.exists(features_path):
            try:
                with open(features_path, 'r') as f:
                    template_features = json.load(f)
                debug_print(f"Loaded template features from {features_path}")
            except Exception as e:
                debug_print(f"Error loading template features: {str(e)}")
                template_features = None
        
        # If no features file, extract features from template
        if not template_features:
            debug_print("No template features found, extracting from template image")
            template_features = extract_features(template_path)
            
            # Save features for future use
            try:
                os.makedirs(os.path.dirname(features_path), exist_ok=True)
                with open(features_path, 'w') as f:
                    json.dump(template_features, f, indent=2)
                debug_print(f"Saved template features to {features_path}")
            except Exception as e:
                debug_print(f"Error saving template features: {str(e)}")
        
        # Extract features from document
        doc_features = extract_features(doc_path)
        
        # Compare features
        scores = compare_features(doc_features, template_features)
        
        # Create visual analysis
        analysis_path = analyze_document(doc_path, template_path, features_path, scores)
        
        # Determine if document is verified (threshold can be adjusted)
        verified = scores.get('overall', 0) >= 0.65
        
        result = {
            "success": True,
            "message": "Document verification completed",
            "verified": verified,
            "scores": scores
        }
        
        if analysis_path:
            result["analysis"] = analysis_path
            
        debug_print(f"Verification result: {json.dumps(result, indent=2)}")
        return result
    except Exception as e:
        debug_print(f"Error in verify_document: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False, 
            "message": f"Error during document verification: {str(e)}"
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Verify a document against a trained template.')
    parser.add_argument('document_path', help='Path to the document to verify')
    parser.add_argument('template_name', help='Name of the template to verify against')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    
    args = parser.parse_args()
    
    # Set debug flag
    DEBUG = args.debug
    
    if DEBUG:
        debug_print("Debug mode enabled")
        debug_print(f"Python version: {sys.version}")
        debug_print(f"OpenCV version: {cv2.__version__}")
        debug_print(f"Document path: {args.document_path}")
        debug_print(f"Template name: {args.template_name}")
        debug_print(f"Template directory: {TEMPLATE_DIR}")
        debug_print(f"Features directory: {FEATURES_DIR}")
        debug_print(f"Temp directory: {TEMP_DIR}")
    
    try:
        # Check Tesseract is installed
        try:
            pytesseract.get_tesseract_version()
            debug_print(f"Tesseract version: {pytesseract.get_tesseract_version()}")
        except Exception as e:
            debug_print(f"WARNING: Tesseract may not be installed or properly configured: {str(e)}")
            debug_print("This might cause OCR to fail")
        
        # Run verification
        result = verify_document(args.document_path, args.template_name)
        
        # Print result as JSON
        print(json.dumps(result))
    except Exception as e:
        debug_print(f"Critical error: {str(e)}")
        import traceback
        traceback.print_exc()
        print(json.dumps({
            "success": False,
            "message": f"Critical error during verification: {str(e)}"
        }))
        sys.exit(1) 