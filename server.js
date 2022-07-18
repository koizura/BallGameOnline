const express = require('express');
const app = express();
const server = app.listen(3001);

app.use(express.static('public'));

console.log('Server Started');

const io = require('socket.io')(server);

const waitlist = [];
const rooms = {};

const W = 1000;
const H = 600;
const ground = H-50;
const goalHeight = 200;

setInterval(updateGameRooms, 1000/60); // 60FPS would be 16.666
function updateGameRooms() {
    if (rooms.length == 0) return;
    for (const [roomName, roomData] of Object.entries(rooms)) {
        if (roomData.game.countdown > 0) {
            roomData.game.countdown--;
            roomData.game.red.think(roomData.game.redKeys);
            roomData.game.blue.think(roomData.game.blueKeys);
            roomData.game.red.update();
            roomData.game.blue.update();
            roomData.game.red.collide(roomData.game.blue);
        } else {
            roomData.game.red.think(roomData.game.redKeys);
            roomData.game.blue.think(roomData.game.blueKeys);
            roomData.game.red.update();
            roomData.game.blue.update();
            roomData.game.ball.update();
            roomData.game.red.collide(roomData.game.blue);
            roomData.game.ball.collide(roomData.game.red, roomData.game.blue);
        }


        if (roomData.game.ball.inGoal != 0) {
            if (roomData.game.ball.inGoal == -1) {
                roomData.game.blue.score++;
            } else {
                roomData.game.red.score++;
            }
            
            roomData.game.ball.reset();
            roomData.game.red.reset();
            roomData.game.blue.reset();
        }
        const data = {
            red: getPlayerAsDict(roomData.game.red),
            blue: getPlayerAsDict(roomData.game.blue),
            ball: getBallAsDict(roomData.game.ball),
            countdown: roomData.game.countdown,
            roomName,
            
        }
        roomData.red.emit("updateGame", data);
        roomData.blue.emit("updateGame", data);
        if (roomData.game.blue.score == 5) {
            const scoring = {
                redScore: roomData.game.red.score,
                blueScore: roomData.game.blue.score,
                redID: roomData.red.id,
                blueID: roomData.blue.id,
                winnerID: roomData.blue.id,
            }
            roomData.red.emit("gameover", scoring);
            roomData.blue.emit("gameover", scoring);
        } else if (roomData.game.red.score == 5) {
            const scoring = {
                redScore: roomData.game.red.score,
                blueScore: roomData.game.blue.score,
                redID: roomData.red.id,
                blueID: roomData.blue.id,
                winnerID: roomData.red.id,
            }
            roomData.red.emit("gameover", scoring);
            roomData.blue.emit("gameover", scoring);
        }
    }
}

function getPlayerAsDict(player) {
    return {
        x: player.x,
        y: player.y,
        score: player.score,
        isRed: player.isRed,
    };
}
function getBallAsDict(ball) {
    return {
        x: ball.x,
        y: ball.y
    };
}


io.on('connection', socket => {
    console.log('new connection: ' + socket.id);
    socket.emit('connected');
    waitlist.push(socket);
    info();
    if (waitlist.length >= 2) {
        
        const red = waitlist.shift();
        const blue = waitlist.shift();
        rooms[red.id] = {
            red,
            blue, 
            game: {
                red: new Player(true),
                blue: new Player(false),
                redKeys: {up:false, down:false, left:false, right:false, w:false, a:false, s:false, d:false},
                blueKeys: {up:false, down:false, left:false, right:false, w:false, a:false, s:false, d:false},
                ball: new Ball(),
                countdown: 60*3,
            },
        };
        console.log("created room for",red.id,"and",blue.id);
        red.emit("startMatch");
        blue.emit("startMatch");
        info();
    }
    socket.on('ping', time => {
        socket.emit('pong', time);
    });
    socket.on('updateInputs', data => {
        if (rooms[data.roomName]) {
            if (rooms[data.roomName].red.id == socket.id) {
                rooms[data.roomName].game.redKeys = data.keys;
            } else {
                rooms[data.roomName].game.blueKeys = data.keys;
            }
        }
    });
    socket.on('disconnect', () => {
        console.log("disconnected:", socket.id);
        for(let i = 0; i < waitlist.length; i++) {
            if (waitlist[i].id == socket.id) {
                waitlist.splice(i);
                console.log("removed",socket.id,"from waitlist. disconnected.");
                break;
            }
        }
        for (const [roomName, roomData] of Object.entries(rooms)) {
            if (roomData.red.id == socket.id || roomData.blue.id == socket.id) {
                roomData.red.emit("disconnected");
                roomData.blue.emit("disconnected");
                delete rooms[roomName];
                console.log("removed",roomName,"room. disconnected",roomData.blue.id);
                break;
            }
        }
        info();
    });
});
function info() {
    console.log("waitlist:",waitlist.length, "rooms:", Object.keys(rooms).length);
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
    think(keys) {
        if (keys.up || keys.w) {
            this.up();
        }
        if (keys.right || keys.d) {
            this.right();
        }
        if (keys.left || keys.a) {
            this.left();
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
}
function sqrt(n) {
    return Math.sqrt(n);
}
function dist(x1, y1, x2, y2) {
    return sqrt((x2-x1)*(x2-x1) + (y2-y1) * (y2-y1));
}
function abs(num) {
    return Math.abs(num);
}
function random(min, max) {
    return Math.random() * (max - min) + min;
}
class Vec {
    constructor(x, y) {
        this.x = x;
        this.y = y;
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