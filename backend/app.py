from flask import Flask, jsonify, request, redirect
from flask_cors import CORS

from flask_sqlalchemy import SQLAlchemy
import os
from flask import session
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask import send_from_directory
from authlib.integrations.flask_client import OAuth

app = Flask(__name__)
CORS(app)

app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_change_me')
app.config['SESSION_COOKIE_SAMESITE'] = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', '0') == '1'


@app.route('/avatars/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Configuration SQLite - Simple et fonctionnelle
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///transcendence.db'  # Fichier dans /app/
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Init database
db = SQLAlchemy(app)

# Init OAuth
oauth = OAuth(app)
oauth.register(
    name='github',
    client_id=os.environ.get('Ov23liMyoGPzLgzpVjQt'),
    client_secret=os.environ.get('8deed7b039363328750614a3c42945da6f92d0d3'),
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize',
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)

# User
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    display_name = db.Column(db.String(80), unique=True, nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)
    oauth_provider = db.Column(db.String(50), nullable=True)
    oauth_id = db.Column(db.String(255), nullable=True, unique=True)
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url
            }

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
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    password = data.get('password')
    display_name = data.get('display_name')

    if not username or not password or not display_name:
        return jsonify({'error': 'All fields required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    if User.query.filter_by(display_name=display_name).first():
        return jsonify({'error': 'Display name already exists'}), 400

    user = User(
        username=username, 
        display_name=display_name, 
        avatar_url=None
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()
    return jsonify({
        'message': 'User registered succesfully',
        'id': user.id,
        'username': user.username,
        'display_name': user.display_name,
        'avatar_url': user.avatar_url
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return jsonify({
            'message': 'Login successful',
            'id': user.id,
            'username': user.username,
            'display_name': user.display_name
        })
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/oauth/login/github')
def oauth_login_github():
    redirect_uri = os.environ.get('OAUTH_REDIRECT_URI') or request.host_url + 'api/oauth/callback/github'
    return oauth.github.authorize_redirect(redirect_uri)

@app.route('/api/oauth/callback/github')
def oauth_callback_github():
    token = oauth.github.authorize_access_token()
    if not token:
        return jsonify({'error': 'OAuth failed'}), 400
    profile = oauth.github.get('user').json()
    github_id = str(profile.get('id'))
    username = profile.get('login') or f'gh_{github.id}'
    display_name = profile.get('name') or username
    avatar = profile.get('avatar_url')

    user = User.query.filter_by(oauth_provider='github', oauth_id=github_id).first()
    if not user:
        base_username = username
        i = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}_{i}"
            i += i
        user = User (
            username=username,
            display_name=display_name,
            oauth_provider='github',
            oauth_id=github_id,
            avatar_url=avatar or '/avatars/default_avatar.png'
        )
        user.password_hash = ''
        db.session.add(user)
        db.session.commit()
    session['user_id'] = user.id

    frontend_url = os.environ.get('FRONTEND_URL') or ('http://localhost:3000' if request.host.split(':')[1] != '8000' else 'http://localhost:3000')
    return redirect(f"{frontend_url}/#oauth_success?id={user.id}&username={user.username}&display_name={user.display_name}&avatar_url={user.avatar_url}")

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    data = request.get_json()
    display_name = data.get('display_name')
    if display_name:
        if display_name == user.username:
            user.display_name = display_name
        else:
            existing_user = User.query.filter_by(display_name=display_name).first()
            if existing_user and existing_user.id != user.id:
                return jsonify({'error': 'Display name already exists'}), 400
            user.display_name = display_name
    db.session.commit()
    return jsonify({'message': 'User updated', 'user': user.to_dict()})

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'avatars')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
@app.route('/api/users/<int:user_id>/avatar', methods=['POST'])
def upload_avatar(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(f"user_{user_id}_" + file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file.save(filepath)
        user.avatar_url = f"/avatars/{filename}"
        db.session.commit()
        return jsonify({'message': 'Avatar uploaded', 'avatar_url': user.avatar_url})
    return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
