//const destination = "http://localhost:3001";
const destination = "wss://ballgame.koizura.me";
let socket;


let WINDOW_WIDTH = window.innerWidth;
let WINDOW_HEIGHT = window.innerHeight;
const W = 1000;
const H = 600;
const ground = H-50;
const goalHeight = 200;

const keys = {up:false, down:false, left:false, right:false, w:false, a:false, s:false, d:false};

let playerL, playerR, ball;
let MODE;
let font;
let leftSelect, rightSelect, startGameBtn, titleTxt, homeBtn, onlineBtn, usernameInput, usernameBeginBtn, usernameDiv;
let countdown = 0;
let connected = false;
let roomName;
let online_isRed;
let latency = 0;
let nameSelectedOnline = false;
let username = '';
function setup() {
    let canvas = createCanvas(W,H);
    canvas.parent("world");
    font = loadFont('assets/BebasNeue.ttf');
    textFont(font);
    background(255);
    frameRate(60);
    leftSelect = select("#left-type");
    rightSelect = select("#right-type");
    startGameBtn = select("#start-btn");
    titleTxt = select("#title");
    homeBtn = select("#home-btn");
    onlineBtn = select("#online-btn");
    usernameInput = select("#username-input");
    usernameBeginBtn = select("#username-begin-btn");
    usernameDiv = select("#username-selection");
    homeBtn.hide();
    usernameDiv.hide();

    startGameBtn.mousePressed(startGame);
    homeBtn.mousePressed(openMenu);
    onlineBtn.mousePressed(connectOnline);
    usernameBeginBtn.mousePressed(connectOnline);

    playerL = newPlayer(true, leftSelect.value());
    playerR = newPlayer(false, rightSelect.value());
    ball = new Ball();
    MODE="MENU";

    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);


}

function connectOnline() {
    if (!nameSelectedOnline) {
        MODE="USERNAME_SELECTION";
        closeMenu();
        openUsername();
        return;
    }
    if (!connected ) {
        MODE="LOBBY";
        closeMenu();
        closeUsername();
        socket = io.connect(destination);
        socket.on('connected', () => {
            console.log('connection established.');
        });
        socket.on('startMatch', beginOnlineMatch);
        socket.on('disconnected', disconnected);
        socket.on('updateGame', updateOnlineMatch);
        socket.on('gameover', gameOverOnline);
        socket.on('pong', calculateLatency);
    }
    connected = true;
}
function beginOnlineMatch() {
    MODE="ONLINE_PLAY";
    playerL = newPlayer(true, "player");
    playerR = newPlayer(false, 'player');
    ball = new Ball();
    countdown = 60*3;
}
function disconnected() {
    openMenu();
    connected = false;
}

