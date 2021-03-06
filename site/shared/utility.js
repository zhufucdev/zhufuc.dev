// Utilities library by zhufucdev
// Licenced under the GPL version 3

let extendToolbarPages = ['blog', 'about'];
/**
 * Checks the compatibility of user's browser.
 * @return {boolean} true if the browser is compatible with the site.
 */
function checkBrowser() {
    try {
        class Test {
            constructor() {
                this.result = typeof customElements.define === 'function'
            }
        }

        return new Test().result
    } catch (e) {
        return false
    }
}

class ObjectAnimator {
    /**
     * Changes a number in a specific range and direction, within a specific time.
     * @param from {number}
     * @param to {number}
     */
    constructor(from, to) {
        let listeners = [], started = false;
        /**
         * Called every time the number changes.
         * @param l {function(number)}
         */
        this.addUpdateListener = l => {
            listeners.push(l)
        };
        this.clearUpdateListeners = () => {
            listeners = [];
        };
        /**
         * Called when the change has finished.
         * @param l {function()}
         */
        this.doOnEnd = l => {
            this.onEndListener = l;
        };
        this.to = to;
        this.from = from;
        this.duration = 400;
        /**
         * Starts the change.
         */
        this.start = () => {
            if (started) throw 'Animator already started.';
            let delta = this.to - this.from;
            let times = this.duration / 10;
            let count = 0;
            let i = setInterval(() => {
                function notify(value) {
                    listeners.forEach(v => {
                        if (typeof v === "function") v(value)
                    });
                }

                notify(this.from + delta * (Math.sin((2 * count / times - 1) * Math.PI / 2) + 1) / 2);
                count++;
                if (count >= times) {
                    notify(to);
                    clearInterval(i);
                    if (typeof this.onEndListener === "function") this.onEndListener();
                }
            }, 10)
        }
    }
}

/**
 * @param title {string} The title to fade to.
 */
function animateTitle(title) {
    let ele = document.querySelector('.brand-logo');
    ele.style.opacity = '0';
    let animator3 = new ObjectAnimator(0, 1);
    animator3.addUpdateListener(v => ele.style.opacity = v.toString());
    animator3.start();
    setTimeout(() => {
        let animator1 = new ObjectAnimator(1, 0), animator2 = new ObjectAnimator(0, 1);
        let l = v => ele.style.opacity = v.toString();
        animator1.addUpdateListener(l);
        animator2.addUpdateListener(l);
        animator1.duration = animator2.duration = 200;
        animator1.doOnEnd(() => {
            ele.textContent = title;
            animator2.start()
        });
        animator1.start()
    }, 2000);
}

function fadeOut(ele, onEnd) {
    let animator = new ObjectAnimator(1, 0);
    if (ele.style.display === 'none') ele.style.display = null;
    animator.addUpdateListener(v => ele.style.opacity = v.toString());
    animator.doOnEnd(onEnd);
    animator.start();
}

function fadeIn(ele, onEnd) {
    let animator = new ObjectAnimator(0, 1);
    if (ele.style.display === 'none') ele.style.display = null;
    animator.addUpdateListener(v => ele.style.opacity = v.toString());
    animator.doOnEnd(onEnd);
    animator.start();
}

function fadeSwitch(ele, newHTML) {
    let animator = new ObjectAnimator(1, 0);
    animator.addUpdateListener(v => ele.style.opacity = v.toString());
    animator.doOnEnd(() => {
        ele.innerHTML = newHTML;
        let animator2 = new ObjectAnimator(0, 1);
        animator2.addUpdateListener(v => ele.style.opacity = v.toString());
        animator2.duration = 200;
        animator2.start();
    });
    animator.duration = 200;
    animator.start()
}

function isWideScreen() {
    return window.innerWidth >= 993
}

function checkWelcomeSplash() {
    let splashPreference = Settings.createPreference('splash', false);
    if (!splashPreference.value) {
        document.body.insertAdjacentElement('afterbegin', document.createElement('splash-screen'));
        splashPreference.value = true;
    }
}

function formatDate(date) {
    return  date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + (date.getDay() + 1) + " " +
    date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}
// The following three functions implements shared element translation.
function moveClone(ele, from, to, prepare, end, keep) {
    function update(v) {
        ele.style.left = (to.x - from.x) * v + from.x + 'px';
        ele.style.top = (to.y - from.y) * v + from.y + 'px';
        ele.style.width = (to.width - from.width) * v + from.width + 'px';
        ele.style.height = (to.height - from.height) * v + from.height + 'px';
    }

    ele = clone(ele, true);
    ele.style.position = 'fixed';
    update(0);
    ele.style.display = ele.style.opacity = null;

    if (typeof prepare === "function") prepare();

    let animator = new ObjectAnimator(0, 1);
    animator.addUpdateListener(update);
    animator.doOnEnd(() => {
        if (typeof end === "function") end();
        if (keep !== true) ele.remove();
    });
    animator.start();
}

function clone(ele, hide) {
    let result = ele.cloneNode(true);
    if (hide === true) result.style.display = 'none';
    document.body.insertAdjacentElement('beforeend', result);
    result.style.zIndex = '1002';
    return result;
}

function measure(ele, considerScroll) {
    let x = 0, y = 0, test = ele;
    while (test !== document.body && test != null) {
        y += test.offsetTop;
        x += test.offsetLeft;
        test = test.offsetParent;
    }
    let html = document.querySelector('html');
    if (considerScroll !== false) {
        y -= html.scrollTop;
        x -= html.scrollLeft;
    }
    return {
        x: x,
        y: y,
        height: ele.clientHeight,
        width: ele.clientWidth
    }
}