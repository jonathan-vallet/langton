class LangtonAnt {
    constructor() {
        // Sets constants
        this.DIRECTION_UP = 'up';
        this.DIRECTION_BOTTOM = 'bottom';
        this.DIRECTION_LEFT = 'left';
        this.DIRECTION_RIGHT = 'right';
        this.MIN_SPEED = 0.0625; // Minimum speed.
        this.MAX_SPEED = 4096; // Max speed (number of cell moved per frame, exceede d max call stack if too high)
        this.SPEED_MULTIPLIER = 2; // Speed multiplier when increse/decrease speed
        this.INITIAL_CELL_NUMBER = 10; // Initial number of cells on the grid, updated with zoom

        this.stepNumberElement = document.getElementById('step-number');
        this.isPaused = false; // Is simulation is paused
        this.isStarted = false; // Is simulation is started for first launch
        this.isReversed = false;// Is simulation is playing reverse

        // Inits canvas
        this.canvas = document.getElementById('langton');
        this.context = this.canvas.getContext('2d');
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;

        // Setings panel elements
        this.startButton = document.getElementById('start-button');
        this.resetButton = document.getElementById('reset-button');
        this.speedLabel = document.getElementById('setting-speed');
        this.speedUpButton = document.getElementById('setting-speed-up');
        this.speedDownButton = document.getElementById('setting-speed-down');
        this.zoomButton = document.getElementById('setting-zoom');
        this.zoomOutButton = document.getElementById('setting-zoom-out');
        this.reverseButton = document.getElementById('setting-reverse');
        this.colorListElement = document.getElementById('color-setting-list');
        this.addColorButton = document.getElementById('setting-color-add');

        this.colorOrder = ['black', 'white', 'blue', 'red', 'purple', 'green', 'yellow', '#666', '#44C', 'cyan', '#C44', '#4C4'];
        this.colorList = 
        [
         {
             color: 'black',
             direction: this.DIRECTION_LEFT
         },
         {
             color: 'white',
             direction: this.DIRECTION_RIGHT
         },/*
         {
             color: 'blue',
             direction: this.DIRECTION_LEFT
         },/*
         {
             color: 'red',
             direction: this.DIRECTION_LEFT
         },
         {
             color: 'purple',
             direction: this.DIRECTION_LEFT
         },
         {
             color: 'green',
             direction: this.DIRECTION_LEFT
         },
         {
             color: 'yellow',
             direction: this.DIRECTION_RIGHT
         },
         {
             color: '#666',
             direction: this.DIRECTION_RIGHT
         },
         {
             color: '#44C',
             direction: this.DIRECTION_RIGHT
         },
         {
             color: 'cyan',
             direction: this.DIRECTION_LEFT
         },
         {
             color: '#C44',
             direction: this.DIRECTION_LEFT
         },
         {
             color: '#4C4',
             direction: this.DIRECTION_LEFT
         }*/
        ];
        this.initialGridColor = 1;
    
        this.bindEvents();
    }

    bindEvents() {
        this.startButton.addEventListener('click', () => {
            if(!this.isStarted) {
                this.start();
            } else {
                this.pause();
            }
        });

        // Increases speed when click on speed up button
        this.speedUpButton.addEventListener('click', () => {
            this.speed = Math.min(this.MAX_SPEED, this.speed * this.SPEED_MULTIPLIER);
            this.setSpeedLabel();
        });

        // Decreases speed when click on speed up button
        this.speedDownButton.addEventListener('click', () => {
            this.speed = Math.max(this.MIN_SPEED, this.speed / this.SPEED_MULTIPLIER);
            this.setSpeedLabel();
        });

        // Zoom when click on zoom + button
        this.zoomButton.addEventListener('click', () => {
            this.speed = Math.min(this.MAX_SPEED, this.speed * this.SPEED_MULTIPLIER);
            this.setSpeedLabel();
        });

        // Zoom out when click on zoom - button
        this.zoomOutButton.addEventListener('click', () => {
            this.speed = Math.max(this.MIN_SPEED, this.speed / this.SPEED_MULTIPLIER);
            this.setSpeedLabel();
        });

        // Zoom out when click on zoom - button
        this.reverseButton.addEventListener('click', () => {
            this.isReversed = !this.isReversed;
        });
        
        // Adds a new color
        this.addColorButton.addEventListener('click', () => {
            // Creates new color
            var colorData = {
                color: this.colorOrder[this.colorList.length % this.colorOrder.length],
                direction: this.DIRECTION_LEFT
            };
            this.colorList.push(colorData);
            
            // Adds color to panel setting
            var colorDirection = document.createElement('span');
            colorDirection.classList.add('color-setting-direction');
            colorDirection.setAttribute('data-attribute', 'left');
            colorDirection.addEventListener('click', () => {
                colorDirection.setAttribute('data-attribute', colorDirection.getAttribute('data-attribute') === 'left' ? 'right': 'left');
            });
            var colorElement = document.createElement('span');
            colorElement.style.backgroundColor = colorData.color;
            colorElement.classList.add('color-setting-color');
            
            var colorElementWrapper = document.createElement('p');
            colorElementWrapper.classList.add('color-setting-wrapper');
            colorElementWrapper.appendChild(colorElement);
            colorElementWrapper.appendChild(colorDirection);
            
            this.colorListElement.appendChild(colorElementWrapper);
            
            this.reset();
        });
        
        
        // Resets simulation
        this.resetButton.addEventListener('click', () => {
            this.reset();
        });
    }
    
    /*
     * Starts simulation
     */
    start() {
        this.startButton.innerText = 'Pause';
        this.speed = 1; // Current speed. A speed >= 1 preceed the amount of move per frame, and < 1 reduces timeout between frames
        this.zoom = 1; // Current zoom

        this.isStarted = true;
        this.stepNumber = 0;
        this.cellList = {};
        this.setZoom();
        
        // Inits ant
        this.ant = {
            x: 0,
            y: 0,
            direction: this.DIRECTION_RIGHT
        };

        this.moveAnt();
    }

    /*
     * Pause / unpause
     */
    pause() {
        this.isPaused = !this.isPaused;
        // If removes paused state, restart playing
        if(!this.isPaused) {
            this.startButton.innerText = 'Pause';
            this.moveAnt();
        } else {
            this.startButton.innerText = 'Start';
            if(this.hasOwnProperty('moveTimeout')) {
                clearTimeout(this.moveTimeout);
            }
        }
    }
    
    reset() {
        if(this.hasOwnProperty('moveTimeout')) {
            clearTimeout(this.moveTimeout);
        }
        this.start();
    }
    
    drawGrid() {
        // Draws vertical lines
        for (var x = 0; x <= this.canvasWidth; x += this.cellSize) {
            this.context.moveTo(0.5 + x, 0);
            this.context.lineTo(0.5 + x, this.canvasHeight);
        }

        // Draws horizontal lines
        for (x = 0; x <= this.canvasHeight; x += this.cellSize) {
            this.context.moveTo(0, 0.5 + x);
            this.context.lineTo(this.canvasWidth, 0.5 + x);
        }

        this.context.strokeStyle = "black";
        this.context.stroke();
    }
    
    drawAnt() {
        //return;
        // TODO: just redraw previous cell, or draw ant in another canvas
        this.redraw();
        this.context.beginPath();
        switch (this.ant.direction) {
        case this.DIRECTION_UP:
            this.context.moveTo((this.ant.x - 1 + this.cellNumber / 2) * this.cellSize, (this.ant.y + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x - 0.5 + this.cellNumber / 2) * this.cellSize, (this.ant.y - 1 + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x + this.cellNumber / 2) * this.cellSize, (this.ant.y + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x - 0.5 + this.cellNumber / 2) * this.cellSize, (this.ant.y - 0.2 + this.cellNumber / 2) *  this.cellSize);
            break;
        case this.DIRECTION_BOTTOM:
            this.context.moveTo((this.ant.x - 1 + this.cellNumber / 2) * this.cellSize, (this.ant.y - 1 + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x - 0.5 + this.cellNumber / 2) * this.cellSize, (this.ant.y + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x + this.cellNumber / 2) * this.cellSize, (this.ant.y - 1 + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x - 0.5 + this.cellNumber / 2) * this.cellSize, (this.ant.y - 0.8 + this.cellNumber / 2) *  this.cellSize);
            break;
        case this.DIRECTION_LEFT:
            this.context.moveTo((this.ant.x + this.cellNumber / 2) * this.cellSize, (this.ant.y + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x - 1 + this.cellNumber / 2) * this.cellSize, (this.ant.y -0.5 + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x + this.cellNumber / 2) * this.cellSize, (this.ant.y - 1 + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x - 0.2 + this.cellNumber / 2) * this.cellSize, (this.ant.y - 0.5 + this.cellNumber / 2) *  this.cellSize);
            break;
        case this.DIRECTION_RIGHT:
            this.context.moveTo((this.ant.x - 1 + this.cellNumber / 2) * this.cellSize, (this.ant.y - 1 + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x + this.cellNumber / 2) * this.cellSize, (this.ant.y -0.5 + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x - 1 + this.cellNumber / 2) * this.cellSize, (this.ant.y + this.cellNumber / 2) *  this.cellSize);
            this.context.lineTo((this.ant.x - 0.8 + this.cellNumber / 2) * this.cellSize, (this.ant.y - 0.5 + this.cellNumber / 2) *  this.cellSize);
            break;
        }

        this.context.fillStyle = 'red';
        this.context.fill();
    }

    moveAnt() {
        // If plays reversed, first go back to previous cell
        if(this.isReversed) {
            switch (this.ant.direction) {
            case this.DIRECTION_UP:
                this.ant.y += 1;
                break;
            case this.DIRECTION_BOTTOM:
                this.ant.y -= 1;
                break;
            case this.DIRECTION_LEFT:
                this.ant.x += 1;
                break;
            case this.DIRECTION_RIGHT:
                this.ant.x -= 1;
                break;
            }
        }

        // Checks current cell color
        var currentColor = this.cellList.hasOwnProperty(this.ant.x + '|' + this.ant.y) ? (this.cellList[this.ant.x + '|' + this.ant.y]) : this.initialGridColor;
        // Changes current cell color
        var newCellColor = this.isReversed ? (currentColor + this.colorList.length - 1) % this.colorList.length : (currentColor + 1) % this.colorList.length;
        this.cellList[this.ant.x + '|' + this.ant.y] = newCellColor;

        // Checks if ant is in grid bounds
        if(Math.abs(this.ant.x) >= this.cellNumber / 2 || Math.abs(this.ant.y) >= this.cellNumber / 2) {
            this.zoom *= 2;
            this.setZoom();
        }

        this.context.fillStyle = this.colorList[newCellColor].color;
        this.context.fillRect((this.ant.x - 1 + this.cellNumber / 2) * this.cellSize, (this.ant.y - 1 + this.cellNumber / 2) * this.cellSize, this.cellSize, this.cellSize);

        // Moves the ant to next cell
        var newDirection = this.colorList[currentColor].direction;

        // Updates ant direction from color
        switch (this.ant.direction) {
        case this.DIRECTION_UP:
            this.ant.direction = newDirection;
            break;
        case this.DIRECTION_BOTTOM:
            this.ant.direction = newDirection === this.DIRECTION_LEFT ? this.DIRECTION_RIGHT : this.DIRECTION_LEFT;
            break;
        case this.DIRECTION_LEFT:
            this.ant.direction = newDirection === this.DIRECTION_LEFT ? this.DIRECTION_BOTTOM : this.DIRECTION_UP;
            break;
        case this.DIRECTION_RIGHT:
            this.ant.direction = newDirection === this.DIRECTION_LEFT ? this.DIRECTION_UP : this.DIRECTION_BOTTOM;
            break;
        }

        // Moves ant to next cell (according to new direction)
        if(!this.isReversed) {
            switch (this.ant.direction) {
            case this.DIRECTION_UP:
                this.ant.y -= 1;
                break;
            case this.DIRECTION_BOTTOM:
                this.ant.y += 1;
                break;
            case this.DIRECTION_LEFT:
                this.ant.x -= 1;
                break;
            case this.DIRECTION_RIGHT:
                this.ant.x += 1;
                break;
            }
        }

        if(this.isPaused) {
            this.drawAnt();
            return;
        }
        if(++this.stepNumber % this.speed !== 0) {
            this.moveAnt();
        } else {
            this.drawAnt();
            this.stepNumberElement.innerText = this.stepNumber;
            this.moveTimeout = setTimeout(() => {
                this.moveAnt();
            }, this.speed < 1 ? 50 / this.speed : 0);
        }
    }

    setSpeedLabel() {
        var speedLabel = this.speed;
        if(speedLabel < 1) {
            speedLabel = '1/' + (1 / speedLabel);
        }
        this.speedLabel.innerText = speedLabel;
    }
    
    setZoomLabel() {
        var speedLabel = this.speed;
        if(speedLabel < 1) {
            speedLabel = '1/' + (1 / speedLabel);
        }
        this.speedLabel.value = speedLabel;
    }
    
    // Updates zoom, sets cell size, launch redraw
    setZoom() {
        this.cellNumber = this.INITIAL_CELL_NUMBER * this.zoom;
        this.cellSize = (this.canvas.width - 1) / (this.cellNumber);
        this.redraw();
    }
    
    // Redraws the whole scene
    redraw() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for(var cellIndex in this.cellList) {
            var coordinates = cellIndex.split('|');
            this.context.fillStyle = this.colorList[this.cellList[cellIndex]].color;
            this.context.fillRect((coordinates[0] - 1 + this.cellNumber / 2) * this.cellSize, (coordinates[1] - 1 + this.cellNumber / 2) * this.cellSize, this.cellSize, this.cellSize);
        }
    }
}

new LangtonAnt();