function calculateLatency(time) {
    latency = (new Date()).getMilliseconds() - time;
    if (latency < 0) {
        latency += 1000;
    }
}
function gameOverOnline(data) {
    playerL.score = data.redScore;
    playerR.score = data.blueScore;
    MODE="ONLINE_GAMEOVER";
    online_isRed = socket.id == data.redID;
    homeBtn.show();
    socket.disconnect();
    connected = false;
}
function updateOnlineMatch(data) {
    playerL.x = data.red.x;
    playerL.y = data.red.y;
    playerL.score = data.red.score;
    playerR.x = data.blue.x;
    playerR.y = data.blue.y;
    playerR.score = data.blue.score;
    ball.x = data.ball.x;
    ball.y = data.ball.y;
    countdown = data.countdown;
    roomName = data.roomName;
    playerL.username = data.red.username;
    playerR.username = data.blue.username;
}
let rate = 0;
function draw() {
    if (frameCount % 5 == 0) rate = round(frameRate());
    background(255);
    if (MODE=="MENU") {
        drawGoals();
        drawGround();

        playerL.think(ball);
        playerR.think(ball);
        playerL.update();
        playerR.update();
        ball.update();
        playerL.collide(playerR);
        ball.collide(playerL, playerR);
        playerL.show();
        playerR.show();
        ball.show();

        background(0, 150);

        fill(0, 30);
        noStroke();
        rect(W*0.64, H*0.5, W*0.22, 140);
        rect(W*0.14, H*0.5, W*0.22, 140);
        flavorText(W*0.65, H*0.55, playerR);
        flavorText(W*0.15, H*0.55, playerL);

        if (playerL.type != leftSelect.value()) {
            playerL = newPlayer(true, leftSelect.value());
        }
        if (playerR.type != rightSelect.value()) {
            playerR = newPlayer(false, rightSelect.value());
        }

        
    }
    else if (MODE=="COUNTDOWN") {
        countdown--;
        drawGoals();
        drawGround();
        playerL.think(ball);
        playerR.think(ball);
        playerL.update();
        playerR.update();
        playerL.collide(playerR);
        playerL.show();
        playerR.show();
        ball.show();

        textSize(100);
        fill(0);
        textAlign(CENTER);
        noStroke();
        push();
        translate(W/2, H/2);
        scale(map(countdown % 60, 0, 60, 1, 2));
        text(ceil((countdown+1)/60), 0, 0);
        pop();


        if(countdown <= 0) {
            MODE="PLAY";
        }
    }
    else if (MODE=="PLAY") {

        drawGoals();
        drawGround();

        playerL.think(ball);
        playerR.think(ball);
        playerL.update();
        playerR.update();
        ball.update();
        playerL.collide(playerR);
        ball.collide(playerL, playerR);
        playerL.show();
        playerR.show();
        ball.show();

        if (ball.inGoal != 0) {
            if (ball.inGoal == -1) {
                playerR.score++;
            } else {
                playerL.score++;
            }
            if (playerR.score == 5 || playerL.score == 5) {
                MODE="GAMEOVER";
                homeBtn.show();
            }
            ball.reset();
            playerL.reset();
            playerR.reset();
        }

        textSize(100);
        fill(0);
        textAlign(CENTER);
        noStroke();
        text(playerL.score, 200, 90);
        text(playerR.score, W-200, 90);
        textSize(20);
        text("First to 5", W/2, 60);
    } 
    else if (MODE=="GAMEOVER") {
        drawGoals();
        drawGround();

        playerL.think(ball);
        playerR.think(ball);
        playerL.update();
        playerR.update();
        ball.update();
        playerL.collide(playerR);
        ball.collide(playerL, playerR);
        playerL.show();
        playerR.show();
        ball.show();
        background(0, 50);
        textSize(100);
        fill(0);
        textAlign(CENTER);
        noStroke();
        if (playerL.score == 5) {
            text("Red Won!", W/2, H/2);
        } else {
            text("Blue Won!", W/2, H/2);
        }
        textSize(150);
        text(playerL.score, W*0.25, H/2);
        text(playerR.score, W*0.75, H/2);
        
    }
    else if (MODE=="LOBBY") {       
        drawGoals();
        drawGround();

        background(0, 150);

        textSize(100);
        fill(255);
        textAlign(CENTER);
        noStroke();
        text("Looking for a match...", W/2, H/2);
    }
    else if (MODE=="ONLINE_PLAY") {
        if(frameCount%30 == 0) {
            timeInfo = new Date();
            socket.emit('ping', (new Date()).getMilliseconds());
        }
        drawGoals();
        drawGround();
        playerL.show();
        playerR.show();
        ball.show();

        if (countdown > 0){
            textSize(100);
            fill(0);
            textAlign(CENTER);
            noStroke();
            push();
            translate(W/2, H/2);
            scale(map(countdown % 60, 0, 60, 1, 2));
            text(ceil((countdown+1)/60), 0, 0);
            pop();

            textSize(40);
            if (roomName == socket.id) {
                text("You are player Red.", W/2, H*0.7);
            } else {
                text("You are player Blue.", W/2, H*0.7);
            }
        }
        textSize(100);
        fill(0);
        textAlign(CENTER);
        noStroke();
        text(playerL.score, 200, 90);
        text(playerR.score, W-200, 90);
        textSize(20);
        text("First to 5", W/2, 60);
        socket.emit("updateInputs", {roomName, keys, username});
    }
    else if (MODE=="ONLINE_GAMEOVER") {
        drawGoals();
        drawGround();
        playerL.show();
        playerR.show();
        ball.show();
        background(0, 50);
        textSize(100);
        fill(0);
        textAlign(CENTER);
        noStroke();
        if ((playerL.score > playerR.score && online_isRed) || (playerL.score < playerR.score && !online_isRed)) {
            text("You Won!", W/2, H/2);
        } else {
            text("You Lost :(", W/2, H/2);
        }
        textSize(150);
        text(playerL.score, W*0.25, H/2);
        text(playerR.score, W*0.75, H/2);
    }
    else if (MODE=="USERNAME_SELECTION") {
        drawGoals();
        drawGround();

        background(0, 150);

        textSize(100);
        fill(255);
        textAlign(CENTER);
        noStroke();
        text("Please choose a username: ", W/2, H/2);

        if (username.length > 16) {
            usernameInput.value(usernameInput.value().substring(0,16));
        } 
        if (username.length > 0) {
            nameSelectedOnline = true;
        }  else {
            nameSelectedOnline = false;
        }
        username = usernameInput.value();
    }
    textSize(20);
    textAlign(LEFT);
    strokeWeight(0);
    fill(0);
    text(rate + " FPS", 10, 20);
    if (connected) {
        text("latency: " + latency + "ms", 10, 50);
        if (roomName) {
            text("room Name: " + roomName.substring(0, 3), 10, 80);
        }
    }
}

