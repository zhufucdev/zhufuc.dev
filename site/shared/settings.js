var docCookies = {
    getItem: function (sKey) {
        return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[-.+*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    },
    setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
        if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
            return false;
        }
        var sExpires = "";
        if (vEnd) {
            switch (vEnd.constructor) {
                case Number:
                    sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
                    break;
                case String:
                    sExpires = "; expires=" + vEnd;
                    break;
                case Date:
                    sExpires = "; expires=" + vEnd.toUTCString();
                    break;
            }
        }
        document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
        return true;
    },
    removeItem: function (sKey, sPath, sDomain) {
        if (!sKey || !this.hasItem(sKey)) {
            return false;
        }
        document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
        return true;
    },
    hasItem: function (sKey) {
        return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[-.+*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
    },
    keys: /* optional method: you can safely remove it! */ function () {
        var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
        for (var nIdx = 0; nIdx < aKeys.length; nIdx++) {
            aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]);
        }
        return aKeys;
    }
};

var Settings = {};

(function () {
    function magicDate() {
        return new Date(new Date().getFullYear() + 10, 1);
    }

    class Preference {
        constructor(id) {
            let predict = docCookies.getItem(id);
            let index = predict.indexOf(':');
            if (index === -1) throw 'Not a preference: ' + id;
            let type = predict.substring(0, index);
            Object.defineProperties(this, {
                type: {
                    value: type,
                    writable: false
                },
                value: {
                    get() {
                        let v = docCookies.getItem(id).substr(index + 1);
                        if (type === 'checkbox') {
                            return v === 'true';
                        }
                        return v;
                    },
                    set(v) {
                        docCookies.setItem(id, type + ':' + v, magicDate())
                    }
                }
            })
        }
    }

    Settings.getPreference = (id) => new Preference(id);
    Settings.createPreference = (id, defaultValue) => {
        if (!docCookies.hasItem(id) || !docCookies.getItem(id).includes(':')) {
            docCookies.setItem(id, (typeof defaultValue === 'boolean' ? 'checkbox:' : 'text:') + defaultValue,
                magicDate(), '/')
        }
        return new Preference(id)
    };
    Settings.autoInit = () => {
        document.querySelectorAll('.control').forEach(ele => {
            let target = ele.getAttribute('data-target');
            let input = ele.querySelector('input');

            function generateOnchange(value) {
                return () => docCookies.setItem(target, input.type + ':' + value(), magicDate())
            }

            if (input.type === 'checkbox') {
                input.checked = Settings.createPreference(target, false).value;
                input.onchange = generateOnchange(() => input.checked)
            } else {
                input.value = Settings.createPreference(target, '').value;
                input.onchange = generateOnchange(() => input.value)
            }
        });
    };
    // The following string is used as id for pages
    // home, blog, about, settings
    Object.defineProperty(Settings, 'lastPage', {
        get() {
            return Settings.createPreference('lastPage', 'home').value
        },
        set(v) {
            Settings.createPreference('lastPage').value = v
        }
    })
})();


window.Settings = Settings;

