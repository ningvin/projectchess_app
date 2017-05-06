/**
 * Handles user input to change the camera angle.
 * @constructor
 * @param {BoardView} board
 */
var CameraControls = function (board) {
	
	var DOLLY_SPEED = 1;
	
	var gestureManager;
	var enabled = true;
	var domElement;
	var oldScale = 1;
	
    /**
     * Enum for key codes
     * @readonly
     * @enum {number}
     */
	var KEYS = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };
    
    /**
     * Enum for camera directions
     * @readonly
     * @enum {string}
     */
	var DIRECTIONS = { LEFT: "left", RIGHT: "right", UP: "up", DOWN: "down" };
	
	function getDollyScale() {
		return Math.pow(0.95, DOLLY_SPEED);
	}
	
	function onMouseWheel(event) {
		var scale;
		
		if (!enabled) return;
		
		event.preventDefault();
		event.stopPropagation();
		
		scale = Math.pow(getDollyScale(), Math.sign(event.deltaY));
		
		board.dollyCamera(scale);
	}
	
	function onPinch(event) {
		if (event.type === "pinch") {
			var deltaScale = event.scale - oldScale;
			var scale = 1 + deltaScale;
			oldScale = event.scale;
			board.dollyCamera(scale);
		} else if (event.type === "pinchend") {
			oldScale = 1;
		}
	}
	
	function onSwipe(event) {
		if (!enabled) return;
		//event.srcEvent.stopPropagation();
		if (event.direction === Hammer.DIRECTION_LEFT) {
			board.moveCamera(DIRECTIONS.RIGHT);
		} else if (event.direction === Hammer.DIRECTION_RIGHT) {
			board.moveCamera(DIRECTIONS.LEFT);
		} else if (event.direction === Hammer.DIRECTION_UP) {
			board.moveCamera(DIRECTIONS.DOWN);
		} else if (event.direction === Hammer.DIRECTION_DOWN) {
			board.moveCamera(DIRECTIONS.UP);
		}
	}
	
	function onKeyDown(event) {
		if (!enabled) return;
		
		switch (event.keyCode) {
		
			case KEYS.UP:
				board.moveCamera(DIRECTIONS.UP);
				break;
			case KEYS.DOWN:
				board.moveCamera(DIRECTIONS.DOWN);
				break;
			case KEYS.LEFT:
				board.moveCamera(DIRECTIONS.LEFT);
				break;
			case KEYS.RIGHT:
				board.moveCamera(DIRECTIONS.RIGHT);
				break;
			default:
				break;
		}
	}
	
	domElement = board.getRendererDomElement();
	
	domElement.addEventListener("wheel", onMouseWheel, false);
	gestureManager = new Hammer.Manager(domElement, {
		//domEvents: true
	});
	gestureManager.add(new Hammer.Swipe(Hammer.DIRECTION_ALL));
	gestureManager.add(new Hammer.Pinch());
	gestureManager.on("swipe", onSwipe);
	gestureManager.on("pinch pinchend", onPinch);
	
	window.addEventListener("keydown", onKeyDown, false);
	
	return {
        /**
         * Enable or disable the CameraControls
         * @param {boolean} _enabled true to enable, false to disable
         */
		setEnabled: function (_enabled) {
			enabled = _enabled;
		},
        /**
         * @return {boolean} true if enabled, false if disabled
         */
		isEnabled: function () {
			return enabled;
		}
	};
};