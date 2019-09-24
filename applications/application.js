define(['globalize', 'loading', 'appSettings', 'focusManager', 'connectionManager', 'emby-scroller', 'emby-select', 'emby-button', 'emby-input', 'emby-textarea', 'emby-checkbox'], function (globalize, loading, appSettings, focusManager, connectionManager) {
    "use strict";

    return function (view, params) {

        var self = this;
        var player;
        var isNewPlayer;

        view.addEventListener('viewshow', function (e) {

            var isRestored = e.detail.isRestored;

            Emby.Page.setTitle(globalize.translate('Application'));

            loading.hide();

            if (!isRestored) {

                loadPlayer();
                renderSettings();

                focusManager.autoFocus(view);
            }
        });

        view.addEventListener('viewbeforehide', function (e) {

            if (!isNewPlayer) {

                var form = view.querySelector('form');

                if (form.checkValidity()) {
                    save();
                } else {
                    e.preventDefault();
                }
            }
        });

        view.querySelector('form').addEventListener('submit', function (e) {

            save();
            e.preventDefault();
            return false;
        });

        view.querySelector('.selectMediaType').addEventListener('change', onMediaTypeChange);

        // add event listener for game type (PC game)
        view.querySelector('.selectGameSystem').addEventListener('change', onGameSystemChange);

        function onMediaTypeChange(e) {
            var select = this;
            var mediaType = select.value;
            var fields = view.querySelectorAll('.mediaTypeField');
            for (var i = 0, length = fields.length; i < length; i++) {
                var fld = fields[i];
                if (fld.getAttribute('data-mediatype') === mediaType) {
                    fld.classList.remove('hide');
                } else {
                    fld.classList.add('hide');
                }
            }
        }

        //add function for additionnal field for PC game
        function onGameSystemChange(e) {
            var select = this;
            var GameSystem = select.value;
            var fields = view.querySelectorAll('.PCGame');

            for (var i = 0, length = fields.length; i < length; i++) {
                var fld = fields[i];
                if (fld.getAttribute('data-mediatype') == GameSystem) {
                    fld.classList.remove('hide');
                } else {
                    fld.classList.add('hide');
                }
            }

            var fields = view.querySelectorAll('.dosGame');

            for (var i = 0, length = fields.length; i < length; i++) {
                var fld = fields[i];
                if (fld.getAttribute('data-mediatype') == GameSystem) {
                    fld.classList.remove('hide');
                } else {
                    fld.classList.add('hide');
                }
            }
        }

        function loadPlayer() {

            player = null;

            if (params.id) {
                player = getPlayers().filter(function (p) {
                    return p.id === params.id;
                })[0];
            }

            if (player) {
                isNewPlayer = false;
            } else {
                isNewPlayer = true;
                player = {};
                player['videotype-stream'] = false;
                player['videotype-file'] = false;
            }
        }

        function save() {
            player.mediaType = view.querySelector('.selectMediaType').value;
            player.path = view.querySelector('.txtPath').value;
            var recurv = /(?:\.([^.]+))?$/;
            var ext = recurv.exec(player.path)[1];

            var args = view.querySelector('.txtArguments').value.trim();

            if (args) {
                player.arguments = args.split('\n');
            } else {
                player.arguments = [];
            }

            if (ext != 'exe' && ext != 'com' && ext != 'bat') {
                if (args[0] == '') {
                    args = [];
                }
                var argtounshift = 'start ' + player.path + ' && taskkill /f /im electron.exe';
                player.arguments.unshift('/c', argtounshift);
                player.path = 'c:\\windows\\system32\\cmd.exe';
            }

            var i, length;

            var chkVideoTypes = view.querySelectorAll('.videoType');
            for (i = 0, length = chkVideoTypes.length; i < length; i++) {
                var chkVideoType = chkVideoTypes[i];
                player['videotype-' + chkVideoType.getAttribute('data-type')] = chkVideoType.checked;
            }

            var players = getPlayers();

            if (isNewPlayer) {
                player.id = new Date().getTime().toString();
                players.push(player);
            } else {
                var index = -1;
                for (i = 0, length = players.length; i < length; i++) {
                    if (players[i].id === player.id) {
                        index = i;
                        break;
                    }
                }

                if (index === -1) {
                    players.push(player);
                } else {
                    players[i] = player;
                }
            }

            player.gameSystem = view.querySelector('.selectGameSystem').value;
            if (player.gameSystem == "PC") {
                player.gameName = view.querySelector('.selectPCGame').value;
            }
            if (player.gameSystem == "DOS") {
                player.gameName = view.querySelector('.selectDosGame').value;
            }
            appSettings.set('externalplayers', JSON.stringify(players));

            if (isNewPlayer) {
                Emby.Page.back();
            }
        }

        function getPlayers() {

            return JSON.parse(appSettings.get('externalplayers') || '[]');
        }

        function fillGameSystem(value) {

            connectionManager.currentApiClient().getGameSystems().then(function (gameSystems) {

                var selectGameSystem = view.querySelector('.selectGameSystem');

                selectGameSystem.innerHTML = gameSystems.map(function (g) {
                    return '<option value="' + g.Name + '">' + g.DisplayName + '</option>';

                }).join('');

                if (value) {
                    selectGameSystem.value = player.gameSystem;
                }
                if (player.gameSystem == 'PC' || player.gameSystem == 'DOS') {
                    onGameSystemChange.call(selectGameSystem);
                }
            });
        }

        var apiconnexion = connectionManager.currentApiClient();

        function getPCGames() {
            var options = {};

            var userId = apiconnexion.getCurrentUserId();
            if (userId) {
                options.userId = userId;
            }

            var url = apiconnexion.getUrl("/GameBrowser/Games/Windows", options);

            return apiconnexion.getJSON(url);
        };

        function getDosGames () {

            var options = {};

            var userId = apiconnexion.getCurrentUserId();
            if (userId) {
                options.userId = userId;
            }

            var url = apiconnexion.getUrl("/GameBrowser/Games/Dos", options);

            return apiconnexion.getJSON(url);
        };

        function fillPCGame(value) {

            getPCGames().then(function (PCGames) {
                console.log(PCGames);
                var selectPCGame = view.querySelector('.selectPCGame');
                selectPCGame.innerHTML = PCGames.GameTitles.map(function (g) {
                    console.log(g);
                    return '<option value="' + g + '">' + g + '</option>';

                }).join('');

                if (value) {
                    selectPCGame.value = player.gameName;
                }
            });
        }

        function fillDosGame(value) {

            getDosGames().then(function (dosGames) {
                var selectDosGame = view.querySelector('.selectDosGame');
                selectDosGame.innerHTML = dosGames.GameTitles.map(function (g) {
                    console.log(g);
                    return '<option value="' + g + '">' + g + '</option>';

                }).join('');

                if (value) {
                    selectDosGame.value = player.gameName;
                }
            });
        }

        function renderSettings() {

            if (isNewPlayer) {
                view.querySelector('.btnSave').classList.remove('hide');
            } else {
                view.querySelector('.btnSave').classList.add('hide');
            }

            var selectMediaType = view.querySelector('.selectMediaType');
            selectMediaType.value = player.mediaType || 'Video';
            onMediaTypeChange.call(selectMediaType);
            
            if (player.path == 'c:\\windows\\system32\\cmd.exe' && player.arguments[0] =='/c') {
                player.path = player.arguments[1].slice(0, -32);
                player.path = player.path.substr(6);
                player.arguments.splice(0, 2);
            }


            view.querySelector('.txtPath').value = player.path || '';
            view.querySelector('.txtArguments').value = (player.arguments || []).join('\n');

            var chkVideoTypes = view.querySelectorAll('.videoType');
            for (var i = 0, length = chkVideoTypes.length; i < length; i++) {
                var chkVideoType = chkVideoTypes[i];

                if (chkVideoType.getAttribute('data-type') === '3d') {
                    chkVideoType.checked = player['videotype-' + chkVideoType.getAttribute('data-type')] === true;
                } else {
                    chkVideoType.checked = player['videotype-' + chkVideoType.getAttribute('data-type')] !== false;
                }
            }

            fillGameSystem(player.gameSystem);
            fillPCGame(player.gameName);
            fillDosGame(player.gameName);
        }
    };

});