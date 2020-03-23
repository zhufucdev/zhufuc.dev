window.Repeater = new function () {
    function getK(x) {
        return (Math.cos(x * Math.PI) + 1) / 2
    }

    function flyIn(ele) {
        let count = 0, times = 700 / 10;
        ele.style.display = 'block';
        ele.style.transform = 'translateY(240px)';
        let i = setInterval(() => {
            ele.style.transform = "translateY(" + 120 * (Math.cos(count / times * Math.PI) + 1) + "px)";
            if (count >= times) clearInterval(i);
            count++;
        }, 10);
    }

    function hideShowBase(ele, get, show) {
        let count = 0, times = 300 / 10, originalHeight = (ele.originalHeight ?? ele.clientHeight), originalWidth = (ele.originalWidth ?? ele.clientWidth);
        ele.originalHeight = originalHeight; ele.originalWidth = originalWidth;
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

    function Repeater(ele) {
        this.contentElement = ele;
        this.model = "<span>%title</span>";

        let updating = false;
        this.beginUpdate = () => updating = true;
        this.endUpdate = () => {
            for (let i = 0; i < this.elements.length; i++) {
                let element = this.elements[i];
                let timeout = i * 100;
                if (timeout === 0) flyIn(element);
                else setTimeout(() => flyIn(element), timeout)
            }
            updating = false;
        };
        this.elements = [];
        /**
         * Pushes a new item according to the model.
         * @param arguments {Object}
         */
        this.push = (arguments) => {
            let newEle = this.model;
            for (let arg in arguments) {
                if (arguments.hasOwnProperty(arg)) {
                    newEle = newEle.replace(new RegExp("%" + arg, "g"), arguments[arg])
                }
            }
            let div = document.createElement('div');
            div.innerHTML = newEle.trim();
            newEle = div.firstElementChild;
            ele.insertAdjacentElement('beforeend', newEle);
            this.elements.push(newEle);

            if (!updating) flyIn(newEle);
            else newEle.style.display = 'none';
        }
    }

    let elementCount = 0;

    this.init = ele => {
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
                    wrapper.elements.forEach(ele => {
                        if (!ele.innerText.includes(value)) {
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
    this.autoInit = () => {
        let result = [];
        document.querySelectorAll('.repeater').forEach(v => {
            result.push(this.init(v));
        });
        return result;
    }
};