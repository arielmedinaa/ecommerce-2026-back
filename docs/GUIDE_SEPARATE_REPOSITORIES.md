# Guía de Separación de Microservicios a Repositorios Individuales

## 🎯 **Objetivo**

Separar cada microservicio a su propio repositorio manteniendo la capacidad de trabajar con todos juntos cuando sea necesario.

## 🔄 **Estrategias Disponibles**

### **Opción 1: Git Submodules (Recomendada)**
- **Ventajas**: Mantiene monorepo + repos individuales
- **Ideal para**: Equipo que necesita ambos modos de trabajo

### **Opción 2: Repositorios Puros**
- **Ventajas**: Total independencia
- **Ideal para**: Equipos completamente distribuidos

### **Opción 3: Monorepo con Scripts**
- **Ventajas**: Sin cambios en estructura Git
- **Ideal para**: Transición gradual

---

## 🚀 **Opción 1: Git Submodules**

### **Paso 1: Crear Repositorios Individuales**

```bash
# 1. Crear repositorios en GitHub (manualmente)
# - ecommerce-auth-service
# - ecommerce-cart-service  
# - ecommerce-content-service
# - ecommerce-image-service
# - ecommerce-payments-service
# - ecommerce-products-service
# - ecommerce-orders-service
```

### **Paso 2: Configurar Submodules**

```bash
# Desde el monorepo principal
cd /Users/hola/Documents/projects/newEcommerce2026/ecommerce-2026-back

# Agregar cada servicio como submodule
git submodule add https://github.com/arielmedinaa/ecommerce-auth-service.git microservices/auth
git submodule add https://github.com/arielmedinaa/ecommerce-cart-service.git microservices/cart
git submodule add https://github.com/arielmedinaa/ecommerce-content-service.git microservices/content
git submodule add https://github.com/arielmedinaa/ecommerce-image-service.git microservices/image
git submodule add https://github.com/arielmedinaa/ecommerce-payments-service.git microservices/payments
git submodule add https://github.com/arielmedinaa/ecommerce-products-service.git microservices/products
git submodule add https://github.com/arielmedinaa/ecommerce-orders-service.git microservices/orders

# Inicializar submodules
git submodule update --init --recursive
```

### **Paso 3: Mover Archivos a Submodules**

```bash
# Para cada servicio
cd microservices/auth

# Copiar archivos del monorepo al submodule
cp -r ../auth/* ./
cp -r ../../shared ./shared

# Configurar package.json independiente
# (ya debería existir de nuestros cambios anteriores)

# Hacer commit en el submodule
git add .
git commit -m "🎉 Migrar servicio auth a repositorio independiente"
git push origin main

# Volver al monorepo y hacer commit del cambio
cd ../../
git add microservices/auth
git commit -m "📦 Agregar auth como submodule"
git push origin main
```

### **Paso 4: Flujo de Trabajo**

#### **Desarrollo Individual (Un Servicio)**
```bash
# Clonar solo un servicio
git clone https://github.com/arielmedinaa/ecommerce-auth-service.git
cd ecommerce-auth-service

# Trabajar normalmente
npm install
npm run start:dev

# Hacer cambios y push
git add .
git commit -m "✨ Nueva feature en auth"
git push origin main
```

#### **Desarrollo Completo (Todos los Servicios)**
```bash
# Clonar monorepo con todos los submodules
git clone --recurse-submodules https://github.com/arielmedinaa/ecommerce-2026-back.git
cd ecommerce-2026-back

# Actualizar todos los submodules
git submodule update --remote --merge

# Trabajar con todos los servicios
docker-compose up --build

# Actualizar un servicio específico
cd microservices/auth
git pull origin main
cd ../../
git add microservices/auth
git commit -m "📦 Actualizar auth submodule"
git push origin main
```

---

## 🔄 **Opción 2: Repositorios Puros**

### **Paso 1: Script de Migración**

