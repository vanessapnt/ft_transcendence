class FriendsManager {
    private friendsList: Set<string> = new Set();
    public friendsOnly: boolean = false;

    public async loadFriendsList(): Promise<void> {
        try {
            const response = await fetch('/api/friends/list', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this.friendsList = new Set(data.friends.map((f: any) => f.username));
                console.log("✅ Liste d'amis chargée:", this.friendsList.size, "amis");
            }
        } catch (error) {
            console.error("❌ Erreur lors du chargement de la liste d'amis:", error);
        }
    }

    public getFriendsList(): Set<string> {
        return this.friendsList;
    }

    public isFriend(username: string): boolean {
        return this.friendsList.has(username);
    }

    public setFriendsOnlyFilter(enabled: boolean): void {
        this.friendsOnly = enabled;
        console.log("🔄 Filtre amis:", this.friendsOnly ? "activé" : "désactivé");
    }
}
