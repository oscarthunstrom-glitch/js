const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


let spelare = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 50,
    height: 50,
    speed: 5,
    direction : {
        up: false,
        down: false,
        left: false,
        right: false
    }  
}

document.addEventListener("keydown", function(event) {
    if (event.code === "ArrowUp") {
        spelare.direction.up = true;
 }
    if (event.code === "ArrowDown") {
        spelare.direction.down = true;
    }
    if (event.code === "ArrowLeft") {
        spelare.direction.left = true;
    }
    if (event.code === "ArrowRight") {
        spelare.direction.right = true;
    }
});

document.addEventListener("keyup", function(event) {
    if (event.code === "ArrowUp") {
        spelare.direction.up = false;
 }
    if (event.code === "ArrowDown") {
        spelare.direction.down = false;
    }
    if (event.code === "ArrowLeft") {
        spelare.direction.left = false;
    }
    if (event.code === "ArrowRight") {
        spelare.direction.right = false;
    }
});




function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "pink";
ctx.fillRect(spelare.x, spelare.y, spelare.width, spelare.height);
if (spelare.direction.up) {
    spelare.y -= spelare.speed;
}
if (spelare.direction.down) {
    spelare.y += spelare.speed;
}
if (spelare.direction.left) {
    spelare.x -= spelare.speed;
}
if (spelare.direction.right && spelare.x + spelare.width < canvas.width) {
    spelare.x += spelare.speed;
}
  requestAnimationFrame(gameLoop);
}

gameLoop();