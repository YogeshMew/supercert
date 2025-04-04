const templateRoutes = require('./routes/templateRoutes');

app.use('/api/templates', templateRoutes);

// In the app configuration section, update the bodyParser limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true })); 