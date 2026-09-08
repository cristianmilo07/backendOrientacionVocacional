require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
};

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    return res.json({
      token: generateToken(user),
      user: {
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('username name role');
    res.json(students.map(s => ({
      id: s._id,
      username: s.username,
      name: s.name,
      role: s.role
    })));
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});

module.exports = { generateToken };
