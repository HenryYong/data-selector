/*
 ** Created By Henry Yang @ 2017/04/13
 ** MIT License
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : (global.dataSelector = factory());
})(this, (function() {
    'use strict';

    var _this,                  // cache 'this'
        _options,               // cache settings of plugin initialization
        _inputValue = '',       // save user input temporarily
        _tempFilterKey = [],    // key for filter data
        _resultList = [],       // array of data filtered on input
        _list = null,           // ul node in result list
        _selectItem = null;     // selected item

    var $root, $el, $wrapper, $input, $list;    // save DOM node

    // Event binding
    var EventUtil = {
        typeHandler: function(_type) {
            return _type.split(' ');
        },
        addHandler: function(element, type, children, handler) {
            if(handler == null) {   //element, type, handler
                handler = children;
                children = undefined;
            }

            type = EventUtil.typeHandler(type);

            type.forEach(function(item, index) {
                element.addEventListener(item, handler, false);
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

        _this = this;
        this.el = document.querySelector(opts.el) || document.querySelector('[data-id="data-selector"]');   // hidden input
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

        _init();
    }

    /**
     *  init plugin
     */
    var _init = function() {
        if(!_this.template) {
            _error('template is required');
            return;
        }

        _initStyle();
        _initEvents();
        _extractTmp();
    }

    /**
     *  init style
     */
    var _initStyle = function() {
        var rootName = 'data-selector',
            $hiddenInput = _this.el.cloneNode(true),
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

        _this.el.parentNode.insertBefore(fragment, _this.el);

        _this.$root = _this.el.previousSibling;
        children = _this.$root.childNodes;
        _this.el = children[0];
        _this.$wrapper = children[1];
        _this.$list = children[2];
        _this.$input = _this.$wrapper.childNodes[0];
        _this.$root.parentNode.removeChild(_this.$root.nextSibling);

        $root = _this.$root;
        $el = _this.el;
        $wrapper = _this.$wrapper;
        $list = _this.$list;
        $input = _this.$input;
    }

    /**
     *  init event binding
     */
    var _initEvents = function() {
        var __inputOnBlur = function() {    // when input blur
            EventUtil.addHandler($input, 'blur', function() {
                this.value = '';
                this.style.width = '10px';

                if(this.nextSibling) {
                    this.style.display = 'none';
                }

                $list.style.display = 'none';
            });
        };

        __inputOnBlur();

        EventUtil.addHandler($wrapper, 'click', function(e) {   // simulate click in input
            var target = e.target,
                tag = target.tagName.toLowerCase(),
                input = null;

            if(tag === 'span') {
                _findItem($wrapper, target, function(index) {
                    input = $input.cloneNode(true);
                    $wrapper.removeChild($input);
                    target.parentNode.insertBefore(input, target.nextSibling);
                    $input = input;
                });
            }

            $input.style.display = 'inline-block';
            $input.focus();
            __inputOnBlur();        // bind input blur event
        });

        // 用户输入时的操作
        EventUtil.addHandler($wrapper, 'input propertychange paste', function() {
            var filterData = [],
                length = 0;

            if(_this.maxData == -1 || (_this.maxData && $el.value.split(';').length - 1 < _this.maxData)) {   // if the number of selected item is less then the available number
                _inputValue = $input.value;
                length = _inputValue.length;

                if(length) {
                    $input.style.width = length == 0 ? '10px' : length * 17 + 'px';   // modify the width of input realtime.

                    _getFilterData(_inputValue);    // get filter data

                    if(!_resultList.length) {
                        _resultList = '';
                    }

                    _renderResultList(_resultList); // render result
                }
                else {      // hide result list when there is no input
                    $list.style.display = 'none';
                }
            }
            else{
                $input.value = '';
            }
        });

        // list click event
        EventUtil.addHandler($list, 'click', function(e) {
            _selectInList(e.target);
        });

        // keyboard operation
        EventUtil.addHandler($wrapper, 'keydown', function(e) {
            var code = e.keyCode,
                active = 'data-selector-active';

            switch(code) {
                case 8:     // delete
                case 46:
                    if(!$input.value.length) {    // delete item when input is empty
                        _findItem($wrapper, $input, function(index, item) {
                            var _index, direction;

                            if(code === 8 && index !== 0) {
                                _index = index - 1;
                                direction = 'left';
                            }
                            else if(code === 46 && index !== $wrapper.childNodes.length) {
                                _index = index + 1;
                                direction = 'right';
                            }

                            _index != undefined ? _deleteItem(_index, direction) : '';
                        });
                    }
                    break;
                case 13:    // enter
                    if($input.value.length && _resultList.length) {
                        _selectInList($root.querySelector('.' + active));
                    }
                    break;
                case 38:    // up
                case 40:    // down
                    var curItem = $root.querySelector('.' + active);

                    if(!curItem) {  // no result
                        return;
                    }

                    var curParent = curItem.parentNode,
                        children = curParent.childNodes,
                        childrenLength = children.length,
                        $ul = $list.querySelector('ul');

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

                    _findItem(curParent, curItem, function(index) {
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
        var li = _list.childNodes,
            parent = null,
            attr = target.getAttribute('data-selector');

        if(attr !== 'empty') {
            while(attr !== 'li') {  // focus on the outer li tag
                target = target.parentNode;
            }
        }
        else {
            $list.style.display = 'none';
            return;
        }

        _findItem(_list, target, function(index) {
            var value = $el.value;

            _selectItem = _resultList[index];
            $el.value += _selectItem[_this.savedKey] + ';';    // add selected item in hidden input
        });

        _renderSelector();
    }

    /**
     *  extract info from template
     */
    var _extractTmp = function() {
        var tpl = _this.template,
            filterKey = _this.filterKey;

        if(filterKey.length) {
            _tempFilterKey = _this.filterKey;
            return;
        }

        tpl.match(/%:(\w*)%/g).forEach(function(item, index) {  // match all keys in template
            var key = item.replace(/%:(\w*)%/g, function(origin, matched) { // remove identifier in matched string
                return matched;
            }),
                count = 0;

            if(!_isExisted(_tempFilterKey, key)) {  // filter reduplicate keys
                _tempFilterKey.push(key);
            }
        });

        !_this.savedKey ? _this.savedKey = _tempFilterKey[0] : '';   // if there is no savedkey, then get the first key from template
    }

    /**
     *  data filter
     *  @param value {String} user input
     */
    var _getFilterData = function(value) {
        var data = _this.data;

        if(!value) {    // if the input is empty, then emptry result list and return
            _resultList = [];
            return false;
        }

        _resultList = [];   // reset result list

        for(var i in data) {    // traversal all data
            var curItem = data[i];

            for(var j in _tempFilterKey) {  // in each item, compare value according to every filter key
                var curKey = _tempFilterKey[j],
                    cur = curItem[curKey];

                if(_resultList.length < _this.maxResult) {  // limit the number of result lsit
                    if(cur.toString().indexOf(value) == 0 && !_isExisted($el.value.split(';'), curItem[_this.savedKey])) {    // filter reduplicate item
                        _resultList.push(curItem);
                        break;
                    }
                }
            }
        }
    }

    /**
     *  joint and render result list
     *  @param arr {Array} result array
     */
    var _renderResultList = function(arr) {
        var fragment = null,
            template = '';

        if(arr instanceof Array) {
            template = '<ul class="' + (_this.resultScroll ? 'scrollable' : '') + '">';

            arr.forEach(function(item, index) {
                var _template = _this.template.replace(/%:(\w*)%/g, function(origin, matched) {
                    return item[matched];
                });

                _template = _template.replace(/\[\[(\S*)\]\]/g, function(origin, matched) { // render highlight field
                    var val = $input.value;

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
        $list.innerHTML = '';
        fragment = _compileStringToDOM(template, $list);
        $list.appendChild(fragment);
        $list.style.cssText += 'display: block; left: ' + $input.offsetLeft + 'px; top: ' + ($input.offsetTop + 32) + 'px;';
        _list = $list.children[0];      // cache new list
    }

    /**
     *  joint and render selected item
     */
    var _renderSelector = function() {
        var key = _this.showKey || _tempFilterKey[0],
            html = '<span class="data-selector-item">' + _selectItem[key] + '</span>',
            fragment = _compileStringToDOM(html);

        $wrapper.insertBefore(fragment, $input);
        // reset input and dropdown list
        $input.value = '';
        $input.style.width = '10px';
        $list.style.display = 'none';
    }

    /**
     *  delete selected item
     *  @param index {Number} index of item which is waiting to be deleted
     *  @param direction {String} direction of using keyboard to delete item
     */
    var _deleteItem = function(index, direction) {
        var valueArr = $el.value.split(';');

        delete $wrapper.removeChild($wrapper.childNodes[index]);    // remove DOM node
        valueArr.splice(direction == 'left' ? index : (index - 1), 1);  // clear value in input
        $el.value = valueArr.join(';');
    }

    // public API
    /**
     *  set selected value
     *  @param data {Array} array of data
     */
    dataSelector.prototype.setValue = function(arr) {
        if(arr instanceof Array) {
            $el.value = '';
            Array.prototype.forEach.call($wrapper.querySelectorAll('span'), function(item, index) {
                $wrapper.removeChild(item);
            });

            this.appendValue(arr)
        }
    }

    /**
     *  get selected items
     */
    dataSelector.prototype.getValue = function() {
        return $el.value;
    }

    /**
     *  add selected item manually, no reduplicate item
     *  @param arr {Array} array of data
     */
    dataSelector.prototype.appendValue = function(arr) {
        if(arr instanceof Array) {
            arr.forEach(function(item, index) {
                if(!_isExisted($el.value.split(';'), item[_this.savedKey])) {
                    $el.value += item[_this.savedKey] + ';';
                    _selectItem = item;
                    _renderSelector();
                }
            });
        }
    }

    /**
     *  remove all selected items
     */
    dataSelector.prototype.clear = function() {
        $el.value = '';
        Array.prototype.forEach.call($wrapper.querySelectorAll('span'), function(item, index) {
            $wrapper.removeChild(item);
        });
    }

    /**
     *  destroy the plugin
     */
    dataSelector.prototype.destroy = function() {
        $el.className = $el.className.replace('hidden', '');
        $root.parentNode.replaceChild($el, $root);
    }

    /**
     *  reset the plugin
     */
    dataSelector.prototype.reset = function() {
        new dataSelector(_options);
    }

    return dataSelector;
}));
