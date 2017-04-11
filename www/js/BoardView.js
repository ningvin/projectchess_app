var BoardView = function (chess, domElement, onFinishLoadingCallback) {
	
	var ASSET_DIR = "assets/";
	
	var scene, renderer, camera, controls;
	
	var TILE_COUNT = 8;
	
	var MAX_HEIGHT = 4.5;
	
	var textures = {};
	var geometries = {};
	var materials = {};
	
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
	
	var OFFSET, STEP;
	
	var ROTATION_Y = {
		w: radians(180),
		b: 0
	};
	
	function init() {
		var manager = new THREE.LoadingManager(),
			textureLoader = new THREE.TextureLoader(manager),
			objectLoader = new THREE.ObjectLoader(manager);
			
		scene = createScene();
		createCamera();
		createRenderer();
		controls = new THREE.OrbitControls(camera, renderer.domElement);
		
		manager.onLoad = onFinishedLoading;
		objectLoader.load(ASSET_DIR + "scenes/board_and_pieces.json", function (loadedObj) {
			extractGeometry(loadedObj);
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
		
		TweenLite.ticker.addEventListener("tick", onTick);
	}
	
	function radians(degrees) {
		return degrees * (Math.PI/180);
	}
	
	function degress(radians) {
		return radians * (180/Math.PI);
	}
	
	function createScene() {
		var s = new THREE.Scene(),
			spotLight,
			dirLight;
		
		s.add(new THREE.AmbientLight(0x505050));
		spotLight = new THREE.SpotLight(0xffffff);
		spotLight.angle = Math.PI / 5;
		spotLight.penumbra = 0.2;
		spotLight.position.set(8, 8, 8);
		s.add(spotLight);
		dirLight = new THREE.DirectionalLight(0x55505a, 1);
		dirLight.position.set(0, 3, 0);
		dirLight.castShadow = false;
		s.add(dirLight);
		
		return s;
	}
	
	function createCamera() {
		camera = new THREE.PerspectiveCamera(
			36, window.innerWidth / window.innerHeight, 0.25, 100);
		camera.position.set(0, 3, 0);
		camera.rotation.set(0, -45, 0);
	}
	
	function createRenderer() {
		renderer = new THREE.WebGLRenderer();
		renderer.shadowMap.enabled = false;
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(0x4286f4);
	}
	
	function extractGeometry(loadedObj) {
		var board = loadedObj.getObjectByName("Board").geometry,
			bbox, center, width;
		geometries.board = board;
		geometries.frame = loadedObj.getObjectByName("Board_Frame").geometry;
		geometries.p = loadedObj.getObjectByName("Pawn").geometry;
		geometries.r = loadedObj.getObjectByName("Rook").geometry;
		geometries.n = loadedObj.getObjectByName("Knight").geometry;
		geometries.k = loadedObj.getObjectByName("King").geometry;
		geometries.q = loadedObj.getObjectByName("Queen").geometry;
		geometries.b = loadedObj.getObjectByName("Bishop").geometry;
		
		if (board.boundingBox === null) {
			board.computeBoundingBox();
		}
		
		bbox = board.boundingBox.clone();
		center = bbox.getCenter();
		
		controls.target.set(center.x, center.y, center.z);
		controls.update();
		
		width = bbox.getSize().x;
		
		STEP = width / TILE_COUNT;
		OFFSET = STEP / 2;
		
	}
	
	function createMaterials() {
		materials.board = new THREE.MeshBasicMaterial({
			map: textures.board
		});
		materials.frame = new THREE.MeshLambertMaterial({
			map: textures.frame,
			shading: THREE.FlatShading
		});
		materials.w = new THREE.MeshLambertMaterial({
			color: 0xffffff
		});
		materials.b = new THREE.MeshLambertMaterial({
			color: 0x222222//0x000000
		});
	}
	
	function createBoard() {
		var board = new THREE.Mesh(geometries.board, materials.board),
			frame = new THREE.Mesh(geometries.frame, materials.frame);
			
		scene.add(board);
		scene.add(frame);
	}
	
	function onFinishedLoading() {
		createMaterials();
		createBoard();
		applyPosition(chess.board());
		onFinishLoadingCallback();
	}
	
	function onWindowResize() {
		camera.aspect = domElement.clientWidth / domElement.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(domElement.clientWidth, domElement.clientHeight);
	}
	
	function update() {
		
	}
	
	function render() {
		renderer.render(scene, camera);
	}
	
	function onTick() {
		update();
		render();
	}
	
	function sanToVector(san) {
		return {
			x: parseInt(san.charAt(1)) - 1,
			y: san.charCodeAt(0) - 97
		}
	}
	
	function boardToWorld(x, y) {
		return {
			x: (OFFSET + x * STEP),
			y: 0,
			z: -(OFFSET + y * STEP)
		};
	}
	
	function worldToBoard(x, y, z) {
		
	}
	
	function spawnPiece(piece, x, y) {
		var mesh = new THREE.Mesh(geometries[piece.type], materials[piece.color]),
			position = boardToWorld(x, y),
			euler = new THREE.Euler(0, ROTATION_Y[piece.color], 0, "YXZ");
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
					spawnPiece(piece, x, y);
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
	
	function animateMove(move, callback) {
		var sourceCoords = sanToVector(move["from"]),
			targetCoords = sanToVector(move.to),
			piece, capture = false, promotion = false;
			
		piece = pieceAt(sourceCoords);
		if (move.hasOwnProperty("captured") && move.captured !== null) {
			capture = pieceAt(targetCoords);
		}
		if (move.hasOwnProperty("promotion") && move.captured !== null) {
			promotion = {
				type: move.promotion,
				color: move.color
			};
		}
		
		setPieceAt(sourceCoords, null);
		setPieceAt(targetCoords, piece);
		
		function movePiece() {
			var worldPos = boardToWorld(targetCoords.x, targetCoords.y);
			TweenLite.to(piece.position, 0.5, {
				x: worldPos.x,
				z: worldPos.z,
				ease: Power1.easeInOut,
				onComplete: lower
			});
		}
		
		function lower() {
			if (capture) {
				scene.remove(capture);
			}
			
			TweenLite.to(piece.position, 0.5, {
				y: 0,
				ease: Power1.easeInOut,
				onComplete: cleanup
			});
		}
		
		function cleanup() {
			if (promotion) {
				scene.remove(piece);
				spawnPiece(promotion, targetCoords.x, targetCoords.y);
			}
			callback();
		}
		
		TweenLite.to(piece.position, 0.5, {
			y: MAX_HEIGHT,
			ease: Power1.easeInOut,
			onComplete: movePiece
		});
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
		animateMove: function(move, callback) {
			animateMove(move, callback);
		},
		applyCurrentPosition: function() {
			
		},
		selectMoveForColor: function(color, onMoveSelectedCallback) {
			
		}
	};
};