var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class FriendsManager {
    constructor() {
        this.friendsList = new Set();
        this.friendsOnly = false;
    }
    loadFriendsList() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/friends/list', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = yield response.json();
                    this.friendsList = new Set(data.friends.map((f) => f.username));
                    console.log("✅ Liste d'amis chargée:", this.friendsList.size, "amis");
                }
            }
            catch (error) {
                console.error("❌ Erreur lors du chargement de la liste d'amis:", error);
            }
        });
    }
    getFriendsList() {
        return this.friendsList;
    }
    isFriend(username) {
        return this.friendsList.has(username);
    }
    setFriendsOnlyFilter(enabled) {
        this.friendsOnly = enabled;
        console.log("🔄 Filtre amis:", this.friendsOnly ? "activé" : "désactivé");
    }
}
//# sourceMappingURL=FriendsManager.js.map