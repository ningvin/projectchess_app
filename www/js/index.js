var pageInitializers = {
    
    'main-menu': function(page) {
        page.querySelector('#loginbtn').onclick = function() {
            document.querySelector('#navigator').pushPage('pages/login.html');
        };

        page.querySelector('#regbtn').onclick = function() {
            document.querySelector('#navigator').pushPage('pages/register.html');
        };
        
        page.querySelector('#game-button').onclick = function() {
            document.querySelector('#navigator').pushPage('pages/game.html');
        };
    },
    
    'register-page': function(page) {
        page.querySelector('ons-toolbar .center').innerHTML = 'Register';
        page.querySelector('#cancel-btn').onclick = function() {
            document.querySelector('#navigator').popPage();
        };
    },
    
    'login-page': function(page) {
        page.querySelector('ons-toolbar .center').innerHTML = 'Login';
        page.querySelector('#cancel-btn').onclick = function() {
            document.querySelector('#navigator').popPage();
        };
    },
    
    'game-page': function(page) {
        page.querySelector('ons-toolbar .center').innerHTML = 'Game';
        var rendererParent = document.getElementById("renderer_parent");
			
        var game = new Chess();
        var board = new BoardView(game, rendererParent, startGame);
        var currentColor = 'w';
        
        function startGame() {
            board.selectMoveForColor(currentColor, performMove);
        }
        
        function performMove(move) {
            game.move(move);
            board.animateMove(move, onFinishedAnimating);
        }
        
        function onFinishedAnimating() {
            nextColor();
            board.selectMoveForColor(currentColor, performMove);
        }
        
        function nextColor() {
            currentColor = (currentColor === 'w') ? 'b' : 'w';
        }
        
        var camControls = new CameraControls(board, rendererParent);
    }
    
};

ons.ready(function() {
    console.log("Onsen UI is ready!");
});
	
document.addEventListener('init', function(event) {
    var page = event.target;
    if (pageInitializers.hasOwnProperty(page.id)) {
        pageInitializers[page.id](page);
    }
});