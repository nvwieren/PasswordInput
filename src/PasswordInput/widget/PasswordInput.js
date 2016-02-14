/* global dojo, mx, logger */
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
    "dojo/query",
    "dojo/text",
    "dojo/html",
    "dojo/on",
    "dojo/_base/event",

    "PasswordInput/lib/jquery-1.11.2",
    "PasswordInput/lib/popover",
    "PasswordInput/lib/validationLanguagePack",
    "dojo/text!PasswordInput/widget/template/PasswordInput.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoAttr, dojoArray, dojoLang, dojoQuery, dojoText, dojoHtml, dojoOn, dojoEvent, _jQuery, popover, validationTranslations, widgetTemplate) {
    "use strict";

    var _jQ = _jQuery.noConflict(true);
	var j$ = popover.createInstance(_jQ);

    return declare("PasswordInput.widget.PasswordInput", [ _WidgetBase, _TemplatedMixin ], {
        templateString: widgetTemplate,

        validated: null,
        mfToExecute: null,

        // Internal variables
        _handles: null,
        _contextObj: null,

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
                placeholder: this.confirmPlaceHolder,
                autocorrect: "off",
                autocapitalize: "none"
            }, this.pwConfirmContainer, "first");
            this.passwordInputNode = dojoConstruct.create("input", {
                "class": "form-control",
                name: "pwi-password",
                type: "password",
                placeholder: this.passwordPlaceHolder,
                autocorrect: "off",
                autocapitalize: "none"
            }, this.pwContainer, "first");
            this.confirmValidationNode = dojoConstruct.create("li", { "style" : "display: none;" }, this.validationNodes);
            var glyphNode = dojoConstruct.create("span", {
                "class": "glyphicon glyphicon-remove text-danger",
                "aria-hidden" : "true"
            }, this.confirmValidationNode);
            dojoConstruct.place(document.createTextNode(" " + this._getTranslatedMessage("password_not_equal")), glyphNode, "after");
            
            this.validationContent = dojoConstruct.create("div", { class: "small" });
            
            j$(this.passwordInputNode).popover({
                html: true,
                title: "Password rules:",
                trigger: "manual",
                content: this.validationContent
            });
            
            dojoOn(this.passwordInputNode, "focus", dojoLang.hitch(this, function() { j$(this.passwordInputNode).popover('show') }));
            dojoOn(this.passwordInputNode, "blur", dojoLang.hitch(this, function() { if (this._validateInput()) j$(this.passwordInputNode).popover('hide') }));
            dojoOn(this.passwordInputNode, "keyup", dojoLang.hitch(this, this._validateInput));
            dojoOn(this.passwordConfirmNode, "blur", dojoLang.hitch(this, this._validateConfirmInput));
            dojoOn(this.passwordConfirmNode, "keyup", dojoLang.hitch(this, this._clearValidations));
            dojoOn(this.changePWButton, "click", dojoLang.hitch(this, function(e) {this._changePassword(e)}));
            
            this._setupValidation();
            
            this._validateInput();
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            
            callback();
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function(e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },
        
        _setupValidation: function() {
            if (this.passwordConfigEntity !== '') {
                mx.data.createXPathString({
                    entity: this.passwordConfigEntity,
                    callback: dojoLang.hitch(this, function(xpath, allMatched) {
                        mx.data.get({
                            xpath: xpath,
                            callback: dojoLang.hitch(this, function(objs) {
                                this._passwordConfig = objs[0];
                                this._setupValidationRules();
                            })
                        });
                    })
                });
            } else {
                this._setupValidationRules();
            }
        },
        
        _setupValidationRules: function() {
            logger.debug(this.id + "._setupValidationFeedback");
            this.passwordRules = {};
            
            var minChar = (this.minCharactersAttr) ? this._passwordConfig.get(this.minCharactersAttr) : this.minCharacters;            
            this.passwordRules["min_chars"] = { 
                name: "min_chars",
                value: minChar,
                regex: new RegExp("^.{" + minChar + ",}$")
            };
            var requireUpper = (this.requireUpperAttr) ? this._passwordConfig.get(this.requireUpperAttr) : this.requireUpper;
            if (requireUpper) this.passwordRules["require_upper"] = { 
                name: "require_upper",
                value: requireUpper, 
                regex: /[A-Z]/ 
            };
            var requireLower = (this.requireLowerAttr) ? this._passwordConfig.get(this.requireLowerAttr) : this.requireLower;
            if (requireLower) this.passwordRules["require_lower"] = { 
                name: "require_lower",
                value: requireLower, 
                regex: /[a-z]/ 
            };
            var requireNumeric = (this.requireNumericAttr) ? this._passwordConfig.get(this.requireNumericAttr) : this.requireNumeric;
            if (requireNumeric) this.passwordRules["require_numeric"] = { 
                name: "require_numeric",
                value: requireNumeric, 
                regex: /[0-9]/ 
            };
            var requireSpecial = (this.requireSpecialAttr) ? this._passwordConfig.get(this.requireSpecialAttr) : this.requireSpecial;
            if (requireSpecial) this.passwordRules["require_special"] = { 
                name: "require_special", 
                value: requireSpecial, 
                regex: /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/ 
            };
            var disallowUsername = (this.disallowUsernameAttr) ? this._passwordConfig.get(this.disallowUsernameAttr) : this.disallowUsername;
            if (this.disallowUsername) this.passwordRules["disallow_username"] = { 
                name: "disallow_username",
                value: disallowUsername,
                regex: new RegExp("^((?!" + mx.session.getUserName() + ").)*$", "i")
            };
            
            this.ruleNodes = {};            
            
            var listNode = dojoConstruct.create("ul", { class: "list-unstyled pwi-validation-container" }, this.validationContent);
            
            for (var rule in this.passwordRules) {
                if (this.passwordRules.hasOwnProperty(rule)) {
                    var listItemNode = dojoConstruct.create("li", null, listNode);
                    var glyphNode = dojoConstruct.create("span", {
                        "class": "glyphicon glyphicon-remove text-danger",
                        "aria-hidden" : "true"
                    }, listItemNode);
                    dojoConstruct.place(document.createTextNode(" " + this._getTranslatedMessage(rule, this.passwordRules[rule].value)), glyphNode, "after");

                    this.ruleNodes[rule] = {
                        node: glyphNode,
                        valid: false
                    }
                }
            }
        },        
        
        _validateInput: function() {
            logger.debug(this.id + "._validateInut");

            if (this.passwordInputNode) {
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
                return validated;
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
                this._contextObj.set(this.passwordAttr, this.passwordInputNode.value);
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
                            logger.error(this.id + ": An error occurred while executing microflow: " + error.message);
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
        },
        
        _resetSubscriptions: function () {
            var validationHandle = null;

            this._clearSubscriptions();

            if (this._contextObj) {                
                validationHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });
               
                this._handles.push(validationHandle);
            }
        },
        
        _handleValidation: function (validations) {
            this._clearValidations();

            var val = validations[0],
                msg = val.getReasonByAttribute(this.passwordAttr);

            if (this.readOnly) {
                val.removeAttribute(this.passwordAttr);
            } else {
                if (msg) {
                    this._addValidation(msg);
                    val.removeAttribute(this.passwordAttr);
                }
            }
        },
        
        _clearValidations: function () {
            dojoConstruct.empty(this.validationNodes);
        },

        _addValidation: function (msg) {            
            var listItemNode = dojoConstruct.create("li", null, this.validationNodes);
            var glyphNode = dojoConstruct.create("span", {
                "class": "glyphicon glyphicon-remove text-danger",
                "aria-hidden" : "true"
            }, listItemNode);
            dojoConstruct.place(document.createTextNode(" " + msg), glyphNode, "after");

        },

        _clearSubscriptions: function () {
            if (this._handles && this._handles.length && this._handles.length > 0) {
                dojoArray.forEach(this._handles, dojoLang.hitch(this, function (handle) {
                    this.unsubscribe(handle);
                }));
                this._handles = [];
            }
        },
        
    });
});

require(["PasswordInput/widget/PasswordInput"], function() {
    "use strict";
});