function drawGoals() {
    strokeWeight(60);

    stroke(255, 0, 0);
    line(0, ground, 0, ground - goalHeight);

    stroke(0, 0, 255);
    line(W, ground, W, ground - goalHeight);
}
function drawGround() {
    noStroke();
    fill(0, 200, 0);
    rect(0, ground, W, H-ground);
}
class Ball {
    constructor() {
        this.x = W/2;
        this.y = 100;
        this.vx = random(-5, 5);
        this.vy = 0;
        this.radius = 40;
        this.gravity = 0.5;
        this.bounciness = 15;
        this.inGoal = 0;
    }
    reset() {
        this.x = W/2;
        this.y = 100;
        this.vx = random(-5, 5);
        this.vy = 0;
        this.inGoal = 0;
    }
    show() {
        fill(200,50,200);
        noStroke();
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
    }
    update() {
        //if (this.inGoal != 0) return;
        this.vx *= 0.99999;
        this.vy += this.gravity;
        this.y += this.vy;
        this.x += this.vx;

        if (this.y + this.radius > ground) {
            this.y = ground - this.radius;
            this.vy = -abs(this.vy) * 0.9;
        }
        if (this.x - this.radius< 0) {
            this.x = this.radius;
            this.vx = abs(this.vx);
            if (this.y > ground - goalHeight) {
                this.inGoal = -1;
            }
        }
        if (this.x + this.radius > W) {
            this.x = W - this.radius;
            this.vx = -abs(this.vx);
            if (this.y > ground - goalHeight) {
                this.inGoal = 1;
            }
        }
    }
    collide(a, b) {
        let VX = 0, VY = 0, hit = false;
        let dist_a = dist(this.x, this.y, a.x, a.y);
        let dist_b = dist(this.x, this.y, b.x, b.y);
        if (dist_a <= 1) {
            dist_a = 1;
        }
        if (dist_b <= 1) {
            dist_b = 1;
        }
        if (dist_a < this.radius + a.radius) {
            hit = true;
            const dx = this.x - a.x;
            const dy = this.y - a.y;
            const _d = dist(0, 0, dx, dy);
            VX += dx/_d * this.bounciness + a.vx * 0.5;
            VY += dy/_d * this.bounciness;
        }
        if (dist_b < this.radius + b.radius) {
            hit = true;
            const dx = this.x - b.x;
            const dy = this.y - b.y;
            const _d = dist(0, 0, dx, dy);
            VX += dx/_d * this.bounciness + b.vx * 0.5;
            VY += dy/_d * this.bounciness;
        }
        if (hit) {
            this.vx = VX;
            this.vy = VY - 3.5;
        }
    }

}
class Player {
    
