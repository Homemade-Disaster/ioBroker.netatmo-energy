const words = require('../admin/words');

//check if it is an array
function isArray(it) {
	if (typeof Array.isArray === 'function')
		return Array.isArray(it);

	return Object.prototype.toString.call(it) === '[object Array]';
}

//split id
function splitID(id) {
	const actState  = id.substring(id.lastIndexOf('.') + 1);
	const actPath   = id.substring(0,id.lastIndexOf('.'));
	const actParent = actPath.substring(0,actPath.lastIndexOf('.'));
	const actFolder = actPath.substring(actPath.lastIndexOf('.') + 1);

	return {path: actPath, parent: actParent, state:actState, folder: actFolder};
}

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
	isArray,
	splitID,
	netatmoTags,
	netatmoTagsDetail,
	getPrefixPath,
	getSortedArray,
	tl
};
