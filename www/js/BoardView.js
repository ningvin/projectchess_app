/**
 * 3D View of the Board
 * @constructor
 * @param {Chess} chess
 * @param {Object} domElement - DOM element to append the renderer to
 * @param {finishedCallback} onFinishLoadingCallback - Called after loading finished
 */
var BoardView = function (chess, domElement, onFinishLoadingCallback) {
	
	var ASSET_DIR = "assets/";
	
	var scene, renderer, controls;
	var highlightScene, overlayScene;
	
	var currentSelection = {
		active: false,
		coords: null,
		highlightMesh: null,
		overlayMesh: null
	};
	
	var selectionMode = {
		active: false,
		color: null,
		onSelectedCallback: null
	}
	
	var cameraParentY, cameraParentX, camera;
	
	var board, raycaster;
	
	var CAMERA_MIN_DIST = 14;
	var CAMERA_MAX_DIST = 55;
	
	var TILE_COUNT = 8;
	
	var MAX_HEIGHT = 4.5;
	
	var COLOR = {
		HIGHLIGHT_POSITIVE: new THREE.Vector4(0.0, 1.0, 0.0, 1.0),
		HIGHLIGHT_NEUTRAL: new THREE.Vector4(1.0, 1.0, 0.0, 1.0),
		HIGHLIGHT_NEGATIVE: new THREE.Vector4(1.0, 0.0, 0.0, 1.0)
	};
	
	var HIGHLIGHT_MATERIAL = new THREE.ShaderMaterial({
		uniforms: {
			scale: { value: 0.2 },
			color: { value: new THREE.Vector4(0.0, 1.0, 0.0, 1.0) }
		},
		vertexShader:
			"uniform float scale;\n" +
			"void main() {\n" +
			"	vec4 offsetPos = vec4(normal * scale + position, 1.0);\n" +
			"	gl_Position = projectionMatrix * modelViewMatrix * offsetPos;\n" +
			"}",
		fragmentShader:
			"uniform vec4 color;\n" +
			"void main() {\n" +
			"	gl_FragColor = color;\n" +
			"}"
	});
	
	var textures = {};
	var geometries = {};
	var materials = {};
	
	var offsetX, offsetY;
	
	var internalBoard = [
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null]
	];
	
	var highlights = [];
	
	var TILE_OFFSET, STEP;
	
	var ROTATION_Y = {
		w: radians(180),
		b: 0
	};
	
	var cameraState = {
		isMoving: false
	};
	
	function init() {
		var manager = new THREE.LoadingManager(),
			textureLoader = new THREE.TextureLoader(manager),
			objectLoader = new THREE.ObjectLoader(manager);
			
		raycaster = new THREE.Raycaster();
			
		createScene();
		createCamera();
		createRenderer();
		
		manager.onLoad = onFinishedLoading;
		objectLoader.load(ASSET_DIR + "scenes/board_and_pieces.json", function (loadedObj) {
			extractGeometry(loadedObj);
			createHighlights();
		});
		textureLoader.load(ASSET_DIR + "textures/chess_texture_base.png", function (texture) {
			texture.minFilter = texture.magFilter = THREE.NearestFilter;
			textures.board = texture;
		});
		textureLoader.load(ASSET_DIR + "textures/wood_texture.png", function (texture) {
			textures.frame = texture;
		});
		
		window.addEventListener('resize', onWindowResize, false);
		
		domElement.appendChild(renderer.domElement);
		renderer.domElement.onclick = onClick;
		
		TweenLite.ticker.addEventListener("tick", onTick);
	}
	
	function onClick(event) {
		var intersects, point, coords,
			piece, turnsPossible, color,
			trans, san;
		
		if (!selectionMode.active) {
			return;
		}
		
		trans = transformMousePosition(event);
		raycaster.setFromCamera(trans, camera);
		intersects = raycaster.intersectObject(board, false);
		
		if (intersects.length > 0) {
			point = intersects[0].point;
			coords = worldToBoard(point.x, point.y, point.z);
			
			if (currentSelection.active && isFieldHighlighted(coords)) {
				chooseMove(getMove(coords));
				selectMesh(null);
				return;
			}
			
			piece = pieceAt(coords);
			if (piece !== null) {
				san = vectorToSan(coords);
				if (isPieceSelectable(san)) {
					turnsPossible = highlightPossibleMoves(san);
					color = turnsPossible ? COLOR.HIGHLIGHT_POSITIVE : COLOR.HIGHLIGHT_NEUTRAL;
					selectMesh(piece, coords, color);
				} else {
					selectMesh(null);
				}
			} else {
				selectMesh(null);
			}
		}
	}
	
	function transformMousePosition(event) {
		var rect = renderer.domElement.getBoundingClientRect();
		return {
			x: ((event.clientX - rect.left) / (rect.width - rect.left)) * 2 - 1,
			y: -(( event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1
		};
	}
	
	function isPieceSelectable(san) {
		return selectionMode.active === true
				&& chess.get(san).color === selectionMode.color;
	}
	
	function isFieldHighlighted(coords) {
		return highlights[coords.x][coords.y].mesh.visible;
	}
	
	function chooseMove(move) {
		selectionMode.active = false;
		selectionMode.onSelectedCallback(move);
		selectionMode.onSelectedCallback = null;
	}
	
	function getMove(coords) {
		return highlights[coords.x][coords.y].move;
	}
	
	function radians(degrees) {
		return degrees * (Math.PI/180);
	}
	
	function degress(radians) {
		return radians * (180/Math.PI);
	}
	
	function createScene() {
		var spotLight, dirLight,
			spotLight2, dirLight2;
		
		scene = new THREE.Scene();
		highlightScene = new THREE.Scene();
		overlayScene = new THREE.Scene();
		
		scene.add(new THREE.AmbientLight(0x505050));
		spotLight = new THREE.SpotLight(0xffffff);
		spotLight.angle = Math.PI / 5;
		spotLight.penumbra = 0.2;
		spotLight.position.set(8, 8, 8);
		scene.add(spotLight);
		dirLight = new THREE.DirectionalLight(0x55505a, 1);
		dirLight.position.set(0, 3, 0);
		dirLight.castShadow = false;
		scene.add(dirLight);
		
		overlayScene.add(new THREE.AmbientLight(0x505050));
		spotLight2 = spotLight.clone();
		spotLight2.position = spotLight.position;
		overlayScene.add(spotLight2);
		dirLight2 = dirLight.clone();
		dirLight2.position = dirLight.position;
		overlayScene.add(dirLight2);
	}
	
	function createCamera() {
		var boundingRect = domElement.getBoundingClientRect();
		
		cameraParentY = new THREE.Group();
		cameraParentX = new THREE.Group();
		
		camera = new THREE.PerspectiveCamera(
			36, boundingRect.width / boundingRect.height, 0.25, 100);
		camera.position.set(0, 0, 18);
		
		cameraParentY.add(cameraParentX);
		cameraParentX.add(camera);
		
		cameraParentY.rotateY(radians(90));
		cameraParentX.rotateX(radians(-45));
		
		scene.add(cameraParentY);
	}
	
	function createRenderer() {
		var boundingRect = domElement.getBoundingClientRect();
		renderer = new THREE.WebGLRenderer();
		renderer.shadowMap.enabled = false;
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(boundingRect.width, boundingRect.height);
		renderer.setClearColor(0x4286f4);
		renderer.autoClear = false;
	}
	
	function extractGeometry(loadedObj) {
		var board = loadedObj.getObjectByName("Board").geometry,
			bbox, center, width;
		geometries.board = board;
		geometries.frame = convertGeometry(loadedObj.getObjectByName("Board_Frame").geometry);
		geometries.p = convertGeometry(loadedObj.getObjectByName("Pawn").geometry);
		geometries.r = convertGeometry(loadedObj.getObjectByName("Rook").geometry);
		geometries.n = convertGeometry(loadedObj.getObjectByName("Knight").geometry);
		geometries.k = convertGeometry(loadedObj.getObjectByName("King").geometry);
		geometries.q = convertGeometry(loadedObj.getObjectByName("Queen").geometry);
		geometries.b = convertGeometry(loadedObj.getObjectByName("Bishop").geometry);
		
		console.log(geometries.n);
		
		if (board.boundingBox === null) {
			board.computeBoundingBox();
		}
		
		bbox = board.boundingBox.clone();
		center = bbox.getCenter();
		
		cameraParentY.position.set(center.x, center.y, center.z);
		
		width = bbox.getSize().x;
		
		STEP = width / TILE_COUNT;
		TILE_OFFSET = STEP / 2;
		
	}
	
	function convertGeometry(bufferGeometry) {
		var geometry = new THREE.Geometry().fromBufferGeometry(bufferGeometry);
		geometry.computeFaceNormals();
		geometry.mergeVertices();
		geometry.computeVertexNormals();
		return geometry;
	}
	
	function createMaterials() {
		materials.board = new THREE.MeshBasicMaterial({
			map: textures.board
		});
		materials.frame = new THREE.MeshLambertMaterial({
			map: textures.frame,
			shading: THREE.FlatShading
		});
		materials.w = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			shading: THREE.FlatShading
		});
		materials.b = new THREE.MeshPhongMaterial({
			color: 0x222222,
			shading: THREE.FlatShading
		});
	}
	
	function createBoard() {
		var frame = new THREE.Mesh(geometries.frame, materials.frame);
		board = new THREE.Mesh(geometries.board, materials.board);
			
		scene.add(board);
		scene.add(frame);
	}
	
	function createHighlights() {
		var x, y, highlight, position;
		var highlightGeometry = new THREE.PlaneGeometry(STEP, STEP);
		var highlightMaterial = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			opacity: 0.5,
			transparent: true
		});
		var euler = new THREE.Euler(-radians(90), 0, 0);
		for (x = 0; x < TILE_COUNT; x++) {
			highlights[x] = [];
			for (y = 0; y < TILE_COUNT; y++) {
				highlight = new THREE.Mesh(highlightGeometry, highlightMaterial.clone());
				highlights[x][y] = {
					mesh: highlight,
					move: null
				};
				position = boardToWorld(x, y);
				highlight.position.x = position.x;
				highlight.position.y = 0.02;
				highlight.position.z = position.z;
				highlight.setRotationFromEuler(euler);
				highlight.visible = false;
				scene.add(highlight);
			}
		}
	}
	
	function onFinishedLoading() {
		createMaterials();
		createBoard();
		applyPosition(chess.board());
		onFinishLoadingCallback();
	}
	
	function applyBounds(x, y, width, height) {
		offsetX = x;
		offsetY = y;
		
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
	}
	
	function onWindowResize() {
		var boundingRect = domElement.getBoundingClientRect();
		applyBounds(boundingRect.x, boundingRect.y,
				boundingRect.width, boundingRect.height);
	}
	
	function update() {
		
	}
	
	function render() {
		renderer.clear();
		renderer.render(scene, camera);
		renderer.clearDepth();
		renderer.render(highlightScene, camera);
		renderer.clearDepth();
		renderer.render(overlayScene, camera);
	}
	
	function onTick() {
		update();
		render();
	}
	
	function sanToVector(san) {
		return {
			x: san.charCodeAt(0) - 97,
            y: parseInt(san.charAt(1)) - 1
		}
	}
	
	function vectorToSan(vector) {
		return String.fromCharCode(vector.x + 97) + (1 + vector.y);
	}
	
	function boardToWorld(x, y) {
		return {
			x: (TILE_OFFSET + x * STEP),
			y: 0,
			z: -(TILE_OFFSET + y * STEP)
		};
	}
	
	function worldToBoard(x, y, z) {
		return {
			x: Math.floor(x / STEP),
			y: Math.floor(-z / STEP)
		}
	}
	
	function spawnPiece(piece, x, y) {
		var mesh = new THREE.Mesh(geometries[piece.type], materials[piece.color]),
			position = boardToWorld(x, y),
			euler = new THREE.Euler(0, ROTATION_Y[piece.color], 0);
		// Transform
		mesh.position.x = position.x;
		mesh.position.z = position.z;
		mesh.setRotationFromEuler(euler);
		scene.add(mesh);
		internalBoard[x][y] = mesh;
	}
	
	function applyPosition(board) {
		var width = board.length,
			height = board[0].length,
			x, y;
			
		for (x = 0; x < width; x++) {
			for (y = 0; y < height; y++) {
				var piece = board[x][y];
				if (piece !== null) {
					spawnPiece(piece, y, 7 - x);
				}
			}
		}
	}
	
	function pieceAt(coords) {
		return internalBoard[coords.x][coords.y];
	}
	
	function setPieceAt(coords, piece) {
		internalBoard[coords.x][coords.y] = piece;
	}
    
    function removePieceAt(coords) {
        var piece = pieceAt(coords);
        setPieceAt(coords, null);
        scene.remove(piece);
    }
	
	function selectMesh(mesh, coords, color) {
		var highlightMesh, overlayMesh;
		
		if (typeof color === "undefined" || color === null) {
			color = COLOR.HIGHLIGHT_POSITIVE;
		}
		
		if (currentSelection.highlightMesh !== null) {
			highlightScene.remove(currentSelection.highlightMesh);
		}
		if (currentSelection.overlayMesh !== null) {
			overlayScene.remove(currentSelection.overlayMesh);
		}
		
		if (mesh !== null) {
			highlightMesh = mesh.clone();
			highlightMesh.material = HIGHLIGHT_MATERIAL;
			highlightMesh.material.uniforms.color.value = color;
			
			overlayMesh = mesh.clone();
			
			currentSelection.highlightMesh = highlightMesh;
			currentSelection.overlayMesh = overlayMesh;
			
			highlightScene.add(highlightMesh);
			overlayScene.add(overlayMesh);
			
			currentSelection.coords = coords;
			currentSelection.active = true;
		} else {
			clearHighlights();
			currentSelection.active = false;
		}
	}
    
    function _isFlagSet(move, flag) {
        return move.flags.indexOf(flag) != -1;
    }
    
    function _isCapture(move) {
        return _isFlagSet(move, 'c') || _isFlagSet(move, 'e');
    }
    
    function _getCapturedPieceField(move) {
        if (_isFlagSet(move, 'e')) {
            var fromPos = sanToVector(move.from);
            var toPos = sanToVector(move.to);
            return {
                x: fromPos.y,
                y: toPos.x
            };
        } else {
            return sanToVector(move.to);
        }
    }
    
    function _isPromotion(move) {
        return _isFlagSet(move, 'p');
    }
    
    function _isCastling(move) {
        return _isFlagSet(move, 'k') || _isFlagSet(move, 'q');
    }
    
    function _getCastlingTower(move) {
        var fromPos = sanToVector(move.from);
        var coords = {
            x: fromPos.x + (_isFlagSet(move, 'k') ? 3 : -4),
            y: fromPos.y
        };
        return pieceAt(coords);
    }
    
    function _getCastlingTowerSource(move) {
        return {
            x: (_isFlagSet(move, 'k') ? 7 : 0),
            y: ((move.color === 'w') ? 0 : 7)
        };
    }
    
    function _getCastlingTowerTarget(move) {
        return {
            x: (_isFlagSet(move, 'k') ? 5 : 3),
            y: ((move.color === 'w') ? 0 : 7)
        };
    }
    
    function _movePiece(piece, source, target, onBeforeLower, onComplete) {
        var worldCoords = boardToWorld(target.x, target.y);
        var rise = function() {
            TweenLite.to(piece.position, 0.5, {
                y: MAX_HEIGHT,
                ease: Power1.easeInOut,
                onComplete: move
            });
        };
        var move = function() {
            TweenLite.to(piece.position, 0.5, {
                x: worldCoords.x,
                z: worldCoords.z,
                ease: Power1.easeInOut,
                onComplete: function() {
                    
                    if (onBeforeLower != null) {
                        onBeforeLower(lower);
                    } else {
                        lower();
                    }
                    
                }
            });
        };
        var lower = function() {
            TweenLite.to(piece.position, 0.5, {
                y: 0,
                ease: Power1.easeInOut,
                onComplete: function() {
                    setPieceAt(target, piece);
                    onComplete();
                }
            });
        };
        
        setPieceAt(source, null);
        rise();
    }
	
	function animateMove(move, callback) {
		var sourceCoords = sanToVector(move.from),
			targetCoords = sanToVector(move.to);
            
		var piece = pieceAt(sourceCoords);
        
        var onBeforeLower = function(lower) {
            if (_isCapture(move)) {
                removePieceAt(_getCapturedPieceField(move));
            }
            lower();
        };
        
        var onComplete = function() {
            if (_isCastling(move)) {
                var tower = _getCastlingTower(move);
                var towerSource = _getCastlingTowerSource(move);
                var towerTarget = _getCastlingTowerTarget(move);
                
                _movePiece(tower, towerSource, towerTarget, null, callback);
            } else if (_isPromotion(move)) {
                removePieceAt(targetCoords);
                spawnPiece(move.promotion, targetCoords.x, targetCoords.y);
                callback();
            } else {
                callback();
            }
        };
        
        _movePiece(piece, sourceCoords, targetCoords, onBeforeLower, onComplete);
	}
	
	function highlightPossibleMoves(square) {
		clearHighlights();
		var piece = chess.get(square);
		var mesh = pieceAt(sanToVector(square));
		var moves = chess.moves({
			verbose: true,
			square: square
		});
		var i;
		
		for (i = 0; i < moves.length; i++) {
			highlightSquare(moves[i]);
		}
		
		return moves.length > 0;
	}
	
	function clearHighlights() {
		var x, y;
		for (x = 0; x < highlights.length; x++) {
			for (y = 0; y < highlights[x].length; y++) {
				highlights[x][y].mesh.visible = false;
				highlights[x][y].move = null;
			}
		}
	}
	
	function highlightSquare(move) {
		var coords = sanToVector(move.to);
		var mesh = highlights[coords.x][coords.y].mesh;
		highlights[coords.x][coords.y].move = move;
        if (_isCapture(move)) {
            mesh.material.color.set(0xff0000);
        } else if (_isPromotion(move)) {
            mesh.material.color.set(0x0000ff);
        } else if (_isCastling(move)) {
            mesh.material.color.set(0xffff00);
        } else {
            mesh.material.color.set(0x00ff00);
        }
		mesh.visible = true;
	}
	
	if (typeof chess === "undefined" || chess === null) {
		throw "Invalid parameter: chess is undefined or null";
	}
	
	if (typeof domElement === "undefined" || domElement === null) {
		throw "Invalid parameter: domElelemt is undefined or null";
		document.body.appendChild(renderer.domElement);
	}
	
	init();
	
	return {
        /**
         * Animate the given move
         * @param {Object} move
         * @param {finishedCallback} callback
         */
		animateMove: function(move, callback) {
			animateMove(move, callback);
		},
        
        /**
         * Synchronize the BoardView with the current
         * state of the chess object
         */
		applyCurrentPosition: function() {
			applyPosition(chess.board());
		},
        
        /**
         * Let the user interactively select the next move for
         * the pieces of the given color.
         * @param {string} color
         * @param {moveSelecetedCallback} onMoveSelectedCallback
         */
		selectMoveForColor: function(color, onMoveSelectedCallback) {
			selectionMode.color = color;
			selectionMode.onSelectedCallback = onMoveSelectedCallback;
			selectionMode.active = true;
		},
        
        /**
         * Apply the given bounds to the renderer
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */
		applyBounds: function(x, y, width, height) {
			applyBounds(x, y, width, height);
		},
        
        /**
         * Rotate the camera to the next spot in the given direction
         * @param {DIRECTIONS} dir - The direction to move the camera
         */
		moveCamera: function(dir) {
			var rotation;
			var lastValue;
			
			if (cameraState.isMoving) return;
			
			cameraState.isMoving = true;
			rotation = {
				value: 0
			};
			lastValue = 0;
			
			TweenLite.to(rotation, 1, {
				value: 45,
				onUpdate: function () {
					var value = rotation.value - lastValue;
					lastValue = rotation.value;
					switch (dir) {
						case "left":
							cameraParentY.rotateY(-radians(value * 2));
							break;
						case "right":
							cameraParentY.rotateY(radians(value * 2));
							break;
						case "up":
							cameraParentX.rotateX(-radians(value));
							break;
						case "down":
							cameraParentX.rotateX(radians(value));
							break;
						default:
							break;
					}
				},
				onComplete: function () {
					cameraState.isMoving = false;
				}
			});
		},
        
        /**
         * Reset the camera to the default position for the
         * currently active color
         */
		resetCamera: function() {
			
		},
        
        /**
         * Dolly the camera by the given factor
         * @param {number} factor
         */
		dollyCamera: function(factor) {
			var posZ = camera.position.z;
			camera.position.setComponent(2, Math.max(CAMERA_MIN_DIST, Math.min(CAMERA_MAX_DIST, posZ / factor)));
		},
        
        /**
         * Get a reference to the renderer's DOM element
         * @return {Object} reference
         */
		getRendererDomElement: function() {
			return renderer.domElement;
		}
	};
};

/**
 * Called after a previously triggered process finished
 * @callback finishedCallback
 */
 
/**
 * Called after a chess move has been selected
 * @callback moveSelecetedCallback
 * @param {Object} move - The selected move, a valid chess.js move object
 */