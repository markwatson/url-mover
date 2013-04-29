var storage = chrome.storage.local;

var pluginOptions = {
    options: {
        enabled: false,
        routes: []
    },

    saveSettings: function() {
        storage.set({'options': this.options}, function() {
            var notification = webkitNotifications.createNotification(
                'bulldozer48.png',
                'Saved!',
                'Your settings were saved...'
            );
            notification.show();
        });
    },

    loadSettings: function(f) {
        var self = this;

        storage.get('options', function(data) {
            if (data.hasOwnProperty("options")) {
                self.options = data.options;
            }
            f();
        });
    },

    attachEnable: function() {
        var self = this;

        $('#pluginEnabled').change(function() {
            self.options.enabled = $(this).is(':checked');
            self.saveSettings();
        });

        self.loadSettings(function() {
            if (self.options.enabled){
                $('#pluginEnabled').prop("checked", true);
            } else {
                $('#pluginEnabled').prop("checked", false);
            }
        });
    },

    attachRoutes: function() {
        var self = this;

        var loadRoutes = function() {
            var routes = [];
            if (self.options.routes) {
                for(var i = 0; i < self.options.routes.length; i++) {
                    var val = self.options.routes[i];
                    routes.push(val[0] + "," + val[1]);
                }
            }

            $("#redirects").val(routes.join('\n'));
        };

        $('#save_redirects').on('click', function(e) {
            self.options.routes = [];
            var redirects = $('#redirects').val().split('\n');
            for(var i = 0; i < redirects.length; i++) {
                parts = redirects[i].split(',');
                if (parts.length == 2) {
                    self.options.routes.push([parts[0].trim(), parts[1].trim()]);
                }
            }
            self.saveSettings();
            loadRoutes();

            return false;
        });

        self.loadSettings(loadRoutes);
    },

    setupRequestInterceptor: function() {
        var self = this;

        chrome.webRequest.onBeforeRequest.addListener(
            function(details) {
                if (self.options.enabled) {
                    var redirectTo = null;
                    for(var i = 0; i < self.options.routes.length; i++) {
                        var val = self.options.routes[i];

                        if (details.url.search(val[0]) != -1) {
                            redirectTo = details.url.replace(val[0], val[1]);
                        }
                    }

                    if (redirectTo != null) {
                        console.log("Redirecting: " + details.url + " to " + redirectTo);
                        return {redirectUrl: redirectTo};
                    }
                }

                return null;
            },
            {urls: ["<all_urls>"]},
            ["blocking"]);
    },

    attachControls: function() {
        this.attachEnable();
        this.attachRoutes();
    }
};

$(function(){
    pluginOptions.attachControls();
    pluginOptions.setupRequestInterceptor();
});