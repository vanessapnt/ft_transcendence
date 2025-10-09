import json
import socket
from datetime import datetime

def send_to_elk(message, **kwargs):
    """Envoie un log vers ELK de manière simple"""
    log_entry = {
        "message": message,
        "service": "backend",
        "@timestamp": datetime.utcnow().isoformat(),
        **kwargs
    }
    
    try:
        # En développement : localhost:5001
        # En production Docker : logstash:5000
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(("localhost", 5001))
        sock.send((json.dumps(log_entry) + "\n").encode())
        sock.close()
    except:
        # Fail silently - ELK ne doit pas casser l'app
        pass

# Exemples d'usage :
# send_to_elk("User login", user="crios", status=200, action="login")
# send_to_elk("Game started", game_id="123", players=["alice", "bob"])
# send_to_elk("API error", endpoint="/api/user", error="Database timeout", status=500)