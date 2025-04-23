# -*- coding: utf-8 -*-
# Script to fix all indentation errors in app.py

with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Track which lines we've fixed
fixed_lines = []

# Fix 1: Find the problematic line (else: statement with no indented block)
for i in range(len(lines)):
    if i > 700 and i < 730 and 'else:' in lines[i] and '# Standard text comparison' in lines[i+1]:
        # Make the if statement that follows the else properly indented
        lines[i+2] = '            ' + lines[i+2].lstrip()
        fixed_lines.append(i+2)
        print(f"Fixed indentation on line {i+2} (else block)")

# Fix 2: Find the indentation error after try statement around line 1357
for i in range(len(lines)):
    if i > 1350 and i < 1370 and 'try:' in lines[i] and not lines[i+1].strip().startswith(('except', 'finally')):
        # Check if next line is properly indented
        next_line = lines[i+1]
        if not next_line.startswith(' ' * 8):  # Should have at least 8 spaces of indentation
            lines[i+1] = '        ' + next_line.lstrip()
            fixed_lines.append(i+1)
            print(f"Fixed indentation on line {i+1} (try block)")

# Fix 3: Check for any other potential indentation errors with if/else/try/except blocks
keywords = ['if ', 'else:', 'elif ', 'try:', 'except ', 'finally:', 'for ', 'while ', 'def ', 'class ']
for i in range(len(lines)-1):
    if i >= 1000:  # Focus on later part of file
        line = lines[i].rstrip()
        next_line = lines[i+1].rstrip()
        
        # Check if line ends with a colon (block starter)
        if any(line.strip().startswith(k) for k in keywords) and line.rstrip().endswith(':'):
            # Check if next line has proper indentation
            if next_line and not next_line.startswith(' ' * 8) and not any(next_line.strip().startswith(k) for k in keywords):
                # Fix indentation if it doesn't look right
                lines[i+1] = '        ' + next_line.lstrip()
                fixed_lines.append(i+1)
                print(f"Fixed potential indentation on line {i+1}")

# Write the fixed file
with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

if fixed_lines:
    print(f"Fixed {len(fixed_lines)} indentation issues in app.py!")
else:
    print("No indentation issues found to fix.") 