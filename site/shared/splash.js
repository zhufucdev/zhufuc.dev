class Splash extends HTMLElement {
    constructor() {
        super();
        let shadow = this.attachShadow({mode: 'open'});
        let block = document.createElement('div');
        block.setAttribute('class', 'block');
        let wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'wrapper');
        /* Icons & Animations */
        let icons = document.createElement('div');
        icons.setAttribute('class', 'icons');
        let face = document.createElement('img');
        face.setAttribute('src', '/shared/face.png');
        face.setAttribute('class', 'face');
        let particles = document.createElement('img');
        particles.setAttribute("src", 'shared/particles.svg');
        particles.setAttribute("class", "particles");
        /* Subtitles & Animations */
        let subtitles = document.createElement('div');
        subtitles.setAttribute('class', 'subtitles');
        let welcome = document.createElement('span');
        welcome.setAttribute('class', 'welcome-title');
        welcome.textContent = '欢迎来到zhufucdev的个人网站';
        let inform = document.createElement('p');
        let i = document.createElement('i');
        i.textContent = '网站使用Cookies以提供基础功能与改善用户体验';
        inform.appendChild(i);
        /* Styles */
        let style = document.createElement('style');
        style.textContent = `
        .block {
            height: 100%;
            width: 100%;
            background: linear-gradient(rgba(134, 197, 249, 0.6), rgba(33, 150, 243, 0.7));
            z-index: 1000;
            position: fixed;
        }
        .wrapper {
            position: absolute;
            z-index: 1001;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
        }
        .icons {
            animation-name: icons-finish;
            animation-delay: 2.2s;
            animation-duration: 0.5s;
            animation-fill-mode: forwards;
        }
        .subtitles {
            position: relative;
            left: 50%;
            top: 50%;
            transform: translate(-50%, 0%);
            opacity: 0;
            animation-name: fly-in;
            animation-delay: 2.2s;
            animation-duration: 0.5s;
            animation-fill-mode: forwards;
        }
        .welcome-title {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            font-size: 30px;
        }
        .face {
            width: 0;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%,-50%);
            border-radius: 50%;
            animation-duration: 1s;
            animation-name: scale;
            animation-delay: 1s;
            animation-fill-mode: forwards;
        }
        .particles {
            width: 600px;
            height: 600px;
            opacity: 0;
            transform: rotate(360deg);
            animation-delay: 1.1s;
            animation-duration: 1s;
            animation-name: rotate-in;
            animation-fill-mode: forwards;
        }
        @keyframes scale {
            from {
                width: 0;
            }
            to {
                width: 200px;
            }
        }
        @keyframes rotate-in {
            from {
                opacity: 0;
                transform: rotate(360deg) scale(0, 0);
            }
            to {
                opacity: 1;
                transform: rotate(0deg) scale(1,1);
            }
        }
        @keyframes icons-finish {
            from {
                transform: scale(1,1) translateY(0);
            }
            to {
                transform: scale(0.8,0.8) translateY(-80px);
            }
        }
        @keyframes fly-in {
            from {
                transform: translate(-34%, 150%);
                opacity: 0;
            }
            to {
                transform: translate(-34%, -150%);
                opacity: 1;
            }
        }
        `;

        block.onclick = () => {
            let opacity = 1;
            block.onclick = undefined;
            let i = setInterval(() => {
                opacity -= 0.05;
                block.style.opacity = wrapper.style.opacity = opacity;
                if (opacity <= 0) {
                    clearInterval(i);
                    block.style.display = wrapper.style.display = 'none';
                }
            }, 20)
        };

        /* Layout */
        icons.appendChild(face);
        icons.appendChild(particles);
        subtitles.appendChild(welcome);
        subtitles.appendChild(inform);
        wrapper.appendChild(icons);
        wrapper.appendChild(subtitles);
        shadow.appendChild(style);
        shadow.appendChild(block);
        shadow.appendChild(wrapper);
    }
}

customElements.define("splash-screen", Splash);