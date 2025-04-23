# Script to restore after_request function in app.py

# The correct after_request function
correct_function = '''@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
'''

# Read the file
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start and end of the problematic function
start_idx = content.find('@app.after_request')
if start_idx == -1:
    print("Couldn't find @app.after_request in app.py")
    exit(1)

# Find the next function or decorator to determine where this function ends
next_function = content.find('@app', start_idx + 1)
if next_function == -1:
    next_function = len(content)

# Replace the broken function with the correct one
new_content = content[:start_idx] + correct_function + content[next_function:]

# Write the fixed content back
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully restored the after_request function in app.py") 