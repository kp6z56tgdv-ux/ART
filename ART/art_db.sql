-- ART - Aplicativos de Reservas Tabasco
-- Script SQL para crear la base de datos y tablas

CREATE DATABASE IF NOT EXISTS art_db;
USE art_db;

-- Tabla de Salas/Oficinas
CREATE TABLE sala (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  aire_acondicionado BOOLEAN DEFAULT FALSE,
  television BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Nombres/Personas
CREATE TABLE nombre (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre_persona VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  telefono VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Fechas
CREATE TABLE fecha (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fecha_reserva DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Horas
CREATE TABLE hora (
  id INT PRIMARY KEY AUTO_INCREMENT,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Equipos
CREATE TABLE equipo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  cantidad INT DEFAULT 1,
  disponible INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Reservas
CREATE TABLE reserva (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero_reserva VARCHAR(50) UNIQUE,
  id_nombre INT NOT NULL,
  id_sala INT NOT NULL,
  id_fecha INT NOT NULL,
  id_hora INT NOT NULL,
  estado ENUM('activa', 'cancelada', 'completada') DEFAULT 'activa',
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_nombre) REFERENCES nombre(id),
  FOREIGN KEY (id_sala) REFERENCES sala(id),
  FOREIGN KEY (id_fecha) REFERENCES fecha(id),
  FOREIGN KEY (id_hora) REFERENCES hora(id)
);

-- Tabla de Préstamos
CREATE TABLE prestamo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_reserva INT NOT NULL,
  id_equipo INT NOT NULL,
  id_sala INT NOT NULL,
  id_nombre INT NOT NULL,
  cantidad_prestada INT DEFAULT 1,
  estado ENUM('prestado', 'devuelto') DEFAULT 'prestado',
  fecha_prestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_devolucion DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_reserva) REFERENCES reserva(id),
  FOREIGN KEY (id_equipo) REFERENCES equipo(id),
  FOREIGN KEY (id_sala) REFERENCES sala(id),
  FOREIGN KEY (id_nombre) REFERENCES nombre(id)
);

-- Insertar datos iniciales
INSERT INTO sala (id, nombre, descripcion, aire_acondicionado, television)
VALUES 
  (1, 'Sala 1', 'Sala con aire acondicionado y televisión', TRUE, TRUE),
  (2, 'Sala 2', 'Sala disponible para videobeam', FALSE, FALSE);

INSERT INTO equipo (id, nombre, descripcion, cantidad, disponible)
VALUES 
  (1, 'Videobeam', 'Proyector portátil', 1, 1),
  (2, 'Aire Acondicionado', 'Sistema de aire acondicionado Sala 1', 1, 0),
  (3, 'Televisión', 'TV LED 55 pulgadas Sala 1', 1, 0);

-- Procedimiento almacenado para actualizar reservas pasadas automáticamente
DELIMITER $$
CREATE PROCEDURE actualizar_reservas_pasadas()
BEGIN
  DECLARE fecha_hoy DATE;
  DECLARE hora_actual TIME;
  
  SET fecha_hoy = CURDATE();
  SET hora_actual = CURTIME();
  
  -- Actualizar reservas de días anteriores
  UPDATE reserva r
  JOIN fecha f ON r.id_fecha = f.id
  SET r.estado = 'completada'
  WHERE r.estado = 'activa' 
    AND f.fecha_reserva < fecha_hoy;
  
  -- Actualizar reservas de hoy cuya hora ya pasó
  UPDATE reserva r
  JOIN fecha f ON r.id_fecha = f.id
  JOIN hora h ON r.id_hora = h.id
  SET r.estado = 'completada'
  WHERE r.estado = 'activa' 
    AND f.fecha_reserva = fecha_hoy
    AND h.hora_fin < hora_actual;
END$$
DELIMITER ;

-- Evento programado para ejecutar cada hora (requiere event_scheduler activo)
CREATE EVENT IF NOT EXISTS actualizar_estados_reservas
ON SCHEDULE EVERY 1 HOUR
DO
  CALL actualizar_reservas_pasadas();

-- fctivar el programador de eventos
SET GLOBAL event_scheduler = ON;
