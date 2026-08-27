/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `ecommerce` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `ecommerce`;
DROP TABLE IF EXISTS `banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `banners` (
  `id` varchar(36) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `imagen` varchar(255) NOT NULL,
  `variante` varchar(255) NOT NULL,
  `formato` varchar(255) NOT NULL DEFAULT 'webp',
  `ruta` varchar(255) NOT NULL,
  `estado` varchar(255) NOT NULL,
  `creadoPor` varchar(255) NOT NULL,
  `modificadoPor` varchar(255) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `dimensiones` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dimensiones`)),
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_2b1e067022f636f402ab2b33ac` (`nombre`),
  KEY `IDX_376e72d9401d481de5b5225457` (`updatedAt`),
  KEY `IDX_d52a0231b4cacd32973dce5df8` (`createdAt`),
  KEY `IDX_7f8f435dcaa8ea85de4ba190ac` (`modificadoPor`),
  KEY `IDX_e0d151c2c38e8ac308814369d9` (`creadoPor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `carritos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `carritos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` int(11) NOT NULL,
  `proceso` varchar(255) DEFAULT NULL,
  `tiempo` varchar(255) DEFAULT NULL,
  `estado` varchar(255) NOT NULL,
  `finished` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `cliente` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cliente`)),
  `transaccion` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`transaccion`)),
  `seguimiento` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`seguimiento`)),
  `envio` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`envio`)),
  `pago` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pago`)),
  `articulos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`articulos`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8f437e6be778f75db7bef5194b` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cupones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cupones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipoDescuento` enum('PORCENTAJE','MONTO_FIJO') NOT NULL DEFAULT 'PORCENTAJE',
  `valorDescuento` decimal(10,2) NOT NULL,
  `porcentajeDescuento` decimal(5,2) NOT NULL DEFAULT 0.00,
  `montoMinimoCompra` decimal(12,2) NOT NULL DEFAULT 0.00,
  `fechaInicio` timestamp NOT NULL,
  `fechaFin` timestamp NOT NULL,
  `limiteUsos` int(11) NOT NULL DEFAULT 0,
  `limiteUsuario` int(11) NOT NULL DEFAULT 0,
  `usosActuales` int(11) NOT NULL DEFAULT 0,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_5e11e0e4e948543f97ed85d457` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cupones_por_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cupones_por_producto` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cuponId` int(11) NOT NULL,
  `codigoCupon` varchar(255) NOT NULL,
  `productoId` int(11) NOT NULL,
  `codigoProducto` varchar(255) NOT NULL,
  `limiteUsos` int(11) NOT NULL DEFAULT 0,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `FK_258d19fd79ac242e4a957157947` (`cuponId`),
  CONSTRAINT `FK_258d19fd79ac242e4a957157947` FOREIGN KEY (`cuponId`) REFERENCES `cupones` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fechaInicio` timestamp NOT NULL,
  `fechaFin` timestamp NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `codigo` varchar(50) DEFAULT NULL,
  `idCupon` int(11) DEFAULT NULL,
  `limiteGlobalPorUsuario` int(11) DEFAULT NULL,
  `beneficioUsuarioEspecifico` text DEFAULT NULL,
  `prioridad` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `idEventoPadre` int(11) DEFAULT NULL,
  `idPromo` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_9b4bc064a9089acef099d8335d` (`nombre`),
  KEY `FK_4946349df104ac04327812628a8` (`idEventoPadre`),
  CONSTRAINT `FK_4946349df104ac04327812628a8` FOREIGN KEY (`idEventoPadre`) REFERENCES `eventos` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eventos_condiciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_condiciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `evento_id` int(11) NOT NULL,
  `tipo` enum('MIN_CARRITO','MAX_UNIDADES_PEDIDO','SOLO_NUEVOS_USUARIOS','METODO_PAGO_ESPECIFICO') NOT NULL,
  `valor` varchar(255) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `FK_7a43b32126badede4542221abe8` (`evento_id`),
  CONSTRAINT `FK_7a43b32126badede4542221abe8` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eventos_productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `evento_id` int(11) NOT NULL,
  `producto_codigo` varchar(50) NOT NULL,
  `limitePorUsuario` int(11) DEFAULT NULL,
  `precioOferta` decimal(12,2) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `FK_a33dc971f35a9f48f82a7116b86` (`evento_id`),
  CONSTRAINT `FK_a33dc971f35a9f48f82a7116b86` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `formatos_landing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `formatos_landing` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `template` longtext NOT NULL,
  `type` enum('html','react','jsx') NOT NULL DEFAULT 'html',
  `category` varchar(255) NOT NULL,
  `tags` text DEFAULT NULL,
  `preview` text DEFAULT NULL,
  `config` text DEFAULT NULL,
  `variables` text DEFAULT NULL,
  `isActive` tinyint(4) NOT NULL DEFAULT 1,
  `isPremium` tinyint(4) NOT NULL DEFAULT 0,
  `usageCount` int(11) NOT NULL DEFAULT 0,
  `createdBy` varchar(255) NOT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `documentation` text DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_fae0b4128d3e9f056c7b26c719` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `home_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_sections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(80) NOT NULL,
  `type` varchar(30) NOT NULL,
  `orden` int(11) NOT NULL DEFAULT 0,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `titulo` varchar(120) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_942a6716a94174207fa4f7d278` (`key`),
  KEY `IDX_ba5ea995f295c0e5cd9bb0d085` (`activo`,`orden`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `intentos_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `intentos_pago` (
  `id` varchar(36) NOT NULL,
  `id_transaccion` varchar(100) NOT NULL,
  `codigo_carrito` int(11) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `metodo_pago` varchar(50) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `moneda` varchar(10) NOT NULL DEFAULT 'PYG',
  `descripcion` text DEFAULT NULL,
  `carrito` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`carrito`)),
  `cliente` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`cliente`)),
  `metadatos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`metadatos`)),
  `respuesta_pagopar` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`respuesta_pagopar`)),
  `respuesta_bancard` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`respuesta_bancard`)),
  `motivo_fallo` text DEFAULT NULL,
  `intentos_reintento` int(11) NOT NULL DEFAULT 0,
  `ultimo_error` text DEFAULT NULL,
  `proximo_reintento` datetime DEFAULT NULL,
  `expira_en` datetime DEFAULT NULL,
  `creado_en` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `actualizado_en` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_5f5f2bf82801e44f0e4b73e10b` (`id_transaccion`),
  KEY `IDX_01cb022f180522473f5b1876be` (`estado`),
  KEY `IDX_2950d949e4b5c9100a36d7a19f` (`codigo_carrito`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `landings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `landings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `createdBy` varchar(255) NOT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `isActive` tinyint(4) NOT NULL DEFAULT 1,
  `isPublished` tinyint(4) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `metaTitle` varchar(255) DEFAULT NULL,
  `metaDescription` text DEFAULT NULL,
  `metaKeywords` text DEFAULT NULL,
  `viewCount` int(11) NOT NULL DEFAULT 0,
  `tags` text DEFAULT NULL,
  `publicadoEn` timestamp NULL DEFAULT NULL,
  `expiraEn` timestamp NULL DEFAULT NULL,
  `tituloRelacionado` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `customStyles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customStyles`)),
  `customScripts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customScripts`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_0d611b38803f7326ff5e49c109` (`title`),
  UNIQUE KEY `IDX_ceaa66091c70c8fb0975720f63` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `llaves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `llaves` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `llave` varchar(255) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_513acf0d334a63b0fc95ec28a6` (`llave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `logs_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs_banners` (
  `id` varchar(36) NOT NULL,
  `bannerId` varchar(255) NOT NULL,
  `errorCode` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `stackTrace` text DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `operation` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `fileName` varchar(255) DEFAULT NULL,
  `device` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context`)),
  PRIMARY KEY (`id`),
  KEY `IDX_72452f811deebad74410c9d44f` (`bannerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `logs_carritos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs_carritos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cartId` varchar(255) NOT NULL,
  `errorCode` varchar(255) NOT NULL,
  `message` varchar(255) NOT NULL,
  `stackTrace` text DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context`)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `logs_landings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs_landings` (
  `id` varchar(36) NOT NULL,
  `landingId` varchar(255) DEFAULT NULL,
  `errorCode` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `stackTrace` longtext DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `operation` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context`)),
  `requestPayload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`requestPayload`)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo` varchar(100) NOT NULL,
  `destinatario_tipo` varchar(20) NOT NULL,
  `id_proveedor` int(11) DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `leido` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_notifications_dest` (`destinatario_tipo`,`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ofertas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ofertas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tiempoActivo` decimal(10,2) NOT NULL,
  `createdBy` varchar(255) NOT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `combosHabilitado` tinyint(1) NOT NULL DEFAULT 0,
  `comboDescuento` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ordenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) NOT NULL,
  `carrito_codigo` int(11) NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `evento_id` varchar(50) DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `fecha_actualizacion` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `cliente_documento` varchar(700) NOT NULL,
  `datos_envio` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_envio`)),
  `datos_pago` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_pago`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_12fab9892d22718370d6dccf6d` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ordenes_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orden_id` int(11) NOT NULL,
  `producto_codigo` varchar(255) NOT NULL,
  `producto_nombre` varchar(255) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `evento_id` int(11) DEFAULT NULL,
  `combo_id` int(11) DEFAULT NULL,
  `combo_detalle` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`combo_detalle`)),
  `fecha_creacion` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `FK_17c4db936bfff130b908c2a5c8f` (`orden_id`),
  CONSTRAINT `FK_17c4db936bfff130b908c2a5c8f` FOREIGN KEY (`orden_id`) REFERENCES `ordenes` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_carrito` int(11) NOT NULL,
  `carrito` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`carrito`)),
  `estado` varchar(20) NOT NULL,
  `metodoPago` varchar(50) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `moneda` varchar(10) NOT NULL DEFAULT 'PYG',
  `respuestaPagopar` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`respuestaPagopar`)),
  `respuestaBancard` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`respuestaBancard`)),
  `idTransaccion` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `cliente` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`cliente`)),
  `metadatos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`metadatos`)),
  `finalizado` datetime DEFAULT NULL,
  `motivoFallo` text DEFAULT NULL,
  `intentosReintentar` int(11) NOT NULL DEFAULT 0,
  `proximoReintento` datetime DEFAULT NULL,
  `reembolsos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]' CHECK (json_valid(`reembolsos`)),
  `procesado` datetime DEFAULT NULL,
  `expira` datetime DEFAULT NULL,
  `finalizadoFlag` tinyint(4) NOT NULL DEFAULT 0,
  `procesadoFlag` tinyint(4) NOT NULL DEFAULT 0,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `producto_ofertas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto_ofertas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_articulo` varchar(255) NOT NULL,
  `nombre_articulo` varchar(255) NOT NULL,
  `tiempoActivo` decimal(10,2) DEFAULT NULL,
  `descuento` decimal(10,2) DEFAULT NULL,
  `precioContado` decimal(10,2) NOT NULL,
  `precioCredito` decimal(10,2) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `prioridad` decimal(10,2) NOT NULL DEFAULT 0.00,
  `ofertaId` int(11) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `cuotas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cuotas`)),
  PRIMARY KEY (`id`),
  KEY `FK_891a98aab249c2b0f95d7f765a8` (`ofertaId`),
  CONSTRAINT `FK_891a98aab249c2b0f95d7f765a8` FOREIGN KEY (`ofertaId`) REFERENCES `ofertas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=319 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `productos_imagenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos_imagenes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `producto_codigo` varchar(255) NOT NULL,
  `url_imagen` varchar(255) NOT NULL,
  `nombre_archivo` varchar(255) DEFAULT NULL,
  `orden` int(11) NOT NULL DEFAULT 0,
  `principal` tinyint(4) NOT NULL DEFAULT 0,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `productos_sello`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos_sello` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `producto_codigo` varchar(255) NOT NULL,
  `url_sello` varchar(255) NOT NULL,
  `nombre_archivo` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `fecha_desde` datetime DEFAULT NULL,
  `fecha_hasta` datetime DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_producto_codigo` (`producto_codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products_excel_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products_excel_historial` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_proveedor` int(11) NOT NULL,
  `nombre_archivo_original` varchar(255) NOT NULL,
  `storage_key` varchar(500) DEFAULT NULL,
  `total_filas` int(11) NOT NULL DEFAULT 0,
  `aceptados` int(11) NOT NULL DEFAULT 0,
  `rechazados` int(11) NOT NULL DEFAULT 0,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `estado` varchar(20) NOT NULL DEFAULT 'procesando',
  `procesados` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `IDX_products_excel_historial_id_proveedor` (`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products_excel_historial_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products_excel_historial_detalle` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_historial_excel` int(11) NOT NULL,
  `fila` int(11) NOT NULL,
  `aceptado` tinyint(1) NOT NULL,
  `codigo_articulo` varchar(255) DEFAULT NULL,
  `codigo_error` int(11) DEFAULT NULL,
  `motivo` varchar(500) DEFAULT NULL,
  `solucion` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `datos_fila` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_products_excel_historial_detalle_id_historial` (`id_historial_excel`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products_sellers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products_sellers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_articulo` varchar(255) NOT NULL,
  `codigo_proveedor_interno` varchar(255) DEFAULT NULL,
  `nombre_articulo` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `codigo_marca` varchar(255) DEFAULT NULL,
  `marca_texto_original` varchar(255) DEFAULT NULL,
  `marca_sugerida` varchar(255) DEFAULT NULL,
  `requiere_revision_marca` tinyint(4) NOT NULL DEFAULT 0,
  `codigo_categoria` varchar(255) DEFAULT NULL,
  `codigo_subcategoria` varchar(255) DEFAULT NULL,
  `requiere_revision_categoria` tinyint(4) NOT NULL DEFAULT 0,
  `precioventa` decimal(15,2) NOT NULL,
  `precio_sugerido` decimal(15,2) DEFAULT NULL,
  `codigo_de_barra` varchar(255) DEFAULT NULL,
  `stock_actual` int(11) NOT NULL DEFAULT 0,
  `imagen_1` varchar(500) NOT NULL,
  `imagen_2` varchar(500) DEFAULT NULL,
  `imagen_3` varchar(500) DEFAULT NULL,
  `imagen_4` varchar(500) DEFAULT NULL,
  `imagen_5` varchar(500) DEFAULT NULL,
  `id_proveedor` int(11) NOT NULL,
  `id_historial_excel` int(11) DEFAULT NULL,
  `estado` varchar(50) NOT NULL DEFAULT 'pendiente',
  `motivo_rechazo` varchar(500) DEFAULT NULL,
  `codigo_rechazo` int(11) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_products_sellers_codigo_articulo` (`codigo_articulo`),
  KEY `IDX_products_sellers_estado` (`estado`),
  KEY `IDX_products_sellers_id_proveedor` (`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promociones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `promociones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fechaInicio` timestamp NOT NULL,
  `fechaFin` timestamp NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `landingId` int(11) DEFAULT NULL,
  `order` int(11) NOT NULL DEFAULT 0,
  `url` varchar(255) DEFAULT NULL,
  `eventId` int(11) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `banners` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`banners`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_3096a42b4f0df491b3200c5202` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promociones_productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `promociones_productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `promoId` int(11) NOT NULL,
  `producto_codigo` varchar(64) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `viewCount` int(11) NOT NULL DEFAULT 0,
  `soldCount` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_e4a7cfdc7eb380175137dc54e0` (`promoId`,`producto_codigo`),
  KEY `IDX_cc7a8bb98ad5c4740e0ecbb3ad` (`promoId`),
  KEY `IDX_b05e922d7b326d093e4d30ee11` (`producto_codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promociones_visitas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `promociones_visitas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `promoId` int(11) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `visitedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_d8b2a7f556e6e9ef214a05cdb4` (`promoId`),
  KEY `IDX_58f1778d17e1167f68ad98f16f` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proveedor_api_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedor_api_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_proveedor` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_proveedor_api_tokens_id_proveedor` (`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proveedor_documentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedor_documentos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_proveedor` int(11) NOT NULL,
  `nombre_archivo` varchar(255) NOT NULL,
  `content_type` varchar(255) NOT NULL,
  `s3_key` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_proveedor_documentos_id_proveedor` (`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `ruc` varchar(255) DEFAULT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_proveedores_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `push_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `destinatario_tipo` varchar(20) NOT NULL,
  `id_proveedor` int(11) DEFAULT NULL,
  `endpoint` text NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_push_subscriptions_destinatario` (`destinatario_tipo`,`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `search_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `search_terms` (
  `termino` varchar(160) NOT NULL,
  `total` int(11) NOT NULL DEFAULT 0,
  `ultimo_resultados` int(11) NOT NULL DEFAULT 0,
  `ultima_vez` datetime DEFAULT NULL,
  PRIMARY KEY (`termino`),
  KEY `idx_total` (`total`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transacciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transacciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` int(11) NOT NULL,
  `tipo` varchar(255) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `estado` int(11) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `datos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos`)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(500) NOT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `numeroCelular` varchar(255) DEFAULT '',
  `numeroDocumento` varchar(20) DEFAULT '',
  `avatar` varchar(255) DEFAULT NULL,
  `proveedor` varchar(255) NOT NULL,
  `idProveedor` varchar(500) NOT NULL,
  `estaActivo` tinyint(4) NOT NULL DEFAULT 1,
  `ultimoInicioSesion` datetime DEFAULT NULL,
  `esInvitado` tinyint(4) NOT NULL DEFAULT 0,
  `perfil` varchar(255) NOT NULL DEFAULT 'cliente',
  `fechaExpiracion` datetime DEFAULT NULL,
  `etiquetas` text DEFAULT 'NUEVO_USUARIO',
  `fechaCreacion` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `fechaActualizacion` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `beneficioUsuario` varchar(255) NOT NULL DEFAULT 'NUEVO_USUARIO',
  `infoDispositivo` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`infoDispositivo`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_446adfc18b35418aac32ae0b7b` (`email`),
  UNIQUE KEY `IDX_caf5ec0939d49fdda4d2b9c14d` (`idProveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuarios_cupones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios_cupones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `idCupon` int(11) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `eventId` varchar(100) DEFAULT NULL,
  `isActive` tinyint(4) NOT NULL DEFAULT 0,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `userId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_6d3d27abffb401ccf5ee8880fdd` (`userId`),
  CONSTRAINT `FK_6d3d27abffb401ccf5ee8880fdd` FOREIGN KEY (`userId`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `verticales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `verticales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `combos` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `combos`;
DROP TABLE IF EXISTS `cms_combo_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_combo_detalles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigoArticulo` varchar(255) NOT NULL,
  `nombreArticulo` varchar(255) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `comboId` int(11) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `IDX_cms_combo_detalles_comboId` (`comboId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cms_combos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_combos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precioVenta` decimal(10,2) NOT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `categoria` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `fechaDesde` datetime DEFAULT NULL,
  `fechaHasta` datetime DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `econt_combo_imagenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `econt_combo_imagenes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `idCombo` int(11) NOT NULL,
  `imagen` varchar(500) NOT NULL,
  `orden` int(11) NOT NULL DEFAULT 0,
  `updatedBy` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_id_combo` (`idCombo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