```bash
#!/bin/bash
# migrate-to-individual-repos.sh

SERVICES=("auth" "cart" "content" "image" "payments" "products" "orders")

for service in "${SERVICES[@]}"; do
    echo "🚀 Migrando $service a repositorio independiente..."
    
    # 1. Crear directorio temporal
    mkdir -p temp/$service
    
    # 2. Copiar archivos del servicio
    cp -r microservices/$service/* temp/$service/
    cp -r shared temp/$service/shared
    
    # 3. Crear repositorio nuevo
    cd temp/$service
    git init
    git add .
    git commit -m "🎉 Inicializar servicio $service"
    
    # 4. Agregar remote y push
    git remote add origin https://github.com/arielmedinaa/ecommerce-$service-service.git
    git push -u origin main
    
    cd ../../
    
    echo "✅ $service migrado exitosamente"
done
```

### **Paso 2: Configurar Comunicación**

```bash
# En cada servicio independiente, configurar URLs de otros servicios
# .env.example
RUN_MODE=single
AUTH_SERVICE_URL=http://localhost:3101
CART_SERVICE_URL=http://localhost:3102
# ... etc
```

---

## 🔄 **Opción 3: Monorepo con Scripts**

### **Paso 1: Scripts de Extracción**

```bash
#!/bin/bash
# extract-service.sh

SERVICE_NAME=$1
if [ -z "$SERVICE_NAME" ]; then
    echo "Uso: ./extract-service.sh <nombre-servicio>"
    exit 1
fi

echo "🚀 Extrayendo $SERVICE_NAME..."

# Crear directorio de servicio independiente
mkdir -p ../ecommerce-$SERVICE_NAME-service

# Copiar archivos necesarios
cp -r microservices/$SERVICE_NAME/* ../ecommerce-$SERVICE_NAME-service/
cp -r shared ../ecommerce-$SERVICE_NAME-service/shared

# Copiar archivos de configuración
cp package.json ../ecommerce-$SERVICE_NAME-service/
cp tsconfig.json ../ecommerce-$SERVICE_NAME-service/
cp .env.example ../ecommerce-$SERVICE_NAME-service/

echo "✅ Servicio $SERVICE_NAME extraído en ../ecommerce-$SERVICE_NAME-service"
```

---

## 📋 **Recomendación Personalizada**

### **Para tu Caso Específico:**

**Recomiendo Opción 1 (Git Submodules)** porque:

1. **👥 Flexibilidad para el equipo**: Algunos pueden trabajar en modo individual, otros en modo completo
2. **🔄 Transición suave**: No rompes el flujo actual de inmediato
3. **📦 Mantienes monorepo**: Útil para tu rol de administrador
4. **🚀 Independencia real**: Cada servicio tiene su propio repo

### **Pasos Sugeridos:**

1. **📦 Crear repos vacíos** en GitHub para cada servicio
2. **🔗 Configurar submodules** en el monorepo actual
3. **📁 Mover archivos** de cada servicio a su submodule
4. **🧪 Probar flujo individual** con un servicio primero
5. **🔄 Migrar resto de servicios** gradualmente
6. **📚 Documentar nuevo flujo** para el equipo

### **Estructura Final:**

```
ecommerce-2026-back/ (monorepo principal)
├── .gitmodules
├── microservices/
│   ├── auth/ -> submodule: ecommerce-auth-service.git
│   ├── cart/ -> submodule: ecommerce-cart-service.git
│   ├── content/ -> submodule: ecommerce-content-service.git
│   ├── image/ -> submodule: ecommerce-image-service.git
│   ├── payments/ -> submodule: ecommerce-payments-service.git
│   ├── products/ -> submodule: ecommerce-products-service.git
│   └── orders/ -> submodule: ecommerce-orders-service.git
├── shared/ (compartido)
├── scripts/ (utilidades)
└── deploy/ (configuración global)
```

### **Comandos Útiles:**

```bash
# Actualizar todos los submodules
git submodule update --remote --merge

# Entrar a un servicio
cd microservices/auth
git checkout main
git pull origin main

# Ver status de todos los submodules
git submodule status

# Actualizar un submodule específico
git submodule update --remote microservices/auth
```

¿Quieres que implemente alguna de estas opciones específicamente?
