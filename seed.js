require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');

const students = [
  { name: 'Ana Gómez', username: 'ana.gomez' },
  { name: 'Luis Torres', username: 'luis.torres' },
  { name: 'María Ruiz', username: 'maria.ruiz' },
  { name: 'Carlos Mendoza', username: 'carlos.mendoza' },
  { name: 'Sofía Herrera', username: 'sofia.herrera' },
  { name: 'Diego Ramírez', username: 'diego.ramirez' },
  { name: 'Valentina Castro', username: 'valentina.castro' },
  { name: 'Andrés Morales', username: 'andres.morales' },
  { name: 'Isabella Reyes', username: 'isabella.reyes' },
  { name: 'Mateo Vargas', username: 'mateo.vargas' },
  { name: 'Camila Rojas', username: 'camila.rojas' },
  { name: 'Sebastián Paredes', username: 'sebastian.paredes' },
  { name: 'Luciana Ortega', username: 'luciana.ortega' },
  { name: 'Tomás Delgado', username: 'tomas.delgado' },
  { name: 'Martina Silva', username: 'martina.silva' },
  { name: 'Nicolás Bravo', username: 'nicolas.bravo' },
  { name: 'Renata Fuentes', username: 'renata.fuentes' },
  { name: 'Joaquín Molina', username: 'joaquin.molina' },
  { name: 'Emilia Aguirre', username: 'emilia.aguirre' },
  { name: 'Benjamín Ríos', username: 'benjamin.rios' },
  { name: 'Antonia Palma', username: 'antonia.palma' },
  { name: 'Felipe Carrasco', username: 'felipe.carrasco' },
  { name: 'Josefa Espinoza', username: 'josefa.espinoza' },
  { name: 'Maximiliano Correa', username: 'maximiliano.correa' },
  { name: 'Florencia Sosa', username: 'florencia.sosa' },
  { name: 'Bruno Domínguez', username: 'bruno.dominguez' },
  { name: 'Catalina Peña', username: 'catalina.pena' },
  { name: 'Gaspar Vidal', username: 'gaspar.vidal' },
  { name: 'Amanda Cabrera', username: 'amanda.cabrera' },
  { name: 'Francisco Núñez', username: 'francisco.nunez' },
  { name: 'Victoria Méndez', username: 'victoria.mendez' },
  { name: 'Agustín Guzmán', username: 'agustin.guzman' },
  { name: 'Trinidad Farías', username: 'trinidad.farias' },
  { name: 'Damián Soto', username: 'damian.soto' },
  { name: 'Pilar Contreras', username: 'pilar.contreras' },
  { name: 'Lucas Marín', username: 'lucas.marin' },
  { name: 'Constanza Araya', username: 'constanza.araya' },
  { name: 'Rodrigo Campos', username: 'rodrigo.campos' },
  { name: 'Manuela Leiva', username: 'manuela.leiva' },
  { name: 'Emilio Reyes', username: 'emilio.reyes' }
];

const seedDB = async () => {
  try {
    await connectDB();

    await User.deleteMany({ role: 'student' });

    const password = 'estudiante123';

    for (const student of students) {
      await User.create({
        username: student.username,
        password: password,
        name: student.name,
        role: 'student'
      });
    }

    const adminExists = await User.findOne({ username: 'carolina.admin' });
    if (!adminExists) {
      const oldAdmin = await User.findOne({ username: 'admin' });
      if (oldAdmin) {
        oldAdmin.username = 'carolina.admin';
        oldAdmin.password = 'Carod10s.';
        oldAdmin.name = 'Administrador';
        oldAdmin.role = 'admin';
        await oldAdmin.save();
      } else {
        await User.create({
          username: 'carolina.admin',
          password: 'Carod10s.',
          name: 'Administrador',
          role: 'admin'
        });
      }
    }

    console.log(`Base de datos poblada con ${students.length} estudiantes y 1 admin.`);
    console.log('Usuarios creados:');
    for (const student of students) {
      console.log(`  - ${student.username} / ${password} (${student.name})`);
    }
    console.log('  - carolina.admin / Carod10s. (Administrador)');
    process.exit(0);
  } catch (error) {
    console.error('Error poblando la base de datos:', error);
    process.exit(1);
  }
};

seedDB();
