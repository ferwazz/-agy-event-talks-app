# BigQuery Release Notes Dashboard & Share Portal 🚀

Este proyecto es un agregador moderno y responsivo que procesa el feed XML oficial de las notas de lanzamiento de Google Cloud BigQuery. Permite estructurar de forma granular las actualizaciones del feed, realizar búsquedas rápidas, aplicar filtros específicos por tipo de nota y componer/compartir borradores (individuales o en bloque) directamente en X (Twitter).

El servidor local se ejecuta utilizando **Python Flask**, mientras que la interfaz de usuario está construida con **HTML, CSS y JavaScript Vanilla**, asegurando ligereza y rendimiento.

---

## 💻 Características Principales

* **Desglose Granular de Notas**: En lugar de agrupar todas las notas del mismo día en un bloque masivo, el backend analiza los tags HTML `<h3>` y separa las notas en tarjetas individuales por tipo (**Feature**, **Issue**, **Announcement**, **Deprecated**, **General**).
* **Filtros e Indexación en Tiempo Real**: Filtra instantáneamente por tipo de actualización haciendo clic en los chips correspondientes (con contadores en tiempo real) y realiza búsquedas de texto plano en los títulos, descripciones o fechas.
* **Selección Múltiple (Tweet Digest)**: Permite seleccionar múltiples actualizaciones de la lista. Al hacerlo, aparece un panel flotante inferior que recopila y formatea automáticamente un resumen con viñetas listo para tuitear.
* **Editor y Previsualizador de X/Twitter**: Modal interactivo integrado que previsualiza el tweet resultante, valida el límite estándar de 280 caracteres mediante alertas visuales (naranja/rojo), permite copiar el texto al portapapeles y abre el *Web Intent* oficial de X para publicar de forma segura.
* **Carga Optimizada y Estética Premium**:
  * Diseñado con un tema oscuro moderno, bordes difuminados (glassmorphism) y paleta de colores vibrantes.
  * Implementa **esqueletos de carga animados** (Skeleton Screen) mientras procesa las solicitudes de red.
  * Sistema de caché en memoria de 5 minutos para evitar peticiones redundantes a los servidores de Google, con un bypass manual mediante el botón de **Refresh**.

---

## 🛠️ Tecnologías Utilizadas

* **Backend**: Python 3.9+, Flask, Requests (para peticiones HTTP) y XML ElementTree (parser nativo).
* **Frontend**: Vanilla HTML5, CSS3 y JavaScript ES6+.
* **Icons**: Diseños vectoriales integrados inline mediante SVG (sin dependencias de librerías pesadas externas).

---

## 📁 Estructura del Proyecto

```text
agy-event-talks-app/
│
├── app.py                 # Servidor backend de Flask, lógica del parser XML y caché
├── .gitignore             # Reglas de exclusión para Git (caché, entornos virtuales, IDEs)
├── README.md              # Documentación general del proyecto
│
├── templates/
│   └── index.html         # Interfaz de usuario estructurada en HTML5
│
└── static/
    ├── css/
    │   └── style.css      # Hoja de estilos con variables de diseño, tema oscuro y animaciones
    └── js/
        └── app.js         # Lógica frontend: controladores de estado, filtros, selección y X intent
```

---

## 🚀 Instalación y Ejecución

Sigue estos pasos para ejecutar la aplicación en tu entorno local:

### 1. Clonar el repositorio
```bash
git clone https://github.com/ferwazz/-agy-event-talks-app.git
cd -agy-event-talks-app
```

### 2. Instalar dependencias
Asegúrate de contar con Flask y Requests en tu entorno de Python:
```bash
pip install flask requests
```

### 3. Iniciar la aplicación
Ejecuta el servidor de Flask:
```bash
python app.py
```
*Nota: Si estás en Windows y utilizas el lanzador por defecto, puedes ejecutarlo con:*
```bash
py app.py
```

### 4. Abrir en el navegador
Una vez iniciado, abre tu navegador e ingresa a la siguiente dirección:
👉 **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 🔧 Solución de Problemas (SSL en Windows / Anaconda)

En sistemas Windows con instalaciones de Anaconda, ejecutar scripts de Python fuera del prompt de Anaconda suele provocar un error al importar el módulo SSL (`SSLError: Can't connect to HTTPS URL because the SSL module is not available`).

Para solucionar esto, el archivo `app.py` contiene una rutina de inicio que busca automáticamente la ruta de las DLLs de OpenSSL (`Library/bin`) y la agrega dinámicamente al `PATH` del sistema durante la ejecución del servidor:

```python
# app.py
anaconda_path = r"C:\Users\hola_\anaconda3\Library\bin"
if os.path.exists(anaconda_path):
    os.environ["PATH"] = anaconda_path + os.pathsep + os.environ["PATH"]
```

Si tu instalación de Anaconda se encuentra en un directorio de usuario diferente, puedes ajustar la variable `anaconda_path` en la línea 5 de `app.py`.
