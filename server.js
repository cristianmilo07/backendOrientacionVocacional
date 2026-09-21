require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const User = require('./models/User');
const SurveyResponse = require('./models/Response');
const authMiddleware = require('./middleware/auth').authMiddleware;
const adminOnly = require('./middleware/auth').adminOnly;

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

    if (user.currentToken) {
      return res.status(409).json({
        message: 'Esta cuenta ya tiene una sesión activa',
        activeSession: true,
        user: {
          username: user.username,
          name: user.name,
          lastLogin: user.lastLogin
        }
      });
    }

    const token = generateToken(user);

    user.currentToken = token;
    user.isActive = true;
    user.activeAt = new Date();
    user.lastLogin = new Date();
    await user.save();

    console.log('Login OK:', user.username, 'currentToken:', user.currentToken ? 'SI' : 'NO');

    return res.json({
      token,
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

app.post('/api/auth/force-login', async (req, res) => {
  try {
    const { username } = req.body || {};

    if (!username) {
      return res.status(400).json({ message: 'Usuario requerido' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!user.currentToken) {
      return res.status(409).json({
        message: 'No hay sesión activa para este usuario',
        activeSession: false
      });
    }

    const token = generateToken(user);

    user.currentToken = token;
    user.isActive = true;
    user.activeAt = new Date();
    user.lastLogin = new Date();
    await user.save();

    console.log('Force-login OK:', user.username, 'currentToken:', user.currentToken ? 'SI' : 'NO');

    return res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Error en force-login:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false, currentToken: null });
    return res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

app.get('/api/students', authMiddleware, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('username name role isActive lastLogin');
    res.json(students.map(s => ({
      id: s._id,
      username: s.username,
      name: s.name,
      role: s.role,
      isActive: s.isActive,
      lastLogin: s.lastLogin
    })));
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

app.post('/api/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const body = req.body || {};
    console.log('POST /api/users body keys:', Object.keys(body));
    console.log('POST /api/users body:', JSON.stringify(body));

    const firstName = body.firstName;
    const lastName = body.lastName;
    const password = body.password;

    console.log('firstName:', firstName, 'lastName:', lastName, 'password present:', !!password);

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'Nombre y apellido son requeridos' });
    }

    const normalize = (text) =>
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '.');

    const username = `${normalize(firstName)}.${normalize(lastName)}`;
    const finalPassword = password && String(password).trim() ? String(password).trim() : username;

    console.log('username:', username, 'finalPassword present:', !!finalPassword);

    const existing = await User.findOne({ username });
    console.log('existing user:', existing ? existing.username : null);
    if (existing) {
      return res.status(409).json({ message: 'El usuario ya existe' });
    }

    const user = await User.create({ username, password: finalPassword, name: `${firstName} ${lastName}`, role: 'student' });
    console.log('created user:', user._id, user.username);

    res.status(201).json({
      message: 'Usuario creado correctamente',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

app.post('/api/responses', authMiddleware, async (req, res) => {
  try {
    const { answers } = req.body || {};
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'Respuestas inválidas' });
    }

    const response = await SurveyResponse.create({
      userId: req.user.id,
      username: req.user.username,
      answers
    });

    return res.status(201).json({ message: 'Respuesta guardada', response });
  } catch (error) {
    console.error('Error guardando respuesta:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

app.get('/api/responses', authMiddleware, async (req, res) => {
  try {
    const responses = await SurveyResponse.find().sort({ submittedAt: -1 });
    res.json(responses.map(r => ({
      _id: r._id,
      userId: r.userId,
      username: r.username,
      answersCount: r.answers.length,
      reflection: r.reflection || [],
      submittedAt: r.submittedAt,
      createdAt: r.createdAt
    })));
  } catch (error) {
    console.error('Error obteniendo respuestas:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

app.get('/api/responses/:id', authMiddleware, async (req, res) => {
  try {
    const response = await SurveyResponse.findById(req.params.id);
    if (!response) {
      return res.status(404).json({ message: 'Respuesta no encontrada' });
    }
    res.json(response);
  } catch (error) {
    console.error('Error obteniendo detalle de respuesta:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});
app.delete('/api/responses/:id', authMiddleware, async (req, res) => {
  try {
    const response = await SurveyResponse.findByIdAndDelete(req.params.id);
    if (!response) {
      return res.status(404).json({ message: 'Respuesta no encontrada' });
    }

    res.json({ message: 'Respuesta eliminada' });
  } catch (error) {
    console.error('Error eliminando respuesta:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

app.patch('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const { name, password } = req.body || {};
    if (name !== undefined) user.name = name.trim();
    if (password !== undefined && password.trim()) user.password = password.trim();

    await user.save();

    res.json({
      message: 'Usuario actualizado correctamente',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

app.post('/api/users/:id/logout', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await User.findByIdAndUpdate(req.params.id, { isActive: false, currentToken: null });

    res.json({ message: `Sesión cerrada para ${user.username}` });
  } catch (error) {
    console.error('Error cerrando sesión de usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

app.patch('/api/responses/:id/reflection', authMiddleware, async (req, res) => {
  try {
    console.log('PATCH reflection id:', req.params.id, 'body keys:', Object.keys(req.body || {}));
    const response = await SurveyResponse.findById(req.params.id);
    if (!response) {
      return res.status(404).json({ message: 'Respuesta no encontrada' });
    }

    const { reflection } = req.body || {};
    if (!Array.isArray(reflection)) {
      return res.status(400).json({ message: 'Reflexión inválida' });
    }

    response.reflection = reflection;
    const saved = await response.save();
    console.log('Reflexión guardada para', saved._id, 'items:', saved.reflection.length);

    res.json({ message: 'Reflexión guardada', response: saved });
  } catch (error) {
    console.error('Error guardando reflexión:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});

module.exports = { generateToken };
