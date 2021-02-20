const words = require('../admin/words');

//insert not relevant tags
function netatmoTags(obj_name) {
	switch(obj_name) {
		case 'body':
			return false;
		case '':
			return false;
		default:
			return true;
	}
}

//insert not relevant tags for details
function netatmoTagsDetail(obj_name) {
	switch(obj_name) {
		case 'body':
			return false;
		default:
			return true;
	}
}

//Delete leading dots
function getPrefixPath(path) {
	return path.replace(/^\.+/, '');
}

// add and get sortet array
function getSortedArray(name, id, list, listArray) {
	list = {};
	listArray[listArray.length + 1] = new Array(name, id);
	listArray.sort();
	listArray.forEach(([value, key]) => {
		list[key] = value;
		//this.log.debug('ArraySort: ' + key + ' - ' + value);
	});
	return {
		list: list,
		listArray: listArray,
	};
}

//translate
function tl(word, systemLang) {
	if (words[word]) {
		return words[word][systemLang] || words[word].en;
	} else {
		console.warn('Please translate in words.js: ' + word);
		return word;
	}
}

module.exports = {
	netatmoTags,
	netatmoTagsDetail,
	getPrefixPath,
	getSortedArray,
	tl
};
