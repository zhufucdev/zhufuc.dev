window.Repeater = new function () {
    function flyIn(ele) {
        let count = 0, times = 700 / 10;
        ele.style.display = 'block';
        ele.style.transform = 'translateY(240px)';
        let i = setInterval(() => {
            ele.style.transform = "translateY(" + 120 * (Math.cos(count / times * Math.PI) + 1) + "px)";
            if (count >= times) clearInterval(i);
            count ++;
        }, 10);
    }

    function Repeater(ele) {
        this.contentElement = ele;
        this.model = "<span>$title</span>";

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
                    newEle = newEle.replace("$" + arg, arguments[arg])
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
        textfield.setAttribute("class", "input-field right");
        textfield.style.width = "38.2%";
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
        textfield.appendChild(helper);
        ele.insertAdjacentElement('afterbegin', textfield);
        // Content
        let content = document.createElement('div');
        content.style.position = "relative";
        content.style.top = "60px";
        ele.insertAdjacentElement('beforeend', content);

        elementCount++;
        return new Repeater(content);
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