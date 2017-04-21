# data-selector
Dropdown component of data selecting

## Usage

#### html

`<input type="text" data-id="data-selector">`

#### js

```
	var ds = new dataSelector({
		template: '<span>%:name%</span> - <span>[[%:gender%]]</span>',
		data: [
			{
				name: "Henry",
				age: 25
			},
			{
				name: "Chris",
				age: 25
			}
		]
	})
```

## Configuration

- el: the element of DOM node to initialize the plugin
- template: used to display result list. `%:key%` can be used to be placeholder, it will be replaced by the value in `data`. `[[placeholder]]` can also be used to identify the highlight value. e.g. `template: '[[%:name%]]' - %:age%`. This option is required.
- data: all data to be filtered. This option is required.
- maxData: limit the number of selected item, `-1` is default and means no limitation.
- maxResult: number of items in result list, default value is `5`.
- resultScroll: the list can be scrolled or not, default value is `false`.
- style: `input` style for now, `popup` and `list` style will be added later, default value is `input`.
- filterKey: key for filter
- savedKey: key for saving selected item. Only one key can be supported. If an array is setting, it will only use the first value as savedKey.
- showKey: key for display selected item
- onSelect: callback function when click item in result list

## Useful Methods
```
	var ds = new dataSelector();
	ds.setValue(arr)
	ds.getValue()
	ds.appendValue(arr)
	ds.clear()
	ds.destroy()
	ds.reset()
```