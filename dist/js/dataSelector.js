/*
 ** Created By Henry Yang @ 2017/04/13
 ** MIT License
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : (global.dataSelector = factory());
})(this, (function() {
    'use strict';

    var _options,               // cache settings of plugin initialization
        _resultList = [],       // array of data filtered on input
        _list = null,           // ul node in result list
        _selectItem = null;     // selected item

    // Event binding
    var EventUtil = {
        typeHandler: function(_type) {
            return _type.split(' ');
        },
        addHandler: function(element, type, children, handler) {
            var _this = this;

            if(handler == null) {   //element, type, handler
                handler = children;
                children = undefined;
            }

            type = EventUtil.typeHandler(type);

            type.forEach(function(item, index) {
                element.addEventListener(item, function(event) {
                    handler.call(_this, event);
                }, false);
            });
        }
    }

    /**
     *  complie template
     *  @param html {String} string of DOM
     *  @return DOM {DOMNode} DOM
     */
    var _compileStringToDOM = function(html) {
        var temp = document.createElement('div'),
            children = null,
            fragment = document.createDocumentFragment();

        temp.innerHTML = html;
        children = temp.childNodes;

        for(var i = 0, length = children.length; i < length; i++) {
            fragment.appendChild(children[i].cloneNode(true));
        }

        return fragment;
    }

    /**
     *  whether item is in the specific array
     *  @param arr {Array} specific array
     *  @param item {String} specific item
     */
    var _isExisted = function(arr, item) {
        if(arr instanceof Array && ~arr.toString().indexOf(item)) {
            return true;
        }
        return false;
    }

    /**
     *  find a DOM, and return the index and DOM
     *  @param parent {DOM} parent node
     *  @param item {DOM} child node
     *  @param fn {Function} callback function after found the node
     */
    var _findItem = function(parent, item, fn) {
        try{
            Array.prototype.slice.call(parent.childNodes).forEach(function(_item, _index) {
                if(item == _item) {
                    fn(_index, _item);
                    throw _index;
                }
            });
        }
        catch(e) {
            return e;
        }
    }

    /**
     *  Error handling
     *  @param msg {String} error message
     */
    var _error = function(msg) {
        console.error(msg);
    }

    /**
     *  construct function
     */
    function dataSelector(options) {
        var opts = options || {};

        this.$el = document.querySelector(opts.el) || document.querySelector('[data-id="data-selector"]');   // hidden input
        this.template = opts.template || '';   // *template for result list, required
        this.data = opts.data || [];           // *data to be filtered and selected, required
        this.maxData = opts.maxData || -1;     // whether limit the number of selected item, -1 means no limitation
        this.maxResult = opts.maxResult || 5;  // number of items in result list
        this.resultScroll = opts.resultScroll == undefined ? false : options.resultScroll;                 // whether the list can be scrolled
        this.style = opts.style || 'input';    // input style for now, popup and list style will be added later
        this.filterKey = opts.filterKey || [];  // key for filter
        this.savedKey = opts.savedKey ? opts.savedKey.split(' ')[0] : '';   // key for saving selected item
        this.showKey = opts.showKey || this.savedKey;   // key for display selected item
        this.onSelect = opts.onSelect || function() {};     // callback function when click item in result list

        if(!_options) {     // cache initialization setting
            _options = opts;
        }

        this.$root = null;          // root node of plugin
        this.$wrapper = null;       // node of simulate input
        this.$input = null;         // user input
        this.$list = null;          // dropdown list

        _init.call(this);
    }

    /**
     *  handle user custom setting error
     */
    var _handleSettingError = function() {
        if(!this.template) {
            _error('template is required');
            return false;
        }

        return true;
    }

    /**
     *  init plugin
     */
    var _init = function() {
        var error = _handleSettingError.call(this);

        if(!error) {return;}

        _initStyle.call(this);
        _initEvents.call(this);
        _extractTmp.call(this);
    }

    /**
     *  init style
     */
    var _initStyle = function() {
        var $hiddenInput = this.$el.cloneNode(true),
            children;

        $hiddenInput.className += 'hidden';

        var html = '<div class="data-selector">'+
                        $hiddenInput.outerHTML+
                        '<div class="data-selector-wrapper">'+
                            '<input type="text" class="data-selector-input">'+
                        '</div>'+
                        '<div class="data-selector-list"></div>'+
                    '</div>',
            fragment = _compileStringToDOM(html);

        this.$el.parentNode.insertBefore(fragment, this.$el);

        this.$root = this.$el.previousSibling;
        children = this.$root.childNodes;
        this.$el = children[0];
        this.$wrapper = children[1];
        this.$list = children[2];
        this.$input = this.$wrapper.childNodes[0];
        this.$root.parentNode.removeChild(this.$root.nextSibling);
    }

    /**
     *  init event binding
     */
    var _initEvents = function() {
        var __inputOnBlur = function() {    // when input blur
            EventUtil.addHandler.call(this, this.$input, 'blur', function() {
                this.value = '';
                this.$input.style.width = '10px';

                if(this.nextSibling) {
                    this.$input.style.display = 'none';
                }

                this.$list.style.display = 'none';
            });
        };

        __inputOnBlur.call(this);

        EventUtil.addHandler.call(this, this.$wrapper, 'click', function(e) {   // simulate click in input
            var target = e.target,
                tag = target.tagName.toLowerCase(),
                input = null,
                _this = this;

            if(tag === 'span') {
                _findItem.call(this, this.$wrapper, target, function(index) {
                    input = _this.$input.cloneNode(true);
                    _this.$wrapper.removeChild(_this.$input);
                    target.parentNode.insertBefore(input, target.nextSibling);
                    _this.$input = input;
                });
            }

            this.$input.style.display = 'inline-block';
            this.$input.focus();
            __inputOnBlur.call(this);        // bind input blur event
        });

        // user input
        EventUtil.addHandler.call(this, this.$wrapper, 'input propertychange paste', function() {
            var filterData = [],
                length = 0,
                val = this.$input.value;

            if(this.maxData == -1 || (this.maxData && this.$el.value.split(';').length - 1 < this.maxData)) {   // if the number of selected item is less then the available number
                length = val.length;

                if(length) {
                    this.$input.style.width = length == 0 ? '10px' : length * 17 + 'px';   // modify the width of input realtime.

                    _getFilterData.call(this, val);    // get filter data

                    if(!_resultList.length) {
                        _resultList = '';
                    }

                    _renderResultList.call(this, _resultList); // render result
                }
                else {      // hide result list when there is no input
                    this.$list.style.display = 'none';
                }
            }
            else{
                this.$input.value = '';
            }
        });

        // list click event
        EventUtil.addHandler.call(this, this.$list, 'click', function(e) {
            _selectInList.call(this, e.target);
        });

        // keyboard operation
        EventUtil.addHandler.call(this, this.$wrapper, 'keydown', function(e) {
            var code = e.keyCode,
                active = 'data-selector-active',
                _this = this;

            switch(code) {
                case 8:     // delete
                case 46:
                    if(!this.$input.value.length) {    // delete item when input is empty
                        _findItem.call(this, this.$wrapper, this.$input, function(index, item) {
                            var _index, direction;

                            if(code === 8 && index !== 0) {
                                _index = index - 1;
                                direction = 'left';
                            }
                            else if(code === 46 && index !== _this.$wrapper.childNodes.length) {
                                _index = index + 1;
                                direction = 'right';
                            }

                            _index != undefined ? _deleteItem.call(_this, _index, direction) : '';
                        });
                    }
                    break;
                case 13:    // enter
                    if(this.$input.value.length && _resultList.length) {
                        _selectInList.call(this, this.$root.querySelector('.' + active));
                    }
                    break;
                case 38:    // up
                case 40:    // down
                    var curItem = this.$root.querySelector('.' + active);

                    if(!curItem) {  // no result
                        return;
                    }

                    var curParent = curItem.parentNode,
                        children = curParent.childNodes,
                        childrenLength = children.length,
                        $ul = this.$list.querySelector('ul');

                    var _index, len, sibling, targetIndex;

                    if(code == 38) {
                        _index = 0;
                        len = childrenLength - 1;
                        sibling = 'previousSibling';
                    }
                    else if(code == 40) {
                        _index = childrenLength - 1;
                        len = 0;
                        sibling = 'nextSibling';
                    }

                    _findItem.call(this, curParent, curItem, function(index) {
                        if(index == _index) {
                            children[len].className += active;
                        }
                        else{
                            curItem[sibling].className += active;
                        }

                        curItem.className = curItem.className.replace(active, '');

                        if(_this.resultScroll) {
                            if(code == 38) {        // up
                                targetIndex = index ? index - 1 : childrenLength - 1;

                                if(index == 0){
                                    $ul.scrollTop = 40 * (targetIndex - 4);
                                }
                                else{
                                    $ul.scrollTop = 40 * targetIndex;
                                }
                            }
                            else if(code == 40) {   // down
                                targetIndex = index + 1;

                                if(targetIndex == childrenLength){
                                    $ul.scrollTop = 0;
                                }
                                else{
                                    $ul.scrollTop = 40 * (targetIndex - 4);
                                }
                            }
                        }
                    });
                    break;
            }
        });
    }

    /**
     *  function of select item in list
     */
    var _selectInList = function(target) {
        var li = this.$list.childNodes,
            parent = null,
            attr = target.getAttribute('data-selector'),
            _this = this;

        if(attr !== 'empty') {
            while(attr !== 'li') {  // focus on the outer li tag
                target = target.parentNode;
            }
        }
        else {
            this.$list.style.display = 'none';
            return;
        }

        _findItem.call(this, _list, target, function(index) {
            var value = _this.$el.value;

            _selectItem = _resultList[index];
            _this.$el.value += _selectItem[_this.savedKey] + ';';    // add selected item in hidden input
        });

        _renderSelector.call(this);
    }

    /**
     *  extract info from template
     */
    var _extractTmp = function() {
        var tpl = this.template,
            filterKey = this.filterKey,
            _this = this;

        if(filterKey.length) {
            return;
        }

        tpl.match(/%:(\w*)%/g).forEach(function(item, index) {  // match all keys in template
            var key = item.replace(/%:(\w*)%/g, function(origin, matched) { // remove identifier in matched string
                return matched;
            }),
                count = 0;

            if(!_isExisted(_this.filterKey, key)) {  // filter reduplicate keys
                _this.filterKey.push(key);
            }
        });

        !this.savedKey ? this.savedKey = this.filterKey[0] : '';   // if there is no savedkey, then get the first key from template
    }

    /**
     *  data filter
     *  @param value {String} user input
     */
    var _getFilterData = function(value) {
        var data = this.data,
            resultLength = this.maxResult,
            matchFromStart = [],
            matchInside = [];

        if(!value) {    // if the input is empty, then emptry result list and return
            _resultList = [];
            return false;
        }

        _resultList = [];   // reset result list

        try{
            /**
             *  Comparing logic:
             *  Display items which are matching with input from start.
             *  If the amount is less than the maxResult, display items which
             *  contain the input (not from start).
             */
            for(var i in data) {    // traversal all data
                var curItem = data[i];

                for(var j in this.filterKey) {  // in each item, compare value according to every filter key
                    var curKey = this.filterKey[j],
                        cur = curItem[curKey];

                    if(_resultList.length < resultLength) {  // limit the number of result list
                        var curIndex = cur.toString().indexOf(value);

                        if(!_isExisted(this.$el.value.split(';'), curItem[this.savedKey])) {
                            if(curIndex == 0) {         // save the item matches from start
                                matchFromStart.push(curItem);
                            }
                            else if(curIndex > 0) {     // save the item matches from inside of item
                                matchInside.push(curItem);
                            }
                        }

                        if(matchFromStart.length == resultLength) {
                            _resultList = matchFromStart;
                            throw true;
                        }
                    }
                }
            }
        }
        catch(e) {
            return;
        }

        // the length of matchFromStart is not enough, append some subitem from matchInside.
        var matchFromStartStr = '', matchInsideStr = '';

        for(var item in matchFromStart) {
            matchFromStartStr += JSON.stringify(matchFromStart[item]) + ',';
        }

        for(var item in matchInside) {  // remove reduplicate item between matchFromStart and matchInside
            if(~matchFromStartStr.indexOf(JSON.stringify(matchInside[item]))) {
                matchInside.splice(item, 1);
            }
        }

        _resultList = matchFromStart.concat(matchInside).slice(0, resultLength);
    }

    /**
     *  joint and render result list
     *  @param arr {Array} result array
     */
    var _renderResultList = function(arr) {
        var fragment = null,
            template = '',
            _this = this;

        if(arr instanceof Array) {
            template = '<ul class="' + (this.resultScroll ? 'scrollable' : '') + '">';

            arr.forEach(function(item, index) {
                var _template = _this.template.replace(/%:(\w*)%/g, function(origin, matched) {
                    return item[matched];
                });

                _template = _template.replace(/\[\[(\S*)\]\]/g, function(origin, matched) { // render highlight field
                    var val = _this.$input.value;

                    return '<span class="data-selector-highlight">' + (~matched.indexOf(val) ? val : '') + '</span>' + matched.replace(val, '');
                });

                template += '<li data-selector="li" class="data-selector-list-item ' + (index == 0 ? 'data-selector-active' : '') + '">'+
                                _template+
                            '</li>';
            });
        }
        else {
            template = '<ul>';
            template += '<li class="data-selector-list-item" data-selector="empty" style="cursor: default">暂无数据</li>';
        }

        template += '</ul>';
        this.$list.innerHTML = '';
        fragment = _compileStringToDOM(template, $list);
        this.$list.appendChild(fragment);
        this.$list.style.cssText += 'display: block; left: ' + this.$input.offsetLeft + 'px; top: ' + (this.$input.offsetTop + 32) + 'px;';
        _list = this.$list.children[0];      // cache new list
    }

    /**
     *  joint and render selected item
     */
    var _renderSelector = function() {
        var key = this.showKey || this.filterKey[0],
            html = '<span class="data-selector-item">' + _selectItem[key] + '</span>',
            fragment = _compileStringToDOM(html);

        this.$wrapper.insertBefore(fragment, this.$input);
        // reset input and dropdown list
        this.$input.value = '';
        this.$input.style.width = '10px';
        this.$list.style.display = 'none';
    }

    /**
     *  delete selected item
     *  @param index {Number} index of item which is waiting to be deleted
     *  @param direction {String} direction of using keyboard to delete item
     */
    var _deleteItem = function(index, direction) {
        var valueArr = this.$el.value.split(';');

        delete this.$wrapper.removeChild(this.$wrapper.childNodes[index]);    // remove DOM node
        valueArr.splice(direction == 'left' ? index : (index - 1), 1);  // clear value in input
        this.$el.value = valueArr.join(';');
    }

    // public API
    /**
     *  set selected value
     *  @param data {Array} array of data
     */
    dataSelector.prototype.setValue = function(arr) {
        var _this = this;

        if(arr instanceof Array) {
            this.$el.value = '';
            Array.prototype.forEach.call(this.$wrapper.querySelectorAll('span'), function(item, index) {
                _this.$wrapper.removeChild(item);
            });

            this.appendValue(arr);
        }
    }

    /**
     *  get selected items
     */
    dataSelector.prototype.getValue = function() {
        return this.$el.value;
    }

    /**
     *  add selected item manually, no reduplicate item
     *  @param arr {Array} array of data
     */
    dataSelector.prototype.appendValue = function(arr) {
        var _this = this;

        if(arr instanceof Array) {
            arr.forEach(function(item, index) {
                if(!_isExisted(_this.$el.value.split(';'), item[_this.savedKey])) {
                    _this.$el.value += item[_this.savedKey] + ';';
                    _selectItem = item;
                    _renderSelector.call(_this);
                }
            });
        }
    }

    /**
     *  remove all selected items
     */
    dataSelector.prototype.clear = function() {
        var _this = this;

        this.$el.value = '';
        Array.prototype.forEach.call(this.$wrapper.querySelectorAll('span'), function(item, index) {
            _this.$wrapper.removeChild(item);
        });
    }

    /**
     *  destroy the plugin
     */
    dataSelector.prototype.destroy = function() {
        this.$el.className = this.$el.className.replace('hidden', '');
        this.$root.parentNode.replaceChild(this.$el, this.$root);
    }

    /**
     *  reset the plugin
     */
    dataSelector.prototype.reset = function() {
        new dataSelector(_options);
    }

    /**
     *  set data
     *  @param arr {Array} array of data to be filtered
     */
    dataSelector.prototype.setData = function(arr) {
        this.data = arr;
        console.log('Data is set.');
    }

    return dataSelector;
}));
