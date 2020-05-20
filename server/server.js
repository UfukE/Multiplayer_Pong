const express = require("express");
const http = require("http");
const socketio = require("socket.io");

const app = express()
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketio(server);
const joinIDs = [];
app.use(express.static("public"));
server.listen(port,()=>console.log("Server is running..."))
const pmap = (n, start1, stop1, start2, stop2)  => (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
const Ball = function()
{
    this.x = 600/2;
    this.y = 400/2;
    this.w = 10;
    this.h = 10;
    this.speed = 3;
    this.angle = 190*Math.PI/180//Math.random() * Math.PI/4 * (Math.random()>0.5 ? -1 : 1);
    this.velx = this.speed * Math.cos(this.angle);
    this.vely = this.speed * Math.sin(this.angle);
    this.update = function(){
        this.x += this.velx;
        this.y += this.vely;
    }
    this.collision = function(paddles){
        let pl = paddles.find(e=>e.x==30); 
        let pr = paddles.find(e=>e!=pl);
        //console.log("Pl:",pl,"\nPr: ",pr,"\nBall: ",this);
        if(this.x+this.w/2 > pr.x+pr.w/2 || this.x-this.w/2 < pl.x-pl.w/2) {
            return new Ball();
        }
        if(this.y+this.h/2 >= 400) this.vely=-Math.abs(this.vely);
        if(this.y-this.h/2 <= 0) this.vely=Math.abs(this.vely);
        let pad = paddles.find(paddle=>this.y+this.h/2 > paddle.y-paddle.h/2 && this.y-this.h/2 < paddle.y+paddle.h/2 && (Math.abs((this.x-this.w/2)-(paddle.x+paddle.w/2)) < 2 || Math.abs((this.x+this.w/2)-(paddle.x-paddle.w/2)) < 2 ));
        if(pad){  
            let ofs = pad.x==30 ? 45 : 135;
            this.angle = pmap(this.y,pad.y-pad.h/2,pad.y+pad.h/2,-ofs,ofs)
            this.velx = this.speed * Math.cos(this.angle/180*Math.PI) * (this.reverse ? -1 : 1);
            this.vely = this.speed * Math.sin(this.angle/180*Math.PI);;
        }
        return this;
    }
};
io.on("connection",socket=>{
    console.log("User connected to the server");

    socket.on("disconnect",s=>{
        socket.emit("OPPONENT_DISCONNECT")
        console.log("User disconnected from the server");
        joinIDs.find(el=>el.selfID===s.id) ?  io.sockets.connected[joinIDs.find(el=>el.selfID===s.id).lobbyID].disconnect() : (joinIDs.find(el=>el.lobbyID===s.id) ? io.sockets.connected[joinIDs.find(el=>el.lobbyID===s.id).selfID].disconnect() : null);

    })

    socket.on("LOBBY_WAIT_PLAYER",s=>{
        joinIDs.forEach(e=>{
            if(e.lobbyID===s){
                io.to(s).emit("JH",{player1:{id:s},player2:{id:e.selfID},INFO:e});
                io.to(e.selfID).emit("JH",{player1:{id:e.selfID},player2:{id:s},INFO:e});
            }
        });
    });

    socket.on("LOBBY_JOIN_PLAYER",id => {
        joinIDs.push({selfID:socket.id,lobbyID:id,ball:new Ball()});
        joinIDs.forEach(e=>{
            io.sockets.connected[e.selfID] && io.sockets.connected[e.selfID].emit("BALL",e.ball);
            io.sockets.connected[e.lobbyID] && io.sockets.connected[e.lobbyID].emit("BALL",e.ball);
        });
    });

    socket.on("PLAYER_UPDATE",players => {
        io.sockets.connected[players.player2.id] && io.sockets.connected[players.player2.id].emit("PLAYER_RECIEVED",players.player1);
    });

    socket.on("BALL_UPDATE",()=>{
        joinIDs.forEach(e=>{
            e.ball.update();
            io.sockets.connected[e.selfID] && io.sockets.connected[e.selfID].emit("BALL",e.ball);
            io.sockets.connected[e.lobbyID] && io.sockets.connected[e.lobbyID].emit("BALL",e.ball);
        });
    })

    socket.on("BALL_COLLISION",ar=>{
        joinIDs.forEach(e=>{
            e.ball = e.ball.collision(ar);
            io.sockets.connected[e.selfID] && io.sockets.connected[e.selfID].emit("BALL",e.ball);
            io.sockets.connected[e.lobbyID] && io.sockets.connected[e.lobbyID].emit("BALL",e.ball);
        });
    })

});

