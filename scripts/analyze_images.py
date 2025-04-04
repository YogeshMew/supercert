#!/usr/bin/env python3
"""
Script to analyze and compare features of two images
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

# Constants
FEATURES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'server', 'data', 'features')

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

def compare_features(features1, features2):
    """Compare features and calculate similarity scores"""
    scores = {}
    
    # Compare text using the Jaccard similarity coefficient
    text1 = features1.get('text', '').lower()
    text2 = features2.get('text', '').lower()
    
    # Create sets of words
    words1 = set(re.findall(r'\b\w+\b', text1))
    words2 = set(re.findall(r'\b\w+\b', text2))
    
    if words1 and words2:
        # Jaccard similarity: size of intersection divided by size of union
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        text_similarity = len(intersection) / len(union) if union else 0
    else:
        text_similarity = 0
    
    scores['text_similarity'] = text_similarity
    
    # Compare field patterns
    patterns1 = features1.get('field_patterns', {})
    patterns2 = features2.get('field_patterns', {})
    
    pattern_matches = 0
    total_patterns = len(set(patterns1.keys()).union(set(patterns2.keys())))
    
    for key in patterns1.keys():
        if key in patterns2 and patterns1[key] == patterns2[key]:
            pattern_matches += 1
    
    pattern_similarity = pattern_matches / total_patterns if total_patterns else 0
    scores['pattern_similarity'] = pattern_similarity
    
    # Compare layout
    layout1 = features1.get('layout', {})
    layout2 = features2.get('layout', {})
    
    h_line_diff = abs(layout1.get('h_lines', 0) - layout2.get('h_lines', 0))
    v_line_diff = abs(layout1.get('v_lines', 0) - layout2.get('v_lines', 0))
    
    max_lines = max(
        layout1.get('h_lines', 0) + layout1.get('v_lines', 0),
        layout2.get('h_lines', 0) + layout2.get('v_lines', 0)
    )
    
    layout_similarity = 1 - ((h_line_diff + v_line_diff) / max_lines) if max_lines else 0
    scores['layout_similarity'] = layout_similarity
    
    # Compare edge density
    edge1 = features1.get('edge_density', 0)
    edge2 = features2.get('edge_density', 0)
    
    edge_similarity = 1 - abs(edge1 - edge2) / max(edge1, edge2) if max(edge1, edge2) > 0 else 0
    scores['edge_similarity'] = edge_similarity
    
    # Calculate overall similarity
    overall = (
        text_similarity * 0.3 + 
        pattern_similarity * 0.2 + 
        layout_similarity * 0.3 + 
        edge_similarity * 0.2
    )
    
    scores['overall'] = overall
    
    return scores

def visualize_comparison(image_path1, image_path2, features1, features2, scores):
    """Create a visual comparison of the two images and their features"""
    # Read images
    img1 = cv2.imread(image_path1)
    img2 = cv2.imread(image_path2)
    
    if img1 is None or img2 is None:
        print("Error: Could not read one or both images")
        return None
    
    # Resize images to the same height
    h1, w1 = img1.shape[:2]
    h2, w2 = img2.shape[:2]
    
    target_height = min(h1, h2, 800)  # Limit max height
    
    # Calculate new widths while preserving aspect ratio
    new_w1 = int(w1 * (target_height / h1))
    new_w2 = int(w2 * (target_height / h2))
    
    img1_resized = cv2.resize(img1, (new_w1, target_height))
    img2_resized = cv2.resize(img2, (new_w2, target_height))
    
    # Create a canvas for side-by-side comparison
    max_width = max(new_w1, new_w2)
    canvas_height = target_height + 200  # Extra space for text
    canvas_width = max_width * 2 + 20  # 20px gap between images
    
    canvas = np.ones((canvas_height, canvas_width, 3), dtype=np.uint8) * 255
    
    # Place the images
    canvas[50:50+target_height, 10:10+new_w1] = img1_resized
    canvas[50:50+target_height, 10+max_width+10:10+max_width+10+new_w2] = img2_resized
    
    # Add image labels
    cv2.putText(canvas, "Template Image", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(canvas, "Test Image", (10+max_width+10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    # Add comparison scores
    y_pos = target_height + 70
    cv2.putText(canvas, f"Text Similarity: {scores['text_similarity']*100:.2f}%", 
                (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    cv2.putText(canvas, f"Pattern Similarity: {scores['pattern_similarity']*100:.2f}%", 
                (10, y_pos+30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    cv2.putText(canvas, f"Layout Similarity: {scores['layout_similarity']*100:.2f}%", 
                (10+max_width+10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    cv2.putText(canvas, f"Edge Similarity: {scores['edge_similarity']*100:.2f}%", 
                (10+max_width+10, y_pos+30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    # Add overall score
    cv2.putText(canvas, f"Overall Similarity: {scores['overall']*100:.2f}%", 
                (canvas_width//2 - 150, y_pos+70), cv2.FONT_HERSHEY_SIMPLEX, 1.0, 
                (0, 0, 255) if scores['overall'] < 0.7 else (0, 255, 0), 2)
    
    # Draw verification result
    verified = scores['overall'] >= 0.7
    result_text = "VERIFIED" if verified else "NOT VERIFIED"
    color = (0, 255, 0) if verified else (0, 0, 255)
    
    cv2.putText(canvas, result_text, 
                (canvas_width//2 - 80, y_pos+110), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
    
    # Save the visualization
    output_path = os.path.join(os.path.dirname(image_path1), "comparison_analysis.jpg")
    cv2.imwrite(output_path, canvas)
    
    return output_path

def main():
    if len(sys.argv) < 3:
        print("Usage: python analyze_images.py <template_image> <test_image>")
        sys.exit(1)
    
    template_path = sys.argv[1]
    test_path = sys.argv[2]
    
    print(f"Analyzing template image: {template_path}")
    template_features = extract_features(template_path)
    
    print(f"Analyzing test image: {test_path}")
    test_features = extract_features(test_path)
    
    print("Comparing features...")
    scores = compare_features(template_features, test_features)
    
    print("Visualizing comparison...")
    output_path = visualize_comparison(template_path, test_path, template_features, test_features, scores)
    
    print(f"Text Similarity: {scores['text_similarity']*100:.2f}%")
    print(f"Pattern Similarity: {scores['pattern_similarity']*100:.2f}%")
    print(f"Layout Similarity: {scores['layout_similarity']*100:.2f}%")
    print(f"Edge Similarity: {scores['edge_similarity']*100:.2f}%")
    print(f"Overall Similarity: {scores['overall']*100:.2f}%")
    print(f"Verification Result: {'VERIFIED' if scores['overall'] >= 0.7 else 'NOT VERIFIED'}")
    
    if output_path:
        print(f"Comparison visualization saved to: {output_path}")

if __name__ == "__main__":
    main() 