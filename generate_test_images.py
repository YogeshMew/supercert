import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

def create_valid_certificate():
    """Create a valid Maharashtra SSC certificate test image."""
    # Create a white background
    width, height = 1116, 1600  # Same dimensions as template
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    
    # Add header text
    header_text = "MAHARASHTRA STATE BOARD OF SECONDARY"
    draw.text((width//4, 50), header_text, fill='black')
    
    # Add certificate text
    cert_text = "SECONDARY SCHOOL CERTIFICATE EXAMINATION"
    draw.text((width//4, 100), cert_text, fill='black')
    
    # Draw table structure
    # Horizontal lines
    for y in [300, 400, 500, 600, 700]:
        draw.line([(50, y), (width-50, y)], fill='black', width=2)
    
    # Vertical lines
    for x in [50, 200, 400, 600, width-50]:
        draw.line([(x, 300), (x, 700)], fill='black', width=2)
    
    # Add some sample data
    data = [
        "ENGLISH", "85", "DISTINCTION",
        "MATHEMATICS", "92", "DISTINCTION",
        "SCIENCE", "88", "DISTINCTION"
    ]
    
    current_y = 320
    for i in range(0, len(data), 3):
        draw.text((60, current_y), data[i], fill='black')
        draw.text((210, current_y), data[i+1], fill='black')
        draw.text((410, current_y), data[i+2], fill='black')
        current_y += 100
    
    # Add circular seal
    draw.ellipse([(50, 800), (200, 950)], outline='black', width=2)
    draw.text((80, 850), "BOARD SEAL", fill='black')
    
    # Save the image
    os.makedirs('test_images', exist_ok=True)
    image.save('test_images/valid_certificate.jpg', quality=95)
    return 'test_images/valid_certificate.jpg'

def create_invalid_certificate():
    """Create an invalid certificate test image with deliberate differences."""
    # Create a different sized background
    width, height = 1000, 1400  # Different dimensions
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    
    # Add different header text
    header_text = "STATE EXAMINATION BOARD"
    draw.text((width//4, 50), header_text, fill='black')
    
    # Add different certificate text
    cert_text = "HIGH SCHOOL COMPLETION CERTIFICATE"
    draw.text((width//4, 100), cert_text, fill='black')
    
    # Draw different table structure
    # Horizontal lines - fewer lines
    for y in [300, 450, 600]:
        draw.line([(50, y), (width-50, y)], fill='black', width=2)
    
    # Vertical lines - different spacing
    for x in [50, 300, 500, width-50]:
        draw.line([(x, 300), (x, 600)], fill='black', width=2)
    
    # Add different sample data
    data = [
        "SUBJECT A", "PASS", "C",
        "SUBJECT B", "FAIL", "F"
    ]
    
    current_y = 320
    for i in range(0, len(data), 3):
        draw.text((60, current_y), data[i], fill='black')
        draw.text((310, current_y), data[i+1], fill='black')
        draw.text((510, current_y), data[i+2], fill='black')
        current_y += 150
    
    # Add rectangular stamp instead of circular seal
    draw.rectangle([(50, 800), (200, 900)], outline='black', width=2)
    draw.text((80, 850), "STAMP", fill='black')
    
    # Save the image
    os.makedirs('test_images', exist_ok=True)
    image.save('test_images/invalid_certificate.jpg', quality=95)
    return 'test_images/invalid_certificate.jpg'

if __name__ == "__main__":
    print("Generating test images...")
    valid_path = create_valid_certificate()
    invalid_path = create_invalid_certificate()
    print(f"Generated valid certificate at: {valid_path}")
    print(f"Generated invalid certificate at: {invalid_path}")
    print("\nTest these images with your verification system to see the results.") 