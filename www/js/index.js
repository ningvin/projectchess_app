(function() {
    var app;

    var pageInitializers = {
        
        'main-menu': function(page) {
            page.querySelector('#loginbtn').onclick = function() {
                document.querySelector('#navigator').pushPage('pages/login.html');
            };

            page.querySelector('#regbtn').onclick = function() {
                document.querySelector('#navigator').pushPage('pages/register.html');
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
            page.querySelector('#loginbtn').onclick = function() {
                var data = {
                    alias: page.querySelector('#username').value,
                    password: page.querySelector('#password').value
                };
                console.log(data);
                ons.createDialog('dialogs/login_progress_dialog.html')
                    .then(function(dialog) {
                        dialog.show();
                        app.login(data, function(result) {
                            dialog.hide();
                            if (result) {
                                document.querySelector('#navigator').pushPage('pages/lobby.html');
                            } else {
                                ons.notification.alert('Login failed!');
                            }
                        });
                    });
                
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
        },
        
        'lobby-page': function(page) {
            var list = page.querySelector('#lobby-player-list');
            var players = [];
            var waitingDialog;
            
            var acceptInvite = function(userId) {
                ons.createDialog('dialogs/login_progress_dialog.html')
                    .then(function(dialog) {
                        waitingDialog = dialog;
                        dialog.querySelector('.dialog-caption').innerHTML = 'Waiting for opponent...';
                        dialog.show();
                        app.acceptInvite(userId);
                    });
            };
            
            var onGameInvite = function(msg) {
                ons.notification.confirm({
                    message: 'Invitation from ' + msg.userId,
                    buttonLabels: ['Decline', 'Accept'],
                    callback: function(selected) {
                        if (selected == 1) {
                            acceptInvite(msg.userId);
                        } else {
                            app.declineInvite(msg.userId);
                        }
                    }
                });
            };
            
            var onGameLaunch = function(msg) {
                console.log('game_launch received');
                waitingDialog.hide();
                waitingDialog = null;
                document.querySelector('#navigator').pushPage('pages/game.html');
            };
            
            var onGameResponse = function(msg) {
                console.log('Response:');
                console.log(msg);
                if (msg.accepted) {
                    app.launchGame();
                    document.querySelector('#navigator').pushPage('pages/game.html');
                } else {
                    ons.notification.alert(msg.id + 'declined your invitation!');
                }
            };
            
            list.delegate = {
                createItemContent: function(i) {
                    var id = players[i];
                    var item = ons._util.createElement(
                        '<ons-list-item tappable="">\
                            <div class="left">\
                                <ons-icon icon="md-face" class="list-item__icon"></ons-icon>\
                            </div>\
                            <div class="center">'
                                + id +
                            '</div>\
                        </ons-list-item>'
                    );
                    
                    item.onclick = function() {
                        app.sendInvite(id);
                    };
                    
                    return item;
                },
                
                countItems: function() {
                    return players.length;
                }
            };
            
            app.queryPlayersInLobby(function(users) {
                if (users != null) {
                    console.log(users.length);
                    players = users;
                    list.refresh();
                } else {
                    console.log('no users');
                }
                
                app.joinLobby();
            });
            
            app.on('game_invite', onGameInvite);
            app.on('game_launch', onGameLaunch);
            app.on('game_response', onGameResponse);
            app.on('join_lobby', function(msg) {
                players.push(msg.id);
                list.refresh();
            });
        }
        
    };

    ons.ready(function() {
        app = new App();
    });
        
    document.addEventListener('init', function(event) {
        var page = event.target;
        if (pageInitializers.hasOwnProperty(page.id)) {
            pageInitializers[page.id](page);
        }
    });
})();