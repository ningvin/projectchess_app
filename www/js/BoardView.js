/**
 * 3D View of the Board
 * @constructor
 * @param {Chess} chess
 * @param {Object} domElement - DOM element to append the renderer to
 * @param {finishedCallback} onFinishLoadingCallback - Called after loading finished
 */
var BoardView = function (chess, domElement, onFinishLoadingCallback) {
	
    //==============================
    // Constants ===================
    //==============================
    
	var ASSET_DIR = "assets/";
	
	var CAMERA_MIN_DIST = 14;
	var CAMERA_MAX_DIST = 55;
	
	var TILE_COUNT = 8;
	
	var MAX_HEIGHT = 4.5;
	
	var COLOR = {
		HIGHLIGHT_POSITIVE: new THREE.Vector4(0.0, 1.0, 0.0, 1.0),
		HIGHLIGHT_NEUTRAL: new THREE.Vector4(1.0, 1.0, 0.0, 1.0),
		HIGHLIGHT_NEGATIVE: new THREE.Vector4(1.0, 0.0, 0.0, 1.0)
	};
	
	var TILE_OFFSET, STEP;
	
	var ROTATION_Y = {
		w: _radians(180),
		b: 0
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
    
    //==============================
    // Variables ===================
    //==============================
	
	var _scene, _renderer, _controls;
	var _highlightScene, _overlayScene;
	
	var _currentSelection = {
		active: false,
		coords: null,
		highlightMesh: null,
		overlayMesh: null
	};
	
	var _selectionMode = {
		active: false,
		color: null,
		onSelectedCallback: null
	}
	
	var _cameraParentY, _cameraParentX, _camera;
	
	var _board, raycaster;
	
	var _textures = {};
	var _geometries = {};
	var _materials = {};
	
	var _offsetX, _offsetY;
	
	var _internalBoard = [
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null],
		[null, null, null, null, null, null, null, null]
	];
	
	var _highlights = [];
	
	var _cameraState = {
		isMoving: false
	};
    
    //==============================
    // Initialization ==============
    //==============================
	
	function _init() {
		var manager = new THREE.LoadingManager(),
			textureLoader = new THREE.TextureLoader(manager),
			objectLoader = new THREE.ObjectLoader(manager);
			
		raycaster = new THREE.Raycaster();
			
		_createScene();
		_createCamera();
		_createRenderer();
		
		manager.onLoad = _onFinishedLoading;
		objectLoader.load(ASSET_DIR + "scenes/board_and_pieces.json", function (loadedObj) {
			_extractGeometry(loadedObj);
			_createHighlights();
		});
		textureLoader.load(ASSET_DIR + "textures/chess_texture_base.png", function (texture) {
			texture.minFilter = texture.magFilter = THREE.NearestFilter;
			_textures.board = texture;
		});
		textureLoader.load(ASSET_DIR + "textures/wood_texture.png", function (texture) {
			_textures.frame = texture;
		});
		
		window.addEventListener('resize', _onWindowResize, false);
		
		domElement.appendChild(_renderer.domElement);
		_renderer.domElement.onclick = _onClick;
		
		TweenLite.ticker.addEventListener("tick", _onTick);
	}
    
    function _createScene() {
		var spotLight, dirLight,
			spotLight2, dirLight2;
		
		_scene = new THREE.Scene();
		_highlightScene = new THREE.Scene();
		_overlayScene = new THREE.Scene();
		
		_scene.add(new THREE.AmbientLight(0x505050));
		spotLight = new THREE.SpotLight(0xffffff);
		spotLight.angle = Math.PI / 5;
		spotLight.penumbra = 0.2;
		spotLight.position.set(8, 8, 8);
		_scene.add(spotLight);
		dirLight = new THREE.DirectionalLight(0x55505a, 1);
		dirLight.position.set(0, 3, 0);
		dirLight.castShadow = false;
		_scene.add(dirLight);
		
		_overlayScene.add(new THREE.AmbientLight(0x505050));
		spotLight2 = spotLight.clone();
		spotLight2.position = spotLight.position;
		_overlayScene.add(spotLight2);
		dirLight2 = dirLight.clone();
		dirLight2.position = dirLight.position;
		_overlayScene.add(dirLight2);
	}
	
	function _createCamera() {
		var boundingRect = domElement.getBoundingClientRect();
		
		_cameraParentY = new THREE.Group();
		_cameraParentX = new THREE.Group();
		
		_camera = new THREE.PerspectiveCamera(
			36, boundingRect.width / boundingRect.height, 0.25, 100);
		_camera.position.set(0, 0, 18);
		
		_cameraParentY.add(_cameraParentX);
		_cameraParentX.add(_camera);
		
		_cameraParentY.rotateY(_radians(90));
		_cameraParentX.rotateX(_radians(-45));
		
		_scene.add(_cameraParentY);
	}
	
	function _createRenderer() {
		var boundingRect = domElement.getBoundingClientRect();
		_renderer = new THREE.WebGLRenderer();
		_renderer.shadowMap.enabled = false;
		_renderer.setPixelRatio(window.devicePixelRatio);
		_renderer.setSize(boundingRect.width, boundingRect.height);
		_renderer.setClearColor(0x4286f4);
		_renderer.autoClear = false;
	}
	
	function _extractGeometry(loadedObj) {
		var board = loadedObj.getObjectByName("Board").geometry,
			bbox, center, width;
		_geometries.board = board;
		_geometries.frame = _convertGeometry(loadedObj.getObjectByName("Board_Frame").geometry);
		_geometries.p = _convertGeometry(loadedObj.getObjectByName("Pawn").geometry);
		_geometries.r = _convertGeometry(loadedObj.getObjectByName("Rook").geometry);
		_geometries.n = _convertGeometry(loadedObj.getObjectByName("Knight").geometry);
		_geometries.k = _convertGeometry(loadedObj.getObjectByName("King").geometry);
		_geometries.q = _convertGeometry(loadedObj.getObjectByName("Queen").geometry);
		_geometries.b = _convertGeometry(loadedObj.getObjectByName("Bishop").geometry);
		
		console.log(_geometries.n);
		
		if (board.boundingBox === null) {
			board.computeBoundingBox();
		}
		
		bbox = board.boundingBox.clone();
		center = bbox.getCenter();
		
		_cameraParentY.position.set(center.x, center.y, center.z);
		
		width = bbox.getSize().x;
		
		STEP = width / TILE_COUNT;
		TILE_OFFSET = STEP / 2;
		
	}
	
	function _convertGeometry(bufferGeometry) {
		var geometry = new THREE.Geometry().fromBufferGeometry(bufferGeometry);
		geometry.computeFaceNormals();
		geometry.mergeVertices();
		geometry.computeVertexNormals();
		return geometry;
	}
	
	function _createMaterials() {
		_materials.board = new THREE.MeshBasicMaterial({
			map: _textures.board
		});
		_materials.frame = new THREE.MeshLambertMaterial({
			map: _textures.frame,
			shading: THREE.FlatShading
		});
		_materials.w = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			shading: THREE.FlatShading
		});
		_materials.b = new THREE.MeshPhongMaterial({
			color: 0x222222,
			shading: THREE.FlatShading
		});
	}
	
	function _createBoard() {
		var frame = new THREE.Mesh(_geometries.frame, _materials.frame);
		_board = new THREE.Mesh(_geometries.board, _materials.board);
			
		_scene.add(_board);
		_scene.add(frame);
	}
	
	function _createHighlights() {
		var x, y, highlight, position;
		var highlightGeometry = new THREE.PlaneGeometry(STEP, STEP);
		var highlightMaterial = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			opacity: 0.5,
			transparent: true
		});
		var euler = new THREE.Euler(-_radians(90), 0, 0);
		for (x = 0; x < TILE_COUNT; x++) {
			_highlights[x] = [];
			for (y = 0; y < TILE_COUNT; y++) {
				highlight = new THREE.Mesh(highlightGeometry, highlightMaterial.clone());
				_highlights[x][y] = {
					mesh: highlight,
					move: null
				};
				position = _boardToWorld(x, y);
				highlight.position.x = position.x;
				highlight.position.y = 0.02;
				highlight.position.z = position.z;
				highlight.setRotationFromEuler(euler);
				highlight.visible = false;
				_scene.add(highlight);
			}
		}
	}
	
	function _onFinishedLoading() {
		_createMaterials();
		_createBoard();
		_applyPosition(chess.board());
		onFinishLoadingCallback();
	}
	
    //==============================
    // Click Handler ===============
    //==============================
    
	function _onClick(event) {
		var intersects, point, coords,
			piece, turnsPossible, color,
			trans, san;
		
		if (!_selectionMode.active) {
			return;
		}
		
		trans = _transformMousePosition(event);
		raycaster.setFromCamera(trans, _camera);
		intersects = raycaster.intersectObject(_board, false);
		
		if (intersects.length > 0) {
			point = intersects[0].point;
			coords = _worldToBoard(point.x, point.y, point.z);
			
			if (_currentSelection.active && _isFieldHighlighted(coords)) {
				_chooseMove(_getMove(coords));
				_selectMesh(null);
				return;
			}
			
			piece = _getPieceAt(coords);
			if (piece !== null) {
				san = _vectorToSan(coords);
				if (_isPieceSelectable(san)) {
					turnsPossible = _highlightPossibleMoves(san);
					color = turnsPossible ? COLOR.HIGHLIGHT_POSITIVE : COLOR.HIGHLIGHT_NEUTRAL;
					_selectMesh(piece, coords, color);
				} else {
					_selectMesh(null);
				}
			} else {
				_selectMesh(null);
			}
		}
	}
    
    //==============================
    // Piece selection =============
    //==============================
	
	function _selectMesh(mesh, coords, color) {
		var highlightMesh, overlayMesh;
		
		if (typeof color === "undefined" || color === null) {
			color = COLOR.HIGHLIGHT_POSITIVE;
		}
		
		if (_currentSelection.highlightMesh !== null) {
			_highlightScene.remove(_currentSelection.highlightMesh);
		}
		if (_currentSelection.overlayMesh !== null) {
			_overlayScene.remove(_currentSelection.overlayMesh);
		}
		
		if (mesh !== null) {
			highlightMesh = mesh.clone();
			highlightMesh.material = HIGHLIGHT_MATERIAL;
			highlightMesh.material.uniforms.color.value = color;
			
			overlayMesh = mesh.clone();
			
			_currentSelection.highlightMesh = highlightMesh;
			_currentSelection.overlayMesh = overlayMesh;
			
			_highlightScene.add(highlightMesh);
			_overlayScene.add(overlayMesh);
			
			_currentSelection.coords = coords;
			_currentSelection.active = true;
		} else {
			_clearHighlights();
			_currentSelection.active = false;
		}
	}
	
	function _isPieceSelectable(san) {
		return _selectionMode.active === true
				&& chess.get(san).color === _selectionMode.color;
	}
	
	function _isFieldHighlighted(coords) {
		return _highlights[coords.x][coords.y].mesh.visible;
	}
	
	function _chooseMove(move) {
		_selectionMode.active = false;
		_selectionMode.onSelectedCallback(move);
		_selectionMode.onSelectedCallback = null;
	}
	
	function _getMove(coords) {
		return _highlights[coords.x][coords.y].move;
	}
    
    //==============================
    // Utility function ============
    //==============================
	
	function _radians(degrees) {
		return degrees * (Math.PI/180);
	}
	
	function _degress(radians) {
		return radians * (180/Math.PI);
	}
    
    //==============================
    // Resizing ====================
    //==============================
	
	function _applyBounds(x, y, width, height) {
		_offsetX = x;
		_offsetY = y;
		
		_camera.aspect = width / height;
		_camera.updateProjectionMatrix();
		_renderer.setSize(width, height);
	}
	
	function _onWindowResize() {
		var boundingRect = domElement.getBoundingClientRect();
		_applyBounds(boundingRect.x, boundingRect.y,
				boundingRect.width, boundingRect.height);
	}
    
    //==============================
    // Update & Render =============
    //==============================
	
	function _update() {
		
	}
	
	function _render() {
		_renderer.clear();
		_renderer.render(_scene, _camera);
		_renderer.clearDepth();
		_renderer.render(_highlightScene, _camera);
		_renderer.clearDepth();
		_renderer.render(_overlayScene, _camera);
	}
	
	function _onTick() {
		_update();
		_render();
	}
    
    //==============================
    // Coordinate conversion =======
    //==============================
	
	function _transformMousePosition(event) {
		var rect = _renderer.domElement.getBoundingClientRect();
		return {
			x: ((event.clientX - rect.left) / (rect.width - rect.left)) * 2 - 1,
			y: -(( event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1
		};
	}
	
	function _sanToVector(san) {
		return {
			x: san.charCodeAt(0) - 97,
            y: parseInt(san.charAt(1)) - 1
		}
	}
	
	function _vectorToSan(vector) {
		return String.fromCharCode(vector.x + 97) + (1 + vector.y);
	}
	
	function _boardToWorld(x, y) {
		return {
			x: (TILE_OFFSET + x * STEP),
			y: 0,
			z: -(TILE_OFFSET + y * STEP)
		};
	}
	
	function _worldToBoard(x, y, z) {
		return {
			x: Math.floor(x / STEP),
			y: Math.floor(-z / STEP)
		}
	}
    //==============================
    // Piece manipulation ==========
    //==============================
	
	function _spawnPiece(piece, x, y) {
		var mesh = new THREE.Mesh(_geometries[piece.type], _materials[piece.color]),
			position = _boardToWorld(x, y),
			euler = new THREE.Euler(0, ROTATION_Y[piece.color], 0);
		// Transform
		mesh.position.x = position.x;
		mesh.position.z = position.z;
		mesh.setRotationFromEuler(euler);
		_scene.add(mesh);
		_internalBoard[x][y] = mesh;
	}
	
	function _applyPosition(board) {
		var width = board.length,
			height = board[0].length,
			x, y;
			
		for (x = 0; x < width; x++) {
			for (y = 0; y < height; y++) {
				var piece = board[x][y];
				if (piece !== null) {
					_spawnPiece(piece, y, 7 - x);
				}
			}
		}
	}
	
	function _getPieceAt(coords) {
		return _internalBoard[coords.x][coords.y];
	}
	
	function _setPieceAt(coords, piece) {
		_internalBoard[coords.x][coords.y] = piece;
	}
    
    function _removePieceAt(coords) {
        var piece = _getPieceAt(coords);
        _setPieceAt(coords, null);
        _scene.remove(piece);
    }
    
    //==============================
    // Move related ================
    //==============================
    
    function _isFlagSet(move, flag) {
        return move.flags.indexOf(flag) != -1;
    }
    
    function _isCapture(move) {
        return _isFlagSet(move, 'c') || _isFlagSet(move, 'e');
    }
    
    function _getCapturedPieceField(move) {
        if (_isFlagSet(move, 'e')) {
            var fromPos = _sanToVector(move.from);
            var toPos = _sanToVector(move.to);
            return {
                x: fromPos.y,
                y: toPos.x
            };
        } else {
            return _sanToVector(move.to);
        }
    }
    
    function _isPromotion(move) {
        return _isFlagSet(move, 'p');
    }
    
    function _isCastling(move) {
        return _isFlagSet(move, 'k') || _isFlagSet(move, 'q');
    }
    
    function _getCastlingTower(move) {
        var fromPos = _sanToVector(move.from);
        var coords = {
            x: fromPos.x + (_isFlagSet(move, 'k') ? 3 : -4),
            y: fromPos.y
        };
        return _getPieceAt(coords);
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
        var worldCoords = _boardToWorld(target.x, target.y);
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
                    _setPieceAt(target, piece);
                    onComplete();
                }
            });
        };
        
        _setPieceAt(source, null);
        rise();
    }
	
	function _animateMove(move, callback) {
		var sourceCoords = _sanToVector(move.from),
			targetCoords = _sanToVector(move.to);
            
		var piece = _getPieceAt(sourceCoords);
        
        var onBeforeLower = function(lower) {
            if (_isCapture(move)) {
                _removePieceAt(_getCapturedPieceField(move));
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
                _removePieceAt(targetCoords);
                _spawnPiece(move.promotion, targetCoords.x, targetCoords.y);
                callback();
            } else {
                callback();
            }
        };
        
        _movePiece(piece, sourceCoords, targetCoords, onBeforeLower, onComplete);
	}
    
    //==============================
    // Move Highlighting ===========
    //==============================
	
	function _highlightPossibleMoves(square) {
		_clearHighlights();
		var piece = chess.get(square);
		var mesh = _getPieceAt(_sanToVector(square));
		var moves = chess.moves({
			verbose: true,
			square: square
		});
		var i;
		
		for (i = 0; i < moves.length; i++) {
			_highlightSquare(moves[i]);
		}
		
		return moves.length > 0;
	}
	
	function _clearHighlights() {
		var x, y;
		for (x = 0; x < _highlights.length; x++) {
			for (y = 0; y < _highlights[x].length; y++) {
				_highlights[x][y].mesh.visible = false;
				_highlights[x][y].move = null;
			}
		}
	}
	
	function _highlightSquare(move) {
		var coords = _sanToVector(move.to);
		var mesh = _highlights[coords.x][coords.y].mesh;
		_highlights[coords.x][coords.y].move = move;
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
    
    //==============================
    // Validate parameters =========
    //==============================
	
	if (typeof chess === "undefined" || chess === null) {
		throw "Invalid parameter: chess is undefined or null";
	}
	
	if (typeof domElement === "undefined" || domElement === null) {
		throw "Invalid parameter: domElelemt is undefined or null";
		document.body.appendChild(_renderer.domElement);
	}
    
    //==============================
    // Start Initialization ========
    //==============================
	
	_init();
    
    //==============================
    // Returned Object (public) ====
    //==============================
	
	return {
        /**
         * Animate the given move
         * @param {Object} move
         * @param {finishedCallback} callback
         */
		animateMove: function(move, callback) {
			_animateMove(move, callback);
		},
        
        /**
         * Synchronize the BoardView with the current
         * state of the chess object
         */
		applyCurrentPosition: function() {
			_applyPosition(chess.board());
		},
        
        /**
         * Let the user interactively select the next move for
         * the pieces of the given color.
         * @param {string} color
         * @param {moveSelecetedCallback} onMoveSelectedCallback
         */
		selectMoveForColor: function(color, onMoveSelectedCallback) {
			_selectionMode.color = color;
			_selectionMode.onSelectedCallback = onMoveSelectedCallback;
			_selectionMode.active = true;
		},
        
        /**
         * Apply the given bounds to the renderer
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */
		applyBounds: function(x, y, width, height) {
			_applyBounds(x, y, width, height);
		},
        
        /**
         * Rotate the camera to the next spot in the given direction
         * @param {DIRECTIONS} dir - The direction to move the camera
         */
		moveCamera: function(dir) {
			var rotation;
			var lastValue;
			
			if (_cameraState.isMoving) return;
			
			_cameraState.isMoving = true;
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
							_cameraParentY.rotateY(-_radians(value * 2));
							break;
						case "right":
							_cameraParentY.rotateY(_radians(value * 2));
							break;
						case "up":
							_cameraParentX.rotateX(-_radians(value));
							break;
						case "down":
							_cameraParentX.rotateX(_radians(value));
							break;
						default:
							break;
					}
				},
				onComplete: function () {
					_cameraState.isMoving = false;
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
			var posZ = _camera.position.z;
			_camera.position.setComponent(2, Math.max(CAMERA_MIN_DIST, Math.min(CAMERA_MAX_DIST, posZ / factor)));
		},
        
        /**
         * Get a reference to the renderer's DOM element
         * @return {Object} reference
         */
		getRendererDomElement: function() {
			return _renderer.domElement;
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