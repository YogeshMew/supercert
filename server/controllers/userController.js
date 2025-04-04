// Check if user exists
const user = await User.findOne({ email });
if (!user) {
  return res.status(401).json({
    success: false,
    message: "Invalid email or password"
  });
}

// Check if password is correct
const isPasswordValid = await bcrypt.compare(password, user.password);
if (!isPasswordValid) {
  return res.status(401).json({
    success: false,
    message: "Invalid email or password"
  });
}

// Check if account is active
if (!user.isActive) {
  return res.status(401).json({
    success: false,
    message: "Account is not active. Please contact administrator."
  });
} 