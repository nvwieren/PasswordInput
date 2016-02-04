/*global logger*/
/*
    PasswordInput
    ========================

    @file      : PasswordInput.js
    @version   : 1.0.0
    @author    : Nick van Wieren
    @date      : Wednesday, January 20, 2016
    @copyright : 2016 - Mansystems Nederland
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/on",
    "dojo/_base/event",

    "PasswordInput/lib/jquery-1.11.2",
    "PasswordInput/lib/tooltip",
    "PasswordInput/lib/validationLanguagePack",
    "dojo/text!PasswordInput/widget/template/PasswordInput.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoAttr, dojoArray, dojoLang, dojoText, dojoHtml, dojoOn, dojoEvent, _jQuery, tooltip, validationTranslations, widgetTemplate) {
    "use strict";

    var _jQ = _jQuery.noConflict(true);
	var j$ = tooltip.createInstance(_jQ);

    return declare("PasswordInput.widget.PasswordInput", [ _WidgetBase, _TemplatedMixin ], {
        templateString: widgetTemplate,

        validated: "",

        mfToExecute: "",

        // Internal variables
        _handles: null,
        _contextObj: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
            this._handles = [];
            this.translations = validationTranslations[dojo.locale];
        },

        postCreate: function() {
            logger.debug(this.id + ".postCreate");
                                    
            this.passwordConfirmNode = dojoConstruct.create("input", {
                "class": "form-control pwi-password-input",
                name: "pwi-password-confirm",
                type: "password",
                autocorrect: "off",
                autocapitalize: "none"
            }, this.pwConfirmContainer, "first");
            this.passwordInputNode = dojoConstruct.create("input", {
                "class": "form-control",
                name: "pwi-password",
                type: "password",
                autocorrect: "off",
                autocapitalize: "none"
            }, this.pwContainer, "first");
            this.confirmValidationNode = dojoConstruct.create("li", { "style" : "display: none;" }, this.validationNodes);
            var glyphNode = dojoConstruct.create("span", {
                "class": "glyphicon glyphicon-remove text-danger",
                "aria-hidden" : "true"
            }, this.confirmValidationNode);
            dojoConstruct.place(document.createTextNode(" " + this._getTranslatedMessage("password_not_equal")), glyphNode, "after");
            
            dojoOn(this.passwordInputNode, "keyup", dojoLang.hitch(this, this._validateInput));            
            dojoOn(this.passwordConfirmNode, "blur", dojoLang.hitch(this, this._validateConfirmInput))
            dojoOn(this.changePWButton, "click", dojoLang.hitch(this, function(e) {this._changePassword(e)}));
            
            this._setupValidationFeedback();
            this._setupEvents();
            
            this._validateInput();
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;

            callback();
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function(e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },
        
        _setupValidationFeedback: function() {
            logger.debug(this.id + "._setupValidationFeedback");
            this.passwordRules = {};
            
            if (this.minCharacters > 0) this.passwordRules["min_chars"] = { 
                name: "min_chars",
                value: this.minCharacters,
                regex: new RegExp("^.{" + this.minCharacters + ",}$")
            };
            if (this.requireUpper > 0) this.passwordRules["require_upper"] = { 
                name: "require_upper",
                value: this.requireUpper, 
                regex: /[A-Z]/ 
            };
            if (this.requireLower > 0) this.passwordRules["require_lower"] = { 
                name: "require_lower",
                value: this.requireLower, 
                regex: /[a-z]/ 
            };
            if (this.requireNumeric > 0) this.passwordRules["require_numeric"] = { 
                name: "require_numeric",
                value: this.requireNumeric, 
                regex: /[0-9]/ 
            };
            if (this.requireSpecial > 0) this.passwordRules["require_special"] = { 
                name: "require_special", 
                value: this.requireSpecial, 
                regex: /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/ 
            };
            if (this.disallowUsername) this.passwordRules["disallow_username"] = { 
                name: "disallow_username",
                value: this.disallowUsername,
                regex: new RegExp("^((?!" + mx.session.getUserName() + ").)*$", "i")
            };
            if (this.previousPasswords > 0) this.passwordRules["previous_passwords"] = { 
                name: "previous_passwords",
                value: this.previousPasswords 
            };
            
            this.ruleNodes = {};
            
            for (var rule in this.passwordRules) {
                if (this.passwordRules.hasOwnProperty(rule)) {
                    var listNode = dojoConstruct.create("li", {}, this.validationNodes);
                    var glyphNode = dojoConstruct.create("span", {
                        "class": "glyphicon glyphicon-remove text-danger",
                        "aria-hidden" : "true"
                    }, listNode);
                    dojoConstruct.place(document.createTextNode(" " + this._getTranslatedMessage(rule, this.passwordRules[rule].value)), glyphNode, "after");

                    this.ruleNodes[rule] = {
                        node: glyphNode,
                        valid: false
                    }
                }
            }
        },
        
        _setupEvents: function() {
            this.connect(this.changePWButton, "click", this._changePassword);
            
        },
        
        _validateInput: function() {
            logger.debug(this.id + "._validateInut");

            if (this.passwordInputNode) {
                //TODO rework redundant code
                var value = this.passwordInputNode.value;
                var validated = true;
                
                for (var rule in this.passwordRules) {
                    var node = this.ruleNodes[rule];
                    if (this.passwordRules[rule].regex) {
                        var regex = this.passwordRules[rule].regex;
                        if (regex.test(value) != node.valid) {                            
                            this.ruleNodes[rule].valid, node.valid = !node.valid;
                            this._toggleValidationNode(node);                            
                        }
                        if (!node.valid) validated = false;
                    }
                }
                if (validated) {
                    dojoAttr.remove(this.changePWButton, "disabled");
                } else {
                    dojoAttr.set(this.changePWButton, "disabled", "disabled");
                }
            }
        },
        
        _validateConfirmInput: function() {
            if (this.passwordConfirmNode.value !== '' && this.passwordInputNode.value !== this.passwordConfirmNode.value) {
                dojoStyle.set(this.confirmValidationNode, "display", "block");
                return false;
            } else {
                dojoStyle.set(this.confirmValidationNode, "display", "none");
                return true;
            }
        },
        
        _changePassword: function(event) {
            event.preventDefault();
            if (this._validateConfirmInput()) {
                this._contextObj.set(this.passwordAttribute, this.passwordInputNode.value);
                if (this.mfToExecute !== "") {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: this.mfToExecute,
                            guids: [ this._contextObj.getGuid() ]
                        },
                        store: {
                            caller: this.mxform
                        },
                        callback: function(obj) {
                            //TODO what to do when all is ok!
                        },
                        error: dojoLang.hitch(this, function(error) {
                            logger.error(this.id + ": An error occurred while executing microflow: " + error.description);
                        })
                    }, this);
                }
            }              
            
        },
        
        _toggleValidationNode: function(nodeRef) {
            logger.debug(this.id + "._toggleValidationNode");
            var node = nodeRef.node;
            if (nodeRef.valid) {
                dojoClass.remove(node, "glyphicon-remove");
                dojoClass.remove(node, "text-danger");
                dojoClass.add(node, "glyphicon-ok");
                dojoClass.add(node, "text-success");
            } else {
                dojoClass.remove(node, "glyphicon-ok");
                dojoClass.remove(node, "text-success");
                dojoClass.add(node, "glyphicon-remove");
                dojoClass.add(node, "text-danger");                
            }
        },
        
        _getTranslatedMessage: function(code, value) {
            logger.debug(this.id + "._getTranslatedMessage");
            var message = this.translations[code];
            if (typeof message !== 'undefined')
                return message.split('{{' + code + '}}').join(value);
        }
    });
});

require(["PasswordInput/widget/PasswordInput"], function() {
    "use strict";
});
