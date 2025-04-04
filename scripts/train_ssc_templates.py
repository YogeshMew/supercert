import os
import base64
import requests
import sys
from PIL import Image
import io

def verify_service_running():
    """Check if the Python verification service is running"""
    try:
        response = requests.get('http://localhost:5000/health')
        if response.status_code == 200:
            return True
        return False
    except:
        return False

def train_template(image_path, template_name):
    """Train a template from an image file"""
    print(f"Training template '{template_name}' from image: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        return False
    
    # Create multipart form data
    files = {'document': open(image_path, 'rb')}
    data = {'name': template_name}
    
    try:
        # Send request to training endpoint
        response = requests.post('http://localhost:5000/train', files=files, data=data)
        
        # Handle response
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("Template training successful!")
                print(f"Features extracted: {result.get('features', {})}")
                return True
            else:
                print(f"Training failed: {result.get('message', 'Unknown error')}")
                return False
        else:
            print(f"Error: HTTP {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"Error sending request: {str(e)}")
        return False
    finally:
        files['document'].close()

if __name__ == "__main__":
    # Check if the service is running
    if not verify_service_running():
        print("Error: Python verification service is not running.")
        print("Please start the service with: cd pythonService && python app.py")
        sys.exit(1)
    
    # Instructions for the user
    print("To train SSC templates, follow these steps:")
    print("1. Save the first SSC certificate image to: sample_images/maharashtra_ssc_certificate1.jpg")
    print("2. Save the second SSC certificate image to: sample_images/maharashtra_ssc_certificate2.jpg")
    print("\nAfter saving the images, run the following commands:")
    print("python train_ssc_templates.py train sample_images/maharashtra_ssc_certificate1.jpg maharashtra_ssc_certificate1")
    print("python train_ssc_templates.py train sample_images/maharashtra_ssc_certificate2.jpg maharashtra_ssc_certificate2")
    
    # Parse arguments if provided
    if len(sys.argv) > 1 and sys.argv[1] == "train" and len(sys.argv) == 4:
        image_path = sys.argv[2]
        template_name = sys.argv[3]
        train_template(image_path, template_name) 