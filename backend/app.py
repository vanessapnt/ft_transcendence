from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/health')
def health():
    return jsonify({'status': 'Backend is running!'})

@app.route('/api/game/status')
def game_status():
    return jsonify({'game': 'pong', 'status': 'ready'})

@app.route('/api/pong/score', methods=['GET'])
def get_score():
    return jsonify({'player1': 0, 'player2': 0})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)