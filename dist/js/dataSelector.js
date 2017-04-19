/*
 ** Created By Henry Yang @ 2017/04/13
 ** MIT License
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : (global.dataSelector = factory());
})(this, (function() {
    'use strict';

    var _this,                  // 缓存类的this指向
        _options,               // 缓存初始化插件的配置
        _inputValue = '',       // 临时保存用户的输入
        _tempFilterKey = [],    // 筛选数据时用的key
        _resultList = [],       // 根据输入筛选到的数据数组
        _list = null,           // 结果列表中的ul
        _selectItem = null;     // 选中的元素

    var $root, $el, $wrapper, $input, $list;    // 保存全局的DOM节点

    // 事件绑定
    var EventUtil = {
        typeHandler: function(_type) {
            return _type.split(' ');
        },
        addHandler: function(element, type, children, handler) {
            if(handler == null) {
                //element, type, handler
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
     *  编译模板
     *  @param html {String} 字符串DOM结构
     *  @return DOM {DOMNode} DOM结构
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
     *  创建节点
     *  @param type {String} 需要创建的节点的类型
     */
    var _createEl = function(type) {
        return document.createElement(type);
    }

    /**
     *  异常处理
     *  @param msg {String} 异常信息
     */
    var _error = function(msg) {
        console.error(msg);
    }

    /**
     *  判断元素是否存在于指定数组中
     *  @param arr {Array} 待筛选的数组
     *  @param item {String} 指定的元素
     */
    var _isExisted = function(arr, item) {
        if(arr instanceof Array && ~arr.toString().indexOf(item)) {
            return true;
        }
        return false;
    }

    /**
     *  获取某个DOM节点，并返回其index值和该DOM本身
     *  @param parent {DOM} 父节点
     *  @param item {DOM} 子节点
     *  @param fn {Function} 找到index后执行的函数
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
     *  构造函数
     */
    function dataSelector(options) {
        var opts = options || {};

        _this = this;
        this.el = opts.el || document.querySelector('[data-id="data-selector"]');   // 被隐藏的input框
        this.template = opts.template || '';   // *展示结果的模版，必填
        this.data = opts.data || [];           // *数据，必填
        this.maxData = opts.maxData || -1;     // 是否限制可选个数，-1为不限制
        this.maxResult = opts.maxResult || 5;  // 结果列表显示个数
        this.resultScroll = opts.resultScroll == undefined ? false : options.resultScroll;                 // 结果列表是否可以滚动
        this.style = opts.style || 'input';    // 当前仅支持输入框形式，稍后加入弹窗和列表形式
        this.filterKey = opts.filterKey || [];  // 筛选数据的key
        this.savedKey = opts.savedKey ? opts.savedKey.split(' ')[0] : '';   // 保存的key值
        this.showKey = opts.showKey || this.savedKey;   // 显示结果时使用的key值
        this.onSelect = opts.onSelect || function() {};     // 点击选择时的回调函数

        if(!_options) {     // 缓存初始化配置
            _options = opts;
        }

        this.$root = null;          // 插件根节点
        this.$wrapper = null;       // 插件模拟的输入&选择结果框
        this.$input = null;         // 用户的输入框
        this.$list = null;          // 下拉列表

        _init();
    }

    /**
     *  初始化插件
     */
    var _init = function() {
        _initStyle();
        _initEvents();
        _extractTmp();
    }

    /**
     *  初始化样式
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
     *  初始化事件
     */
    var _initEvents = function() {
        var __inputOnBlur = function() {    // 输入框失去焦点函数
            EventUtil.addHandler($input, 'blur', function() {
                this.value = '';
                this.style.width = '10px';

                if(this.nextSibling) {
                    this.style.display = 'none';
                }
            });
        };

        __inputOnBlur();

        EventUtil.addHandler($wrapper, 'click', function(e) {   // 模拟输入框绑定点击事件
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
            __inputOnBlur();        //重新绑定失去焦点事件
        });

        // 用户输入时的操作
        EventUtil.addHandler($wrapper, 'input propertychange paste', function() {
            var filterData = [],
                length = 0;

            if(_this.maxData == -1 || (_this.maxData && $el.value.split(';').length - 1 < _this.maxData)) {   // 已选项的个数小于可选项
                _inputValue = $input.value;
                length = _inputValue.length;

                if(length) {
                    $input.style.width = length == 0 ? '10px' : Math.max(length * 6 + 10, 10) + 'px';   // 实时修改输入框的宽度

                    _getFilterData(_inputValue);    // 筛选数据并渲染结果列表

                    if(!_resultList.length) {
                        _resultList = '';
                    }
                    _renderResultList(_resultList);
                }
                else {      // 没有输入时直接隐藏结果列表
                    $list.style.display = 'none';
                }
            }
            else{
                $input.value = '';
            }
        });

        // 绑定列表选择点击事件
        EventUtil.addHandler($list, 'click', function(e) {
            _selectInList(e.target);
        });

        // 键盘操作
        EventUtil.addHandler($wrapper, 'keydown', function(e) {
            var code = e.keyCode,
                active = 'data-selector-active';

            switch(code) {
                case 8:     // 删除
                case 46:
                    if(!$input.value.length) {    // 输入框内容为空时才允许删除元素
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
                case 13:    // 回车
                    if($input.value.length && _resultList.length) {
                        _selectInList($root.querySelector('.' + active));
                    }
                    break;
                case 38:    // 上
                case 40:    // 下
                    var curItem = $root.querySelector('.' + active),
                        curParent = curItem.parentNode,
                        children = curParent.childNodes;

                    var _index, len, sibling;

                    if(code == 38) {
                        _index = 0;
                        len = children.length - 1;
                        sibling = 'previousSibling';
                    }
                    else if(code == 40) {
                        _index = children.length - 1;
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
                    });
                    break;
            }
        });
    }

    /**
     *  选择结果列表中的项
     */
    var _selectInList = function(target) {
        var li = _list.childNodes,
            parent = null,
            attr = target.getAttribute('data-selector');

        if(attr !== 'empty') {
            while(attr !== 'li') {  // 将点击目标转移到最外层的li标签
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
            $el.value += _selectItem[_this.savedKey] + ';';    // 选择后添加到隐藏的input框中
        });

        _renderSelector();
    }

    /**
     *  提取template中的信息
     */
    var _extractTmp = function() {
        var tpl = _this.template,
            filterKey = _this.filterKey;

        if(filterKey.length) {
            _tempFilterKey = _this.filterKey;
            return;
        }

        tpl.match(/%:(\w*)%/g).forEach(function(item, index) {  //匹配template中所有的key
            var key = item.replace(/%:(\w*)%/g, function(origin, matched) { //去掉匹配到的key中的标识
                return matched;
            }),
                count = 0;

            if(!_isExisted(_tempFilterKey, key)) {  //过滤template中重复的key
                _tempFilterKey.push(key);
            }
        });

        !_this.savedKey ? _this.savedKey = _tempFilterKey[0] : '';   //若savedkey不存在，就取template中第一个key值为savedkey
    }

    /**
     *  筛选数据
     *  @param value {String} 筛选数据的输入
     */
    var _getFilterData = function(value) {
        var data = _this.data;

        if(!value) {    //若输入为空，置空结果数组并返回
            _resultList = [];
            return false;
        }

        _resultList = [];   //重置结果列表

        for(var i in data) {    //遍历所有数据项
            var curItem = data[i];

            for(var j in _tempFilterKey) {  //每个数据项中，根据筛选key值判断该项是否符合要求
                var curKey = _tempFilterKey[j],
                    cur = curItem[curKey];

                if(_resultList.length < _this.maxResult) {  //限制结果列表的显示项
                    if(cur.indexOf(value) == 0 && !_isExisted($el.value.split(';'), curItem[_this.savedKey])) {    //过滤掉已选的项
                        _resultList.push(curItem);
                    }
                }
            }
        }
    }

    /**
     *  拼接并渲染结果列表
     *  @param arr {Array} 待拼接的结果列表
     */
    var _renderResultList = function(arr) {
        var fragment = null,
            template = '<ul>';

        if(arr instanceof Array) {
            arr.forEach(function(item, index) {
                var _template = _this.template.replace(/%:(\w*)%/g, function(origin, matched) {
                    return item[matched];
                });

                _template = _template.replace(/\[\[(\S*)\]\]/g, function(origin, matched) { // 渲染标记
                    var val = $input.value;

                    return '<span class="data-selector-highlight">' + val + '</span>' + matched.replace(val, '');
                });

                template += '<li data-selector="li" class="data-selector-list-item ' + (index == 0 ? 'data-selector-active' : '') + '">'+
                                _template+
                            '</li>';
            });
        }
        else {
            template += '<li class="data-selector-list-item" data-selector="empty" style="cursor: default">暂无数据</li>';
        }

        template += '</ul>';
        $list.innerHTML = '';
        fragment = _compileStringToDOM(template, $list);
        $list.appendChild(fragment);
        $list.style.cssText += 'display: block; left: ' + $input.offsetLeft + 'px; top: ' + ($input.offsetTop + 32) + 'px;';
        _list = $list.children[0];      //将新append到页面上的ul缓存下来
    }

    /**
     *  拼接并渲染选择结果
     */
    var _renderSelector = function() {
        var key = _this.showKey || _tempFilterKey[0],
            html = '<span class="data-selector-item">' + _selectItem[key] + '</span>',
            fragment = _compileStringToDOM(html);

        $wrapper.insertBefore(fragment, $input);
        //重置输入框和下拉列表
        $input.value = '';
        $input.style.width = '10px';
        $list.style.display = 'none';
    }

    /**
     *  删除已选中的元素
     *  @param index {Number} 待删除元素的index值
     *  @param direction {String} 使用键盘删除时，是删除光标左边的元素还是右边的元素
     */
    var _deleteItem = function(index, direction) {
        var valueArr = $el.value.split(';');

        delete $wrapper.removeChild($wrapper.childNodes[index]);    // 移除DOM
        valueArr.splice(direction == 'left' ? index : (index - 1), 1);      //删除输入框中的值
        $el.value = valueArr.join(';');
    }

    // 插件对外公共接口
    /**
     *  设置需要筛选的数据
     *  @param data {Array} 设置的数据
     */
    dataSelector.prototype.setValue = function(arr) {
        if(arr instanceof Array) {
            $el.value = '';
            Array.prototype.forEach.call($wrapper.querySelectorAll('span'), function(item, index) {
                $wrapper.removeChild(item);
            });

            this.appendValue(arr)
        }
        else{
            _error('setData仅接受数组');
        }
    }

    /**
     *  获取被筛选的数据
     */
    dataSelector.prototype.getValue = function() {
        return $el.value;
    }

    /**
     *  增加被选中的数据
     *  @param arr {Array} 增加的数据
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
     *  清除所选数据
     */
    dataSelector.prototype.clear = function() {
        $el.value = '';
        Array.prototype.forEach.call($wrapper.querySelectorAll('span'), function(item, index) {
            $wrapper.removeChild(item);
        });
    }

    /**
     *  销毁插件
     */
    dataSelector.prototype.destroy = function() {
        $el.className = $el.className.replace('hidden', '');
        $root.parentNode.replaceChild($el, $root);
    }

    /**
     *  重置插件
     */
    dataSelector.prototype.reset = function() {
        new dataSelector(_options);
    }

    return dataSelector;
}));
