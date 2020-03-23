// Utilities library by zhufucdev
// Licenced under the GPL version 3
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

/**
 * @param title {string} The title to fade to.
 */
function animateTitle(title) {
    let ele = document.querySelector('.brand-logo');
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
}

function fadeOut(ele, onEnd) {
    let animator = new ObjectAnimator(1, 0);
    animator.addUpdateListener(v => ele.style.opacity = v.toString());
    animator.doOnEnd(onEnd);
    animator.start();
}

function fadeIn(ele, onEnd) {
    let animator = new ObjectAnimator(0, 1);
    animator.addUpdateListener(v => ele.style.opacity = v.toString());
    animator.doOnEnd(onEnd);
    animator.start();
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
            let times = this.duration / 20;
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
            }, 20)
        }
    }
}