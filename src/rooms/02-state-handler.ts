import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("uint8")
    tGun = 0;

    @type("uint8")
    loss = 0;

    @type("int8")
    mHP = 0;
    @type("int8")
    cHP = 0;

    @type("number")
    speed = 0;

    @type("number")
    pX = Math.floor(Math.random() * 50) - 25;
    @type("number")
    pY = 0;
    @type("number")
    pZ = Math.floor(Math.random() * 50) - 25;

    @type("number")
    vX = 0;
    @type("number")
    vY = 0;
    @type("number")
    vZ = 0;

    @type("number")
    rX = 0;
    @type("number")
    rY = 0;

    @type("boolean")
    iC = false;

}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    something = "This attribute won't be sent to the client-side";

    createPlayer(sessionId: string, data: any) {
        const player = new Player();
        player.mHP = data.hp;
        player.cHP = data.hp;
        player.speed = data.speed;

        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer(sessionId: string, data: any) {
        const player = this.players.get(sessionId);
        player.pX = data.pX;
        player.pY = data.pY;
        player.pZ = data.pZ;

        player.vX = data.vX;
        player.vY = data.vY;
        player.vZ = data.vZ;

        player.rX = data.rX;
        player.rY = data.rY;

        player.iC = data.iC;
        player.tGun = data.tGun;
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 2;

    onCreate(options) {
        console.log("StateHandlerRoom created!", options);

        this.setState(new State());

        this.onMessage("move", (client, data) => {
            // console.log("StateHandlerRoom received message from", client.sessionId, ":", data);
            this.state.movePlayer(client.sessionId, data);
        });

        this.onMessage("shoot", (client, data) => {
            this.broadcast("Shoot", data, { except: client });
        });

        this.onMessage("damage",(client, data) => {
            const clientID =  data.id;
            const player = this.state.players.get(clientID);
            let hp = player.cHP - data.value;
            if(hp > 0){
                player.cHP = hp;
                return;
            }

            player.loss++;
            player.cHP = player.mHP;

            

            for(var i = 0; i < this.clients.length; i++){
                if(this.clients[i].id != clientID) continue;
                const x = Math.floor(Math.random() * 50) - 25;
                const z = Math.floor(Math.random() * 50) - 25;

                const message = JSON.stringify({x,z});
                this.clients[i].send("Restart",message);
            }
        });
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin(client: Client, data: any) {
        if(this.clients.length > 1) this.lock();
        client.send("hello", "world");
        this.state.createPlayer(client.sessionId, data);
    }

    onLeave(client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose() {
        console.log("Dispose StateHandlerRoom");
    }

}
