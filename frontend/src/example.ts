// Fichier d'exemple TypeScript pour le projet transcendence
// Ce fichier évite l'erreur "No inputs were found" de TypeScript

export class ExampleClass {
    private message: string;

    constructor(message: string = "Hello from TypeScript!") {
        this.message = message;
    }

    public greet(): void {
        console.log(this.message);
    }
}

// Export pour une utilisation future
export default ExampleClass;