# Image de base Python pour API backend
FROM python:3.11-alpine

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système nécessaires
RUN apk add --no-cache gcc musl-dev

# Copier les fichiers de requirements (si ils existent)
COPY requirements.txt* ./

# Installer les dépendances Python (si requirements.txt existe)
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# Installer Flask pour une API basique
RUN pip install --no-cache-dir flask flask-cors

# Copier le code source
COPY . .

# Créer un fichier app.py basique si il n'existe pas
RUN if [ ! -f app.py ]; then \
    echo "from flask import Flask, jsonify" > app.py && \
    echo "from flask_cors import CORS" >> app.py && \
    echo "" >> app.py && \
    echo "app = Flask(__name__)" >> app.py && \
    echo "CORS(app)" >> app.py && \
    echo "" >> app.py && \
    echo "@app.route('/api/health')" >> app.py && \
    echo "def health():" >> app.py && \
    echo "    return jsonify({'status': 'Backend is running!'})" >> app.py && \
    echo "" >> app.py && \
    echo "@app.route('/api/game/status')" >> app.py && \
    echo "def game_status():" >> app.py && \
    echo "    return jsonify({'game': 'pong', 'status': 'ready'})" >> app.py && \
    echo "" >> app.py && \
    echo "if __name__ == '__main__':" >> app.py && \
    echo "    app.run(host='0.0.0.0', port=8000, debug=True)" >> app.py; \
    fi

# Exposer le port 8000
EXPOSE 8000

# Commande pour démarrer l'application
CMD ["python", "app.py"]