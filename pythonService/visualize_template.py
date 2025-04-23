import cv2
import numpy as np
import os
import sys
from app import extract_features, preprocess_image

def visualize_template(template_path, output_filename):
    """Visualize features extracted from a template image"""
    print(f"Visualizing template: {template_path}")
    
    # Load the template image
    img = cv2.imread(template_path)
    if img is None:
        print(f"Error: Could not read template image: {template_path}")
        return False
    
    # Extract features
    features = extract_features(img)
    
    # Create a copy of the image for visualization
    visual = img.copy()
    
    # Get dimensions
    height, width = img.shape[:2]
    
    # Draw detected features
    detected_features = features.get('detected_features', [])
    for feature in detected_features:
        feature_type = feature.get('type', 'unknown')
        x, y = feature.get('x', 0), feature.get('y', 0)
        w, h = feature.get('width', 0), feature.get('height', 0)
        
        # Different colors for different feature types
        if feature_type == 'text_block':
            color = (255, 0, 0)  # Blue for text blocks
        elif feature_type == 'seal':
            color = (0, 0, 255)  # Red for seals
        elif feature_type == 'logo':
            color = (0, 255, 0)  # Green for logos
        else:
            color = (255, 255, 0)  # Yellow for other
        
        # Draw rectangle
        cv2.rectangle(visual, (x, y), (x + w, y + h), color, 2)
        
        # Add label
        cv2.putText(visual, feature_type, (x, y - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
    
    # Draw regions of interest
    regions = features.get('regions', {})
    for region_name, region in regions.items():
        x, y = region.get('x', 0), region.get('y', 0)
        w, h = region.get('width', 0), region.get('height', 0)
        
        # Draw region with name
        cv2.rectangle(visual, (x, y), (x + w, y + h), (0, 255, 255), 1)
        cv2.putText(visual, region_name, (x + 5, y + 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
    
    # Draw seal positions
    seal_positions = features.get('seal_positions', {})
    circles = seal_positions.get('circles', [])
    for circle in circles:
        if len(circle) >= 3:
            x, y, r = circle[:3]
            cv2.circle(visual, (int(x), int(y)), int(r), (0, 0, 255), 2)
    
    # Create a version with detected edges
    processed = preprocess_image(img)
    edges = cv2.Canny(processed, 50, 150)
    edges_colored = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    
    # Create output image with title and info
    template_name = os.path.basename(template_path)
    template_type = "HSC Template" if "hsc" in template_name.lower() else "SSC Template"
    
    # Create title bar
    title_height = 60
    info_height = 100
    info_width = 400
    
    # Create larger image for both originals and edge maps
    result_height = height * 2 + title_height + info_height
    result_width = max(width * 2, info_width)
    result = np.ones((result_height, result_width, 3), dtype=np.uint8) * 255
    
    # Add title
    cv2.putText(result, f"{template_type} Feature Analysis", 
               (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
    
    # Place original image in top-left
    result[title_height:title_height+height, 0:width] = img
    
    # Place visualization in top-right
    result[title_height:title_height+height, width:width*2] = visual
    
    # Place edges in bottom-left
    result[title_height+height:title_height+height*2, 0:width] = edges_colored
    
    # Add information panel at bottom
    info_y = title_height + height * 2
    
    # Add labels
    cv2.putText(result, "Original Image", 
               (width//2 - 80, title_height - 10), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    cv2.putText(result, "Detected Features", 
               (width + width//2 - 80, title_height - 10), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    cv2.putText(result, "Edge Detection", 
               (width//2 - 80, title_height + height - 10), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    # Add feature information
    info_y = title_height + height * 2 - 100
    info_x = width + 50
    
    key_info = [
        f"Template Type: {template_type}",
        f"Dimensions: {width}x{height}",
        f"Text Length: {features.get('text_len', 0)} characters",
        f"Text Blocks: {len([f for f in detected_features if f.get('type') == 'text_block'])}",
        f"Seals Detected: {len(circles)}",
        f"Has Logo: {'Yes' if seal_positions.get('has_logo_pattern', False) else 'No'}",
        f"Is Maharashtra HSC: {'Yes' if features.get('is_maharashtra_hsc', {}).get('is_maharashtra_hsc', False) else 'No'}",
        f"Is Maharashtra SSC: {'Yes' if features.get('is_maharashtra_ssc', {}).get('is_maharashtra_ssc', False) else 'No'}",
    ]
    
    for i, info in enumerate(key_info):
        cv2.putText(result, info, 
                   (info_x - 380, info_y + i*25), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    
    # Add legend
    legend_y = info_y + 220
    legend_items = [
        ("Text Blocks", (255, 0, 0)),  # Blue
        ("Seals", (0, 0, 255)),        # Red
        ("Logo", (0, 255, 0)),         # Green
        ("Regions", (0, 255, 255))     # Yellow
    ]
    
    for i, (label, color) in enumerate(legend_items):
        # Draw color swatch
        cv2.rectangle(result, 
                     (info_x - 380, legend_y + i*30 - 15), 
                     (info_x - 350, legend_y + i*30 + 5), 
                     color, -1)
        # Add label
        cv2.putText(result, label, 
                   (info_x - 340, legend_y + i*30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    
    # Save the result
    output_dir = "temp/visualizations"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, output_filename)
    
    cv2.imwrite(output_path, result)
    print(f"Visualization saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python visualize_template.py <template_path> [output_filename]")
        sys.exit(1)
    
    template_path = sys.argv[1]
    output_filename = sys.argv[2] if len(sys.argv) >= 3 else "template_analysis.jpg"
    
    visualize_template(template_path, output_filename) 