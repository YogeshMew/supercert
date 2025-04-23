# Script to restore health_check function in app.py

# The correct health_check function
correct_function = '''@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Service is running"}), 200
'''

# Read the file
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start and end of the problematic function
start_idx = content.find('@app.route(\'/health\'')
if start_idx == -1:
    print("Couldn't find health check endpoint in app.py")
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

print("Successfully restored the health_check function in app.py") 