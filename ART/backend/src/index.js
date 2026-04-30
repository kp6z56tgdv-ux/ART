const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');
const config = require('../config.json');
const { initializeDatabase } = require('./config/database');
const { createTables, insertInitialData } = require('./config/schema');

// Importar rutas
const reservaRoutes = require('./routes/reservaRoutes');
const salaRoutes = require('./routes/salaRoutes');
const equipoRoutes = require('./routes/equipoRoutes');
const authRoutes = require('./routes/authRoutes');
const adminEmailRoutes = require('./routes/adminEmailRoutes');

const app = express();
const PORT = config.server.port;

// Obtener IP local
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/admin-emails', adminEmailRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/salas', salaRoutes);
app.use('/api/equipos', equipoRoutes);

// Rutas para servir HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin/admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin/login.html'));
});

// Iniciar servidor - Escuchar en todas las interfaces (0.0.0.0)
async function startServer() {
  await createTables();
  await insertInitialData();

  app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`\n═══════════════════════════════════════`);
    console.log(`  ART - Aplicativos de Reservas Tabasco`);
    console.log(`═══════════════════════════════════════`);
    console.log(`  Servidor ejecutándose en puerto: ${PORT}`);
    console.log(`  URL local:     http://localhost:${PORT}`);
    console.log(`  URL en red:    http://${localIP}:${PORT}`);
    console.log(`═══════════════════════════════════════\n`);
  });
}

startServer();
