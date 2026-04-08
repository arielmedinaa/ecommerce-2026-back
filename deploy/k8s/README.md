# Documentación del Clúster de Kubernetes

Bienvenido a la documentación de infraestructura para E-commerce 2026. Este manual detalla cómo utilizar Kubernetes para orquestar la arquitectura de microservicios y el API Gateway del proyecto.

> **Consideraciones según tus comentarios:**
> - Se eliminó la dependencia a Kafka, ya que se usan los TCP/Eventos nativos de NestJS.
> - Se diseñó para que corra fácilmente de forma local usando MiniKube.
> - Se estructuró la guía pensando de cero a experto en AWS EKS para producción.
> - El manejo de base de datos asume RDS futuro y se configura mediante `.env` (ConfigMaps).

## Arquitectura General

1. **Ingresso Externo**: Usamos \`nginx-ingress\` como punto de entrada.
2. **API Gateway**: El microservicio \`api-gateway\` recibe el tráfico HTTPS y rutea al backend.
3. **Backend NestJS**: \`auth\`, \`cart\`, \`content\`, \`image\`, \`payments\` y \`products\` se hablan de forma nativa a través de los DNS internos del clúster de K8s.
4. **Almacenamiento**:
   - Imágenes: Se usarán AWS S3 servidos a través de CloudFront.
   - Datos: Bases MariaDB en RDS.
5. **Autoscaling Capa Infra**: **Karpenter** autogestiona el tamaño de los Nodos (servidores virtuales EC2).
6. **Autoscaling Capa App**: **HPA** autoescala la cantidad de Pods (contenedores) según el consumo de memoria/cpu.

---

## 1. Entorno de Desarrollo (Local con Minikube)

El entorno local (`/dev`) requiere que tengas iniciado \`minikube\` y habilitado el Ingress NGINX.

### Requisitos
- **Podman** y **Minikube** instalados.
- **Kubectl** disponible en CLI.

### Instrucciones de Despliegue Local

1. Start de minikube y habilita el addon de NGINX Ingress:
   ```bash
   minikube start --driver=podman --memory 4096 --cpus 4
   minikube addons enable ingress
   ```

2. Aplicar la configuración completa:
   ```bash
   # Dentro de esta carpeta (/deploy/k8s)
   kubectl apply -f dev/configmap.yaml
   
   # Despliega todos los microservicios:
   kubectl apply -f dev/auth.yaml
   kubectl apply -f dev/cart.yaml
   kubectl apply -f dev/content.yaml
   kubectl apply -f dev/image.yaml
   kubectl apply -f dev/payments.yaml
   kubectl apply -f dev/products.yaml
   
   # Despliega el API Gateway (Y el ingress Nginx)
   kubectl apply -f dev/api-gateway.yaml
   kubectl apply -f dev/ingress.yaml
   ```

3. Exponer y Testear:
   Para que minikube exponga el dominio en tu máquina local puedes usar:
   ```bash
   minikube tunnel
   ```
   *Y asegurarte de que \`api.ecommerce.local\` apunte a \`127.0.0.1\` en tu `/etc/hosts`.*

---

## 2. Entorno de Producción (AWS EKS + Karpenter)

El directorio `prod/` incluye configuraciones robustas: HPA, peticiones (Requests) y límites (Limits) estrictos, y los pods no se crearán si no hay espacio, lo que gatilla que Karpenter provea servidores automáticamente.

### A. Preparación del Clúster en AWS (Resumen Cero a Experto)
Asumiendo conocimientos nulos, AWS usa la herramienta `eksctl`.

1. **Crear Clúster y Nodos Básicos:**
   ```bash
   eksctl create cluster -f mi-cluster-eks.yaml
   ```
   *(Nota: Deberás tener un minicluster Fargate o NodeGroup inicial donde instalar Karpenter).*

2. **Bases de Datos Gestionadas AWS (RDS)**:
   - Crear una base MariaDB en el panel web de AWS RDS.
   - Copiar la URL de conexión.
   - Reemplazar las variables dentro de \`prod/configmap.yaml\` y \`prod/secrets.yaml\`.

### B. Despliegue con Karpenter
Karpenter lee dos recursos principales:
- **`NodeClass`**: Configura la Red (Subnets de AWS), Grupos de Seguridad (Firewalls).
- **`NodePool`**: Define si usar instancias baratas (Spot), o estables (On-Demand), familias de AWS, y reglas.

```bash
kubectl apply -f karpenter/node-class.yaml
kubectl apply -f karpenter/node-pool.yaml
```

### C. Despliegue de los Microservicios de Producción

1. Crear un espacio de nombres (Namespace):
   ```bash
   kubectl create namespace ecommerce-prod
   kubectl config set-context --current --namespace=ecommerce-prod
   ```

2. Aplicar ConfigMaps y Secretos (Previamente colocar aquí el Host de las bases de datos RDS y S3 Tokens):
   ```bash
   kubectl apply -f prod/configmap.yaml
   # kubectl apply -f prod/secrets.yaml (Si configuraste tus contraseñas base64)
   ```

3. Instalar aplicaciones y su escalado:
   ```bash
   kubectl apply -f prod/
   ```

### D. ¿Cómo escala esto automáticamente en Prod?
1. Hay una lluvia de tráfico (Black Friday).
2. El **HPA** de Prod (Horizontal Pod Autoscaler) detecta que tu Pod de `productos` está gastando más del 70% de su CPU.
3. **HPA** solicita a Kubernetes 3 Pods "Clones" adicionales.
4. Kubernetes comprueba que no hay suficiente espacio (RAM/CPU) en los servidores físicos actuales que tengas y los deja "Pendientes".
5. **Karpenter** entra en acción: ve que hay 3 pods buscando alojamiento, contacta a la API de AWS, prende una instancia EC2 del tamaño preciso (ahorrando costos) en 40 segundos.,
6. Los pods se inician en el nuevo nodo y el tráfico de carga fluye balanceado por NGINX.
