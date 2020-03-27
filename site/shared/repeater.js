let Repeat = {};
function getK(x) {
    return (Math.cos(x * Math.PI) + 1) / 2
}

function flyIn(ele) {
    if (ele.originalDisplay === undefined) ele.originalDisplay = ele.style.display;
    let count = 0, times = 700 / 10;
    ele.style.display = 'block';
    ele.style.transform = 'translateY(240px)';
    let i = setInterval(() => {
        ele.style.transform = "translateY(" + 120 * (Math.cos(count / times * Math.PI) + 1) + "px)";
        if (count >= times) {
            clearInterval(i);
            ele.style.display = ele.originalDisplay;
            ele.style.transform = null;
        }
        count++;
    }, 10);
}

function hideShowBase(ele, get, show) {
    let count = 0, times = 300 / 10, originalHeight, originalWidth;
    if (typeof ele.originalHeight === "number") {
        originalHeight = ele.originalHeight;
    } else {
        originalHeight = ele.clientHeight;
    }
    if (typeof ele.originalWidth === "number") {
        originalWidth = ele.originalWidth;
    } else {
        originalWidth = ele.clientWidth;
    }
    ele.originalHeight = originalHeight;
    ele.originalWidth = originalWidth;
    let i;

    function opacity(done) {
        ele.style.opacity = get(0);
        ele.style.display = 'block';
        i = setInterval(() => {
            ele.style.opacity = get(count / times).toString();
            count++;
            if (count >= times) {
                clearInterval(i);
                if (show) {
                    ele.style.display = 'block';
                    ele.style.opacity = null;
                }
                count = 0;
                if (typeof done === "function")
                    done()
            }
        }, 10);
    }

    function size(done) {
        i = setInterval(() => {
            if (show) ele.style.display = 'block';
            let k = get(count / times);
            ele.style.height = originalHeight * k + "px";
            ele.style.width = originalWidth * k + "px";
            if (count >= times) {
                clearInterval(i);
                ele.style.height = ele.style.width = null;
                if (!show) ele.style.display = 'none';
                count = 0;
                if (typeof done === "function")
                    done()
            }
            count++;
        }, 10);
    }

    if (show) {
        size(opacity)
    } else {
        opacity(size)
    }
}

function hide(ele) {
    hideShowBase(ele, getK, false);
}

function show(ele) {
    hideShowBase(ele, x => getK(1 - x), true);
}
class Repeater {
    constructor(ele) {
        this.contentElement = ele;
        this.model = "<span>%title</span>";

        let updating = false;
        this.clear = () => {
            for (let i in ele.children) {
                if (ele.children.hasOwnProperty(i))
                    ele.children[i].remove()
            }
            this.elements = [];
        };
        this.beginUpdate = () => updating = true;
        this.endUpdate = () => {
            for (let i = 0; i < this.elements.length; i++) {
                let element = this.elements[i];
                if (!element.doAnimate) {
                    element.style.display = element.originalDisplay;
                } else {
                    let timeout = i * 100;
                    if (timeout === 0) flyIn(element);
                    else setTimeout(() => flyIn(element), timeout)
                }
            }
            updating = false;
        };
        this.elements = [];
        this.categories = {};
        let addCategory = (name) => {
            if (!this.categories.hasOwnProperty(name)) {
                let categoryDiv = document.createElement('div');
                let span = document.createElement('p');
                span.setAttribute('class', 'red-text');
                span.textContent = name;
                categoryDiv.appendChild(span);
                ele.insertAdjacentElement('beforeend', categoryDiv);
                this.categories[name] = categoryDiv;
            }
            return this.categories[name];
        };
        this.indexInCategoryOf = (ele) => {
            let category = ele.category;
            if (typeof category === "string") {
                let search = this.categories[category].children;
                for (let i in search) {
                    if (search.hasOwnProperty(i) && ele === search[i]) {
                        return i - 1;
                    }
                }
                return -1
            } else {
                throw 'Element does not have a category.'
            }
        };
        /**
         * Pushes a new item according to the model.
         * @param args {Object}
         * @param category {string|undefined} Text to classify this element.
         * @param animate {boolean|undefined} Whether to animate this element.
         * @return Element
         */
        this.push = (args, category, animate) => {
            let newEle = this.model;
            for (let arg in args) {
                if (args.hasOwnProperty(arg)) {
                    newEle = newEle.replace(new RegExp("%" + arg, "g"), args[arg])
                }
            }
            let virtual = document.createElement('div');
            virtual.innerHTML = newEle.trim();
            newEle = virtual.firstElementChild;
            if (category) {
                newEle.category = category;
                let categoryEle = addCategory(category);
                categoryEle.appendChild(newEle);
            } else {
                ele.insertAdjacentElement('beforeend', newEle);
            }
            this.elements.push(newEle);

            if (!updating) {
                if (animate !== false)
                    flyIn(newEle);
            } else {
                newEle.originalDisplay = newEle.style.display;
                newEle.style.display = 'none';
                newEle.doAnimate = animate !== false;
            }
            return newEle;
        };

        this.update = (ele, args) => {
            let newText = this.model;
            for (let arg in args) {
                if (args.hasOwnProperty(arg)) {
                    newText = newText.replace(new RegExp("%" + arg, "g"), args[arg])
                }
            }
            ele.innerHTML = newText;
        };

        this.remove = (ele) => {
            hide(ele);
            ele.remove();
        };
    }
}