    constructor(isRed) {
        if (isRed) {
            this.x = 200;
        } else {
            this.x = W-200;
        }
        this.y = H-200;
        this.vx = 0;
        this.vy = 0;
        this.speed = 1;
        this.jumpPower = 14;
        this.radius = 40;
        this.isRed = isRed;
        this.gravity = 0.5;
        this.type = "player";
        this.score = 0;
        this.username = "player";
    }
    reset() {
        if (this.isRed) {
            this.x = 200;
        } else {
            this.x = W-200;
        }
        this.y = H-200;
        this.vx = 0;
        this.vy = 0;
    }
    show() {
        if (this.isRed) {
            fill(255, 0, 0);
        } else {
            fill(0, 0, 255);
        }
        stroke(0);
        strokeWeight(5);
        ellipse(this.x, this.y, this.radius*2, this.radius*2);
        if (this.username != "player") {
            fill(0);
            textAlign(CENTER);
            noStroke();
            textSize(30);
            text(this.username, this.x, this.y + 70);
        }
    }
    update() {
        this.vx *= 0.93;
        this.vy += this.gravity;
        this.y += this.vy;
        this.x += this.vx;
        if (this.y + this.radius > ground) {
            this.y = ground - this.radius;
            this.vy = 0;
        }
        if (this.x - this.radius< 0) {
            this.x = this.radius;
            this.vx = abs(this.vx);
        }
        if (this.x + this.radius > W) {
            this.x = W - this.radius;
            this.vx = -abs(this.vx);
        }
    }
    collide(other) {
        const d = dist(this.x, this.y, other.x, other.y);
        if (d > this.radius + other.radius) {
            return;
        }
        // handle overlap
        const overlap = this.radius + other.radius - d;
        const dir = (new Vec(other.x - this.x, other.y - this.y)).normalize();
        const offset = dir.multiply(overlap/2);
        this.x -= offset.x;
        this.y -= offset.y;
        other.x += offset.x;
        other.y += offset.y;
        // handle velocity
        const offsetV = dir.multiply(overlap);
        this.vx -= offsetV.x;
        this.vy -= offsetV.y;
        other.vx += offsetV.x;
        other.vy += offsetV.y;
        //const v1 = new Vec(this.vx, this.vy), v2 = new Vec(other.vx, other.vy);
        //const x1 = new Vec(this.x, this.y), x2 = new Vec(other.x, other.y);
        //const newV1 = v1.subtract((x1.subtract(x2)).multiply( (v1.subtract(v2)).dot(x1.subtract(x2)) / (x1.subtract(x2)). ));
    }
    up() {
        if (this.y + this.radius > ground - 1) {
            this.vy = -this.jumpPower;
        }
    }
    right() {
        this.vx += this.speed;
    }
    left() {
        this.vx -= this.speed;
    }
    think(ball) {
        if (playerL instanceof CPU || playerR instanceof CPU) {
            if (keys.up || keys.w) {
                this.up();
            }
            if (keys.right || keys.d) {
                this.right();
            }
            if (keys.left || keys.a) {
                this.left();
            }
        } else if (this.isRed){
            if (keys.w) {
                this.up();
            }
            if (keys.d) {
                this.right();
            }
            if (keys.a) {
                this.left();
            }
        } else if (!this.isRed) {
            if (keys.up) {
                this.up();
            }
            if (keys.right) {
                this.right();
            }
            if (keys.left) {
                this.left();
            }
        }
    }
}

class CPU extends Player {
    constructor(isRed) {
        super(isRed);
        this.type = "master";
        this.seed = random(0, 60);
    }
    setType(type) {
        this.type = type;
    }
    think(ball) {
        //this.juggler(ball);
        if (this.type == "juggler") {
            this.juggler(ball);
        }
        if (this.type == "jumper") {
            this.jumper(ball);
        }
        if (this.type == "master") {
            this.master(ball);
        }
    }
    juggler(ball) {
        let leftOrRight = ball.x - this.x; //  
        if (this.isRed) {
            leftOrRight *= -1;
        }
        if (leftOrRight > 15) {
            this.right();
        } 
        if (leftOrRight < -15) {
            this.left();
        }
    }
    jumper(ball) {
        let leftOrRight = ball.x - this.x + this.radius*1.5; //  
        if (this.isRed) {
            leftOrRight = (W-ball.x) - (W-this.x) + this.radius*1.5; //  
        }
        if (leftOrRight > 1) {
            this.right();
        } 
        if (leftOrRight < -1) {
            this.left();
        }
        if (frameCount % 60 == floor(this.seed)) {
            this.up();
        }
    }
    master(ball) {
        let leftOrRight = ball.x - this.x + this.radius*1.5; 
        let retreat = (ball.vx > 6 && this.x < 0.9*W) || ball.x < 0.4*W;
        let jump = abs(leftOrRight) < this.radius*2 && ball.x > W*0.7 && ball.y < ground - this.radius*2;
        if (this.isRed) {
            leftOrRight = (W-ball.x) - (W-this.x) + this.radius*1.5;
            retreat = (ball.vx < -6 && this.x > 0.1*W) || ball.x > 0.6*W;
            jump = abs(leftOrRight) < this.radius*2 && ball.x < W*0.3 && ball.y < ground - this.radius*2;
        }
        if (retreat) {
            this.right();
        } else if (leftOrRight > 10) {
            this.right();
        } else if (leftOrRight < -10) {
            this.left();
        }
        if (jump) {
            this.up();
        }
    }
    
    right() {
        if (!this.isRed) {
            this.vx += this.speed;
        } else {
            this.vx -= this.speed;
        }
        
    }
    left() {
        if (!this.isRed) {
            this.vx -= this.speed;
        } else {
            this.vx += this.speed;
        }
        
    }
}


function newPlayer(isRed, type) {
    if (type=="player") {
        return new Player(isRed);
    }
    const player = new CPU(isRed);
    player.setType(type);
    return player;
}

function openUsername() {
    usernameDiv.show();
}
function closeUsername() {
    usernameDiv.hide();
}

function openMenu() {
    MODE="MENU";
    startGameBtn.show();
    leftSelect.show();
    rightSelect.show();
    titleTxt.show();
    onlineBtn.show();
    playerL = newPlayer(true, leftSelect.value());
    playerR = newPlayer(false, rightSelect.value());
    ball = new Ball();
    homeBtn.hide();
    connected = false;
}
function closeMenu() {
    startGameBtn.hide();
    leftSelect.hide();
    rightSelect.hide();
    titleTxt.hide();
    onlineBtn.hide();
}

function startGame() {
    MODE="COUNTDOWN";
    closeMenu();
    
    playerL = newPlayer(true, leftSelect.value());
    playerR = newPlayer(false, rightSelect.value());
    ball = new Ball();

    countdown = 60*3;
}



function flavorText(x, y, player) {
    fill(255);
    noStroke();
    textAlign(LEFT);
    textSize(20);
    if (player.type == "player") {
        if (playerL instanceof CPU || playerR instanceof CPU) {
            text("This is you!\n\nUse the arrow or WASD keys\nto play.", x, y);
        } else if (player.isRed) {
            text("Use the WASD keys to control\nred.", x, y);
        } else {
            text("Use the arrow keys to control\nblue.", x, y);
        }
    } else if (player.type == "juggler"){
        text("The Juggler   (Easy AI)\n\nTry using the juggler to\npractice offensive play.", x, y);
    } else if (player.type == "jumper"){
        text("The Jumper    (Medium AI)\n\nJumps too much and plays\naggressively! Try playing\ndefensively.", x, y);
    } else if (player.type == "master"){
        text("The Master    (Difficult AI)\n\nGoes on both the aggressive\nand the defensive. Good luck!", x, y);
    }
}


function onKeyDown(event) {
    if (event.defaultPrevented) return;
    switch (event.code) {
      case "KeyS":
        keys.s = true;
        break;
      case "ArrowDown":
        keys.down = true;
        break;
      case "KeyW":
        keys.w = true;
        break;
      case "ArrowUp":
        keys.up = true;
        break;
      case "KeyA":
        keys.a = true;
        break;
      case "ArrowLeft":
        keys.left = true;
        break;
      case "KeyD":
        keys.d = true;
        break;
      case "ArrowRight":
        keys.right = true;
        break;
    }
}
  function onKeyUp(event) {
    if (event.defaultPrevented) return;
    switch (event.code) {
      case "KeyS":
        keys.s = false;
        break;
      case "ArrowDown":
        keys.down = false;
        break;
      case "KeyW":
        keys.w = false;
        break;
      case "ArrowUp":
        keys.up = false;
        break;
      case "KeyA":
        keys.a = false;
        break;
      case "ArrowLeft":
        keys.left = false;
        break;
      case "KeyD":
        keys.d = false;
        break;
      case "ArrowRight":
        keys.right = false;
        break;
    }
}


class Vec {
    constructor(x, y) {
        this.x = float(x);
        this.y = float(y);
    }
    add (b) {
        return new Vec(this.x + b.x, this.y+b.y);
    }
    subtract (b) {
        return new Vec(this.x - b.x, this.y-b.y);
    }
    dot (b) {
        return this.x * b.x + this.y * b.y;
    }
    multiply (n) {
        return new Vec(this.x * n, this.y*n);
    }
    divide(n) {
        return new Vec(this.x / n, this.y / n);
    }
    magnitude() {
        return sqrt(this.dot(this));
    }
    normalize() {
        return this.divide(this.magnitude());
    }
}