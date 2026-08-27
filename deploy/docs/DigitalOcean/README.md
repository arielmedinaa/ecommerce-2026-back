# Infraestructura en DigitalOcean — Guía operativa

Esta carpeta documenta cómo funciona **de verdad** el despliegue del backend en producción sobre DigitalOcean. No es un diseño aspiracional: es el runbook de lo que efectivamente corre hoy, incluyendo los procesos manuales, las decisiones tomadas bajo presión y los problemas ya conocidos.

> Si estás por tocar producción por primera vez, leé en orden: `01` → `02` → `03`. Guardá `04` para cuando algo se rompa.

## Índice

1. [**01-infraestructura.md**](./01-infraestructura.md) — Droplets, red, servicios, dónde vive cada cosa.
2. [**02-despliegue.md**](./02-despliegue.md) — Cómo se construye y despliega una imagen nueva, paso a paso, en los dos entornos (Podman y Kubernetes).
3. [**03-pruebas-y-verificacion.md**](./03-pruebas-y-verificacion.md) — Cómo verificar que un cambio realmente funciona antes/después de desplegar, incluida la prueba de carga.
4. [**04-troubleshooting.md**](./04-troubleshooting.md) — Problemas recurrentes ya identificados, su causa raíz y cómo diagnosticarlos rápido.
5. [**05-almacenamiento-imagenes.md**](./05-almacenamiento-imagenes.md) — Cómo funciona el storage de imágenes (banners, productos) en DigitalOcean Spaces.

## Resumen de una línea

Hay **dos copias vivas** del backend corriendo en el mismo droplet principal: una en **Podman** (`docker-compose`, el stack original, hoy legado) y otra en un **cluster de Kubernetes de 3 nodos** (el que realmente atiende el tráfico público, vía nginx a nivel de host). No hay CI/CD ni registry de imágenes: todo el despliegue es manual, con `podman build` + `podman save` + `ctr images import` copiado a mano a cada nodo. Es lento y humano-dependiente a propósito de cómo evolucionó el proyecto — lo documentamos acá para que sea repetible sin tener que re-descubrirlo cada vez.

## Por qué existe este documento

Esta semana, en producción real (ya con ~800 empleados de CentralShop probando el sitio), tuvimos que diagnosticar y resolver en caliente: timeouts en cascada por llamadas sin límite de tiempo a un ERP externo, pérdida de imágenes por un bucket S3 efímero que no persistía, un bug de resiliencia que en realidad no reintentaba nada, y falta de espacio en disco por acumulación de imágenes Docker sin limpiar. Todo eso dejó un patrón de diagnóstico y un checklist de despliegue que vale la pena dejar por escrito en vez de que viva solo en el historial de una conversación.
