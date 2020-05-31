
const socket = io();
socket.on("connect",()=>console.log("Successfully connected to the server."));
socket.on("disconnect",()=>console.log("Connection failed with the server."));
socket.on("OPPONENT_DISCONNECT",()=>console.log("dd2341d"));
socket.on("JH",players=>{
    globalIntervals.forEach(e=>clearInterval(e));
    document.body.removeChild(document.getElementById("main"));
    document.body.style.backgroundColor = "transparent";
    canvas.style.visibility = "visible";
    gameinit(players);
});

const globalIntervals = [];
document.getElementById("create-lobby").onclick = function(e){
    let clickfunc = this.onclick;
    this.firstElementChild.innerText = socket.id;
    document.getElementById("join-lobby").style.visibility = "hidden";

    const waiting = document.createElement("a");
    waiting.setAttribute("href","#");
    waiting.setAttribute("class","detext loading");
    waiting.style.cursor = "default";
    waiting.innerText = "Waiting for player2 to join";
    let h = document.getElementById("main").appendChild(document.createElement("h2").appendChild(waiting).parentNode);
    globalIntervals.push(setInterval(()=>socket.emit("LOBBY_WAIT_PLAYER",socket.id),2000));


    this.onclick = function(e){
        this.firstElementChild.innerText = "Create Lobby";
        document.getElementById("join-lobby").style.visibility = "visible";
        document.getElementById("main").removeChild(h);
        globalIntervals.forEach(el=>clearInterval(el));
        this.onclick = clickfunc;
    }
}

document.getElementById("join-lobby").onclick = function(e){
    let clickfunc = this.onclick;
    document.getElementById("create-lobby").style.visibility = "hidden";
    this.style.visibility = "hidden";

    const input = document.createElement("input");
    input.setAttribute("placeholder","Enter lobby id")
    input.setAttribute("class","inp");
    document.getElementById("main").appendChild(input);


    input.onkeydown = function(e){
        if(e.key=="Enter"){
        socket.emit("LOBBY_JOIN_PLAYER",this.value);
        document.getElementById("create-lobby").style.visibility = "visible";
        document.getElementById("join-lobby").style.visibility = "visible";
        document.getElementById("main").removeChild(input);
        document.getElementById("join-lobby").onclick = clickfunc;
        }
    }
}
let reversed = false;
const canvas = document.getElementById("screen");
const context = canvas.getContext("2d");
const fps = 30;
let ball = {};

class Paddle {
    constructor(reverse,w,h,color,speed,{x,y}={
        true: {x:30,y:canvas.height/2},
        false:{x:canvas.width-30,y:canvas.height/2}
    }[reverse]){
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
        this.speed = speed;
        this.reverse = reverse;
        this.score = 0;
    }

    render(s){
        s.save();
        s.fillStyle = this.color;
        s.fillRect(this.x-this.w/2,this.y-this.h/2,this.w,this.h);
        s.font = "20px Arial";
        s.fillStyle = "white";
        if(reversed){
            s.translate(canvas.width,0)
            s.scale(-1,1);
            //s.rotate(Math.PI);
        }
        s.fillText(this.score,this.x+60*(this.x==30?1:-1),40);
        s.restore();
    }

    move(dir){
        this.y += dir*this.speed;
    }

}

async function gameinit(players){
    await setup(players);
    draw(players);
    //setInterval(draw,1000/fps,players)
}

socket.on("BALL",b => {
    ball={
        ...b,
    render: function(s){
        s.save();
        s.fillStyle = "white";
        s.fillRect(this.x-this.w/2,this.y-this.h/2,this.w,this.h);
        s.restore();
    },
    /*update: function(){
        this.x += this.velx;
        this.y += this.vely;
    },

    collision: function(paddles){
        if(this.x+this.w/2 > 600 || this.x-this.w/2 < 0) this.velx*=-1;
        if(this.y+this.h/2 >= 400) this.vely=-Math.abs(this.vely);
        if(this.y-this.h/2 <= 0) this.vely=Math.abs(this.vely);
        if(paddles.some(paddle=>this.y+this.h/2 > paddle.y-paddle.h/2 && this.y-this.h/2 < paddle.y+paddle.h/2 && (Math.abs((this.x-this.w/2)-(paddle.x+paddle.w/2)) < 5 || Math.abs((this.x+this.w/2)-(paddle.x-paddle.w/2)) < 5 ))){
            this.velx*=-1;
            this.vely*=-1;
        }
    }*/
    };
});

async function setup(players){
    let info = players.INFO;
    delete players.INFO;
    if (players["player1"].id==info.selfID){
        reversed = true
        context.translate(canvas.width, 0);
        context.scale(-1,1);
    };
    console.log(players);    
    players["player1"].paddle = new Paddle(players["player1"].id==info.lobbyID,20,80,"red",2);
    players["player2"].paddle = new Paddle(players["player1"].id==info.selfID,20,80,"blue",2);

    onkeydown = e => {
        if(e.key == "ArrowUp" || e.key == "keyW"){
            players.player1.paddle.move(-10);
            socket.emit("PLAYER_UPDATE",players);
        }

        if(e.key == "ArrowDown" || e.key == "keyS"){
            players.player1.paddle.move(10);
            socket.emit("PLAYER_UPDATE",players);

        }

    }

    //context.moveTo(canvas.width/2,0);
    //context.lineTo(canvas.width/2,canvas.height);

    socket.on("PLAYER_RECIEVED",ps=>{
        players.player2.paddle.y = ps.paddle.y;
    })

    socket.on("SCORE_UPDATE",posx=>{
        (reversed ? Object.values(players).find(pl=>pl.paddle.x!=posx) : Object.values(players).find(pl=>pl.paddle.x==posx)).paddle.score++;
    })

    return (void 54);
}


function draw(players){
    context.save();
    context.clearRect(0,0,canvas.width,canvas.height);
    for (const player in players) {
        players[player].paddle.render(context);
    }
    context.restore();
    //context.stroke();
    socket.emit("BALL_COLLISION",[...Object.values(players).map(e=>e.paddle)])
    socket.emit("BALL_UPDATE",true);
    ball.render(context);
    setTimeout(requestAnimationFrame,1000/fps,()=>draw(players));
}