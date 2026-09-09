require('dotenv').config();
const mongoose = require('mongoose');
require('./models/User');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await mongoose.model('User').updateMany({ currentToken: { $exists: true } }, { currentToken: null, isActive: false });
  console.log('Sesiones limpiadas');
  mongoose.disconnect();
});
