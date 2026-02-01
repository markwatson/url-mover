var storage = chrome.storage.local;

var pluginOptions = {
    options: {
        enabled: false,
        routes: []
    },

    saveSettings: function() {
        var self = this;
        storage.set({'options': this.options}, function() {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'bulldozer48.png',
                title: 'Saved!',
                message: 'Your settings were saved...'
            });

            // Sync rules to declarativeNetRequest
            self.updateNetworkRules();
        });
    },

    // Converts user routes to declarativeNetRequest rules
    updateNetworkRules: function() {
        var self = this;

        // Get all existing dynamic rules so we can remove them (clean slate)
        chrome.declarativeNetRequest.getDynamicRules(function(existingRules) {
            var removeRuleIds = existingRules.map(function(rule) { return rule.id; });

            var addRules = [];
            if (self.options.enabled && self.options.routes) {
                for (var i = 0; i < self.options.routes.length; i++) {
                    var val = self.options.routes[i];
                    var searchPattern = val[0];
                    var replacePattern = val[1];

                    // V3 RE2 Regex syntax uses \1 for backreferences, not $1
                    replacePattern = replacePattern.replace(/\$(\d)/g, '\\$1');

                    addRules.push({
                        "id": i + 1,
                        "priority": 1,
                        "action": {
                            "type": "redirect",
                            "redirect": {
                                // \1 is everything before the match, \2 is everything after
                                "regexSubstitution": "\\1" + replacePattern + "\\2"
                            }
                        },
                        "condition": {
                            // Match the pattern anywhere in the URL by wrapping in (.*)
                            "regexFilter": "(.*)" + searchPattern + "(.*)",
                            "resourceTypes": [
                                "main_frame", "sub_frame", "stylesheet", "script",
                                "image", "font", "object", "xmlhttprequest",
                                "ping", "media", "websocket", "other"
                            ]
                        }
                    });
                }
            }

            // Update the rules in Chrome
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: removeRuleIds,
                addRules: addRules
            }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error updating rules:", chrome.runtime.lastError);
                } else {
                    console.log("Rules updated successfully");
                }
            });
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

    attachControls: function() {
        this.attachEnable();
        this.attachRoutes();
    }
};

$(function(){
    pluginOptions.attachControls();
});
