import requests
import os
import sys
import json

def verify_service_running():
    """Check if the Python verification service is running"""
    try:
        response = requests.get('http://localhost:5000/health')
        if response.status_code == 200:
            return True
        return False
    except:
        return False

def verify_document(image_path, template_name=None):
    """Verify a document against templates"""
    print(f"Verifying document: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        return
    
    # Create multipart form data
    files = {'document': open(image_path, 'rb')}
    data = {}
    
    if template_name:
        data['template'] = template_name
        print(f"Using specified template: {template_name}")
    else:
        print("Using auto-matching against all templates")
    
    try:
        # Send request to verification endpoint
        response = requests.post('http://localhost:5000/verify', files=files, data=data)
        
        # Handle response
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                if result.get('verified'):
                    print("\n✅ DOCUMENT VERIFIED")
                else:
                    print("\n❌ DOCUMENT NOT VERIFIED")
                
                print(f"\nMatched Template: {result.get('matchedTemplate', 'Unknown')}")
                
                if 'scores' in result:
                    print("\nSimilarity Scores:")
                    for key, value in result['scores'].items():
                        if key != 'overall':
                            print(f"  - {key.replace('_', ' ').title()}: {value * 100:.2f}%")
                    
                    print(f"\nOverall Score: {result['scores'].get('overall', 0) * 100:.2f}%")
                
                if 'analysis' in result:
                    print(f"\nAnalysis image: {result['analysis']}")
                
                return result
            else:
                print(f"Verification failed: {result.get('message', 'Unknown error')}")
                return None
        else:
            print(f"Error: HTTP {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Error sending request: {str(e)}")
        return None
    finally:
        files['document'].close()

def list_templates():
    """List all available templates"""
    try:
        response = requests.get('http://localhost:5000/templates')
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                templates = result.get('templates', [])
                if templates:
                    print(f"Found {len(templates)} templates:")
                    for i, template in enumerate(templates, 1):
                        print(f"{i}. {template}")
                    return templates
                else:
                    print("No templates found.")
                    return []
            else:
                print(f"Error: {result.get('message', 'Unknown error')}")
                return []
        else:
            print(f"Error: HTTP {response.status_code}")
            return []
    except Exception as e:
        print(f"Error: {str(e)}")
        return []

if __name__ == "__main__":
    # Check if the service is running
    if not verify_service_running():
        print("Error: Python verification service is not running.")
        print("Please start the service with: cd pythonService && python app.py")
        sys.exit(1)
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python verify_document.py list            - List all available templates")
        print("  python verify_document.py verify <image>  - Verify a document with auto-matching")
        print("  python verify_document.py verify <image> <template>  - Verify against specific template")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        list_templates()
    
    elif command == "verify":
        if len(sys.argv) < 3:
            print("Error: Please provide an image path to verify")
            sys.exit(1)
        
        image_path = sys.argv[2]
        template_name = sys.argv[3] if len(sys.argv) > 3 else None
        
        verify_document(image_path, template_name)
    
    else:
        print(f"Unknown command: {command}")
        print("Usage:")
        print("  python verify_document.py list            - List all available templates")
        print("  python verify_document.py verify <image>  - Verify a document with auto-matching")
        print("  python verify_document.py verify <image> <template>  - Verify against specific template") 