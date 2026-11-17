process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-with-enough-length'
process.env.JWT_EXPIRES_IN = '12h'
process.env.COLLEGE_EMAIL_DOMAINS = 'college.edu,example.edu'
delete process.env.COLLEGE_EMAIL_DOMAIN
process.env.CLIENT_ORIGIN = 'http://localhost:5173'
process.env.DEMO_MODE = 'false'
process.env.PORT = '4000'
delete process.env.MONGO_URI
delete process.env.MONGO_DB_NAME
delete process.env.GEMINI_API_KEY
