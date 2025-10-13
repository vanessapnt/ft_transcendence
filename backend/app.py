from flask import Flask, jsonify, request
from flask_cors import CORS

from flask_sqlalchemy import SQLAlchemy
import os
from flask import session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

# Configuration SQLite - Simple et fonctionnelle
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///transcendence.db'  # Fichier dans /app/
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Init database
db = SQLAlchemy(app)

# User
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id': self.id, 'username': self.username}

# Tables - Initialisation simple
with app.app_context():
    try:
        db.create_all()
        print("✅ Base de données SQLite initialisée avec succès !")
        print(f"📁 Emplacement : {app.config['SQLALCHEMY_DATABASE_URI']}")
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation : {e}")

@app.route('/api/health')
def health():
    return jsonify({'status': 'Backend is running!'})

@app.route('/api/game/status')
def game_status():
    return jsonify({'game': 'pong', 'status': 'ready'})

@app.route('/api/pong/score', methods=['GET'])
def get_score():
    return jsonify({'player1': 0, 'player2': 0})

# Endpoints pour tester SQLite
@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or 'username' not in data:
        return jsonify({'error': 'Username required'}), 400
    
    user = User(username=data['username'])
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify(user.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Username already exists'}), 400

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

@app.route('/api/database/test', methods=['GET'])
def test_database():
    try:
        # Test database connection
        user_count = User.query.count()
        return jsonify({
            'status': 'Database connected successfully',
            'user_count': user_count,
            'database_path': app.config['SQLALCHEMY_DATABASE_URI']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User registered succesfully'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return jsonify({'message': 'Login successful', 'user': user.to_dict()})
    return jsonify({'error': 'Invalid credentials'}), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