let elementCount = 0;
Repeat.init = ele => {
    // Search bar
    let textfield = document.createElement('div');
    textfield.setAttribute("class", "input-field");
    textfield.style.width = "100%";
    let icon = document.createElement('i');
    icon.setAttribute("class", "material-icons prefix");
    icon.textContent = "search";
    textfield.appendChild(icon);
    let input = document.createElement('input'), id = "search-input" + (elementCount > 0 ? "-" + elementCount : "");
    input.setAttribute("class", "validate");
    input.setAttribute("id", id);
    input.setAttribute("type", "text");
    textfield.appendChild(input);
    let helper = document.createElement('label');
    helper.setAttribute("for", id);
    helper.textContent = "搜索";
    helper.style.width = "120px";
    textfield.appendChild(helper);
    ele.insertAdjacentElement('afterbegin', textfield);
    // Content
    let content = document.createElement('div');
    ele.insertAdjacentElement('beforeend', content);

    elementCount++;
    let wrapper = new Repeater(content);

    let lastChange;
    input.addEventListener('input', () => {
        let value = input.value;
        console.log('input: ' + value);
        if (value) {
            lastChange = new Date().getMilliseconds();
            setTimeout(() => {
                if ((new Date()).getMilliseconds() - lastChange < 290) {
                    console.log('Giving up ' + value);
                    return;
                }
                value = value.toLowerCase();
                wrapper.elements.forEach(ele => {
                    if (!ele.innerText.toLowerCase().includes(value)) {
                        if (ele.style.display !== "none")
                            hide(ele);
                    } else if (ele.style.display === "none")
                        show(ele);
                });
            }, 300)
        } else {
            wrapper.elements.forEach(ele => {
                if (ele.style.display === "none")
                    show(ele);
            })
        }
    });
    return wrapper;
};
/**
 * Select each element whose class is repeater and initialize it as a Repeater.
 * @return {[Repeater]}
 */
Repeat.autoInit = () => {
    let result = [];
    document.querySelectorAll('.repeater').forEach(v => {
        result.push(Repeat.init(v));
    });
    return result;
};

window.Repeat = Repeat;
// AMD
if (typeof define === 'function' && define.amd) {
    define('Repeater', [], function () {
        return Repeat;
    });

    // Common JS
} else if (typeof exports !== 'undefined' && !exports.nodeType) {
    if (typeof module !== 'undefined' && !module.nodeType && module.exports) {
        exports = module.exports = Repeat;
    }
    exports.default = Repeat;
}