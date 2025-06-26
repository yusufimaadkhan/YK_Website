let font; // Font variable
let particles = []; // Array to store particles
let particleText = "In our thousands, in our millions, we are all Palestinians..."; // Text to be displayed
let fontSize; // Font size
let maxWidth; // Maximum width for text
let textHeight; // Height of the text
let particlePool = []; // Particle pool for reusing particles - method from game dev

// Preload function to load font
function preload() {
    font = loadFont('Lugrasimo-Regular.ttf')//  'Atkinson-Hyperlegible-Regular-102.otf'); // Replace with your font
}

// Setup function to initialize canvas and text setup
function setup() {
    let sketchContainer = document.getElementById('sketch-container');
    let divWidth = sketchContainer.offsetWidth;

    textFont(font);
    fontSize = Math.sqrt(divWidth * 0.9) * 2.5; // Set font size to square root of div width
    textSize(fontSize);
    maxWidth = divWidth * 0.9; // Set maximum text width to 95% of div width

    setupText(); // This will calculate textHeight

    let canvas = createCanvas(divWidth, textHeight); // Set canvas height to textHeight
    canvas.parent('sketch-container');
    pixelDensity(3);
}

// Function to handle window resize event
function windowResized() {
    let sketchContainer = document.getElementById('sketch-container');
    let divWidth = sketchContainer.offsetWidth;

    fontSize = Math.sqrt(divWidth * 0.9) * 2.5; // Recalculate font size
    textSize(fontSize);
    maxWidth = divWidth * 0.9; // Recalculate maximum text width
    setupText(); // Recalculate textHeight

    resizeCanvas(divWidth, textHeight); // Adjust canvas size
}

// Function to setup text particles
function setupText() {
    particles = [];
    particlePool = [];
    let x = 10;
    let y = fontSize/1.2;
    textHeight = 0; // Reset text height

    let words = particleText.split(' ');
    for (let i = 0; i < words.length; i++) {
        let wordWidth = textWidth(words[i] + ' ');
        if (x + wordWidth > maxWidth) {
            x = 10;
            y += fontSize;
        }

        let points = font.textToPoints(words[i], x, y, fontSize, {
            sampleFactor: 0.35
        });

        for (let j = 0; j < points.length; j++) {
            let particle;
            if (particlePool.length > 0) {
                particle = particlePool.pop(); // Reuse particle from the pool
                particle.reset(points[j].x, points[j].y);
            } else {
                particle = new Particle(points[j].x, points[j].y); // Create new particle
            }
            particles.push(particle);
        }

        x += wordWidth;
        textHeight = Math.max(textHeight, y); // Update text height
    }
    textHeight += 5; // Add 5px padding below the last word
}

let colors = ['#ee2a35', '#000000', '#009736']; // Color array

// Particle class
class Particle {
    constructor(x, y) {
        this.pos = createVector(random(width), random(height)); // Initialize position randomly
        this.target = createVector(x, y); // Target vector
        this.vel = p5.Vector.random2D(); // Velocity vector
        this.acc = createVector(); // Acceleration vector
        this.maxspeed = 12; //10; // Maximum speed
        this.maxforce = 1; // Maximum steering force
        let c = color(random(colors)); // Choose a random color
        this.color = [red(c), green(c), blue(c)]; // Set particle color
    }

    // Reset particle position and target
    reset(x, y) {
        this.pos.set(random(width), random(height));
        this.target.set(x, y);
    }

    // Apply behaviors to particle
    behaviors() {
        let arrive = this.arrive(this.target); // Apply arrive behavior
        let mouse = createVector(mouseX, mouseY); // Get mouse position
        let flee = this.flee(mouse); // Apply flee behavior

        arrive.mult(1); // Adjust arrive behavior weight
        flee.mult(5); // Adjust flee behavior weight

        this.applyForce(arrive); // Apply arrive force
        this.applyForce(flee); // Apply flee force
    }

    // Apply force to particle
    applyForce(f) {
        this.acc.add(f); // Add force to acceleration
    }

    // Update particle position and velocity
    update() {
        this.pos.add(this.vel); // Update position
        this.vel.add(this.acc); // Update velocity
        this.acc.mult(0); // Reset acceleration
    }

    // Display particle
    show() {
        fill(this.color[0], this.color[1], this.color[2]);
        noStroke();
        ellipse(this.pos.x, this.pos.y, 4, 4); // Draw particle as ellipse - will render faster apparently
    }

    // Arrive behavior
    arrive(target) {
        let desired = p5.Vector.sub(target, this.pos); // Calculate desired vector
        let d = desired.mag(); // Calculate distance to target
        let speed = this.maxspeed; // Set speed to maximum speed
        if (d < 100) { // If distance is less than 100, adjust speed
            speed = map(d, 0, 100, 0, this.maxspeed);
        }
        desired.setMag(speed); // Set desired vector magnitude
        let steer = p5.Vector.sub(desired, this.vel); // Calculate steering force
        steer.limit(this.maxforce); // Limit steering force
        return steer; // Return steering force
    }

    // Flee behavior
    flee(target) {
        let desired = p5.Vector.sub(target, this.pos); // Calculate desired vector
        let d = desired.mag(); // Calculate distance to target
        if (d < 50) { // If distance is less than 50, flee from target
            desired.setMag(this.maxspeed); // Set desired vector magnitude
            desired.mult(-1); // Reverse desired vector
            let steer = p5.Vector.sub(desired, this.vel); // Calculate steering force
            steer.limit(this.maxforce); // Limit steering force
            return steer; // Return steering force
        } else {
            return createVector(0, 0); // Return zero vector if not fleeing
        }
    }
}

// Draw function to update and display particles
function draw() {
    background(255); // Set background color
    particles.forEach(particle => {
        particle.behaviors(); // Apply behaviors to particle
        particle.update(); // Update particle position and velocity
        particle.show(); // Display particle
    });
}

// Function to return particles to the pool
function returnParticlesToPool() {
    particles.forEach(particle => {
        particlePool.push(particle);
    });
    particles = [];
}

function resetAnimation() {
    clear(); // Clears the canvas
    returnParticlesToPool(); // Returns current particles to the pool
    setupText(); // Recreates particles for the text
    draw(); // Draws the new state of the particles
}

function mouseClicked() {
    // Check if the click is inside the canvas or a specific div
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        resetAnimation();
    }
}